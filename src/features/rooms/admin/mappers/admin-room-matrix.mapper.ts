import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import {
  MATRIX_LIMITS,
  matrixSeatTypes,
  validateSeatMatrixDocument,
  type MatrixSeat,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'
import { isRoomSeatUuid } from './admin-seat-catalog.mapper'

export const ADMIN_ROOM_MATRIX_LIMITS = MATRIX_LIMITS

export type BoundMatrixSeat = MatrixSeat & {
  seatId?: string
}

export type AdminRoomMatrixDocument = Omit<SeatMatrixDocument, 'rows'> & {
  rows: (BoundMatrixSeat | null)[][]
}

function validDimension(value: number) {
  return Number.isSafeInteger(value) && value >= 1 && value <= ADMIN_ROOM_MATRIX_LIMITS.dimension
}

function validIndex(value: number, length: number) {
  return Number.isSafeInteger(value) && value >= 0 && value < length
}

function validSeatType(value: unknown) {
  return matrixSeatTypes.some((option) => option.value === value)
}

export function validateAdminRoomLayout(
  layout: RoomLayoutResponse,
  roomId: string,
  layoutId?: string,
) {
  if (
    !layout ||
    !isRoomSeatUuid(layout.id) ||
    layout.roomId !== roomId ||
    (layoutId !== undefined && layout.id !== layoutId) ||
    !Number.isSafeInteger(layout.layoutVersion) ||
    layout.layoutVersion < 1 ||
    !Number.isSafeInteger(layout.version) ||
    layout.version < 0 ||
    !['DRAFT', 'PUBLISHED'].includes(layout.status) ||
    !Number.isFinite(Date.parse(layout.createdAt)) ||
    !Number.isFinite(Date.parse(layout.updatedAt))
  ) {
    throw new Error('Thông tin phiên bản layout không hợp lệ.')
  }

  return layout
}

export function toAdminRoomMatrixRequest(
  document: AdminRoomMatrixDocument,
  expectedVersion: number,
): ReplaceRoomLayoutContentRequest {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error('Version dùng để lưu ma trận không hợp lệ.')
  }

  validateSeatMatrixDocument(document)

  type MatrixInput = NonNullable<ReplaceRoomLayoutContentRequest['matrix']>

  const matrix: MatrixInput = {
    rowCount: document.rows.length,
    columnCount: document.columns,
    seats: [],
  }

  const seatIds = new Set<string>()

  for (let rowIndex = 0; rowIndex < document.rows.length; rowIndex += 1) {
    const row = document.rows[rowIndex]!

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const seat = row[columnIndex]

      if (!seat) continue

      const seatId = seat.seatId

      if (seatId !== undefined) {
        if (!isRoomSeatUuid(seatId)) {
          throw new Error('Liên kết ghế catalog không hợp lệ.')
        }

        const normalizedId = seatId.toLowerCase()

        if (seatIds.has(normalizedId)) {
          throw new Error('Một ghế catalog đang được liên kết với nhiều ô.')
        }

        seatIds.add(normalizedId)
      }

      // Chỉ gửi ô bắt đầu của ghế.
      // COUPLE chiếm thêm ô bên phải, không tạo bản ghi ghế thứ hai.
      matrix.seats.push({
        rowIndex,
        columnIndex,
        number: seat.number,
        seatType: seat.seatType,
        ...(seatId ? { seatId } : {}),
      })
    }
  }

  return {
    expectedVersion,
    matrix,
  }
}

export function adminRoomMatrixKey(document: AdminRoomMatrixDocument) {
  return JSON.stringify(toAdminRoomMatrixRequest(document, 0).matrix)
}

export function readAdminRoomMatrix(
  content: RoomLayoutContentResponse,
  roomId: string,
  layoutId: string,
): AdminRoomMatrixDocument | null {
  if (!content || !Array.isArray(content.seats) || !Array.isArray(content.elements)) {
    throw new Error('Nội dung layout trả về không hợp lệ.')
  }

  validateAdminRoomLayout(content.layout, roomId, layoutId)

  const matrix = content.matrix

  if (matrix == null) return null

  if (
    !validDimension(matrix.rowCount) ||
    !validDimension(matrix.columnCount) ||
    !Array.isArray(matrix.seats) ||
    matrix.seats.length > ADMIN_ROOM_MATRIX_LIMITS.seats ||
    content.seats.length !== 0 ||
    content.elements.length !== 0
  ) {
    throw new Error('Dữ liệu ma trận trả về không hợp lệ.')
  }

  const document: AdminRoomMatrixDocument = {
    columns: matrix.columnCount,
    rows: Array.from({ length: matrix.rowCount }, () =>
      Array.from({ length: matrix.columnCount }, (): BoundMatrixSeat | null => null),
    ),
  }

  for (const seat of matrix.seats) {
    if (
      !seat ||
      !validIndex(seat.rowIndex, matrix.rowCount) ||
      !validIndex(seat.columnIndex, matrix.columnCount) ||
      !Number.isSafeInteger(seat.number) ||
      !validSeatType(seat.seatType)
    ) {
      throw new Error('Có ghế nằm ngoài ma trận hoặc có dữ liệu không hợp lệ.')
    }

    const row = document.rows[seat.rowIndex]!

    if (row[seat.columnIndex] !== null) {
      throw new Error('Response chứa nhiều ghế tại cùng một ô.')
    }

    // Backend cho phép seatId = null.
    const seatId: unknown = seat.seatId

    if (seatId !== null && !isRoomSeatUuid(seatId)) {
      throw new Error('Liên kết ghế trong response không hợp lệ.')
    }

    row[seat.columnIndex] = {
      number: seat.number,
      seatType: seat.seatType,
      ...(typeof seatId === 'string' ? { seatId } : {}),
    }
  }

  // Kiểm tra sau khi đã đặt toàn bộ ghế vào document:
  // một ghế khác không được nằm trong ô thứ hai của ghế đôi.
  toAdminRoomMatrixRequest(document, content.layout.version)

  return document
}
