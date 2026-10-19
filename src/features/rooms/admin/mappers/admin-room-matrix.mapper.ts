import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import {
  matrixSeatTypes,
  type MatrixSeat,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'
import { isRoomSeatUuid } from './admin-seat-catalog.mapper'

export const ADMIN_ROOM_MATRIX_LIMITS = {
  dimension: 100,
  seats: 2500,
} as const

// UI model extended to preserve optional catalog-seat bindings.
// This is not a duplicate Backend DTO.
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

  if (
    !document ||
    !Array.isArray(document.rows) ||
    !validDimension(document.rows.length) ||
    !validDimension(document.columns)
  ) {
    throw new Error('Ma trận phải có từ 1 đến 100 hàng và cột.')
  }

  type MatrixInput = NonNullable<ReplaceRoomLayoutContentRequest['matrix']>

  const matrix: MatrixInput = {
    rowCount: document.rows.length,
    columnCount: document.columns,
    seats: [],
  }

  const seatIds = new Set<string>()

  for (let rowIndex = 0; rowIndex < document.rows.length; rowIndex++) {
    const row = document.rows[rowIndex]

    if (!Array.isArray(row) || row.length !== document.columns) {
      throw new Error('Tất cả hàng phải có cùng số cột.')
    }

    let expectedNumber = 1

    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const seat = row[columnIndex]

      if (seat === null) continue

      if (
        !seat ||
        !Number.isSafeInteger(seat.number) ||
        seat.number !== expectedNumber ||
        !validSeatType(seat.seatType)
      ) {
        throw new Error(`Ghế trong hàng ${rowIndex + 1} phải được đánh số liên tiếp từ 1.`)
      }

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

      matrix.seats.push({
        rowIndex,
        columnIndex,
        number: seat.number,
        seatType: seat.seatType,
        ...(seatId ? { seatId } : {}),
      })

      expectedNumber += 1

      if (matrix.seats.length > ADMIN_ROOM_MATRIX_LIMITS.seats) {
        throw new Error('Ma trận chỉ hỗ trợ tối đa 2.500 ghế.')
      }
    }
  }

  // Matrix requests must omit legacy seats and elements.
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

  // Existing geometry layouts remain distinguishable from matrix layouts.
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

    // Backend explicitly allows null here.
    // The current generated type incorrectly declares only string.
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

  // Validate numbering, rectangular shape and duplicate bindings.
  // Do not silently renumber invalid server data.
  toAdminRoomMatrixRequest(document, content.layout.version)

  return document
}
