import type {
  PublishedRoomSeatResponse,
  RoomLayoutResponse,
  RoomPublishedSeatMapResponse,
} from '@/services/api/generated/inventory-service/model'
import {
  MATRIX_LIMITS,
  matrixRowLabel,
  validateSeatMatrixDocument,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'
import { adminSeatCapacity, adminSeatTypeOptions } from '../schemas/admin-seat-type-options'
import { validateAdminRoomLayout } from './admin-room-matrix.mapper'
import { isRoomSeatUuid } from './admin-seat-catalog.mapper'

export type AdminPublishedSeat = PublishedRoomSeatResponse & {
  id: string
  roomId: string
}

type PublishedCell = {
  seat: AdminPublishedSeat | null
  column: number
  span: 1 | 2
}

export interface AdminPublishedSeatMatrix {
  layout: RoomLayoutResponse
  rows: {
    label: string
    cells: PublishedCell[]
  }[]
  seats: AdminPublishedSeat[]
  columnCount: number
  occupiedCount: number
  emptyCount: number
  inactiveCount: number
  capacity: number
  activeCapacity: number
}

function validDimension(value: number) {
  return Number.isSafeInteger(value) && value >= 1 && value <= MATRIX_LIMITS.dimension
}

function invalidMatrix(): never {
  throw new Error('Sơ đồ đã xuất bản có dữ liệu không hợp lệ. Hãy tải lại.')
}

export function mapAdminPublishedSeats(
  input: RoomPublishedSeatMapResponse,
  roomId: string,
): AdminPublishedSeatMatrix {
  if (!isRoomSeatUuid(roomId) || !input || typeof input !== 'object') {
    return invalidMatrix()
  }

  const layout = validateAdminRoomLayout(input.layout, roomId)

  if (layout.status !== 'PUBLISHED' || !Number.isFinite(Date.parse(layout.publishedAt ?? ''))) {
    return invalidMatrix()
  }

  const matrix = input.matrix

  if (
    !matrix ||
    !validDimension(matrix.rowCount) ||
    !validDimension(matrix.columnCount) ||
    !Array.isArray(matrix.seats) ||
    matrix.seats.length < 1 ||
    matrix.seats.length > MATRIX_LIMITS.seats
  ) {
    return invalidMatrix()
  }

  const document: SeatMatrixDocument = {
    columns: matrix.columnCount,
    rows: Array.from({ length: matrix.rowCount }, () =>
      Array.from({ length: matrix.columnCount }, () => null),
    ),
  }

  const ids = new Set<string>()
  const seats: AdminPublishedSeat[] = []

  for (const item of matrix.seats) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      !isRoomSeatUuid(item.seatId) ||
      !Number.isSafeInteger(item.rowIndex) ||
      item.rowIndex < 0 ||
      item.rowIndex >= matrix.rowCount ||
      !Number.isSafeInteger(item.columnIndex) ||
      item.columnIndex < 0 ||
      item.columnIndex >= matrix.columnCount ||
      !Number.isSafeInteger(item.number) ||
      item.number < 1 ||
      typeof item.active !== 'boolean' ||
      !adminSeatTypeOptions.some((option) => option.value === item.seatType)
    ) {
      return invalidMatrix()
    }

    const id = item.seatId.toLowerCase()
    const rowLabel = matrixRowLabel(item.rowIndex)
    const span = item.seatType === 'COUPLE' ? 2 : 1

    if (
      ids.has(id) ||
      item.rowLabel !== rowLabel ||
      item.seatNumber !== `${rowLabel}${item.number}` ||
      item.columnSpan !== span ||
      item.capacity !== adminSeatCapacity(item.seatType)
    ) {
      return invalidMatrix()
    }

    const row = document.rows[item.rowIndex]!

    if (row[item.columnIndex] !== null) {
      return invalidMatrix()
    }

    ids.add(id)

    row[item.columnIndex] = {
      seatId: id,
      number: item.number,
      seatType: item.seatType,
    }

    seats.push({
      ...item,
      id,
      roomId,
    })
  }

  // Kiểm tra đánh số liên tiếp, bounds và phần chiếm hai ô của COUPLE.
  validateSeatMatrixDocument(document)

  seats.sort(
    (left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex,
  )

  const positions = new Map(seats.map((seat) => [`${seat.rowIndex}:${seat.columnIndex}`, seat]))

  const rows: AdminPublishedSeatMatrix['rows'] = []

  for (let rowIndex = 0; rowIndex < matrix.rowCount; rowIndex += 1) {
    const cells: PublishedCell[] = []

    for (let column = 0; column < matrix.columnCount;) {
      const seat = positions.get(`${rowIndex}:${column}`) ?? null
      const span: 1 | 2 = seat?.seatType === 'COUPLE' ? 2 : 1

      cells.push({ seat, column, span })
      column += span
    }

    rows.push({
      label: matrixRowLabel(rowIndex),
      cells,
    })
  }

  const occupiedCount = seats.reduce((total, seat) => total + seat.columnSpan, 0)

  return {
    layout,
    rows,
    seats,
    columnCount: matrix.columnCount,
    occupiedCount,
    emptyCount: matrix.rowCount * matrix.columnCount - occupiedCount,
    inactiveCount: seats.filter((seat) => !seat.active).length,
    capacity: seats.reduce((total, seat) => total + seat.capacity, 0),
    activeCapacity: seats.reduce((total, seat) => total + (seat.active ? seat.capacity : 0), 0),
  }
}
