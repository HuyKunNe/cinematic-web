import { RoomLayoutSeatPositionResponseSeatTypeSnapshot as SeatType } from '@/services/api/generated/inventory-service/model/roomLayoutSeatPositionResponseSeatTypeSnapshot'

export const MATRIX_LIMITS = {
  rows: 100,
  columns: 100,
  seats: 2500,
} as const

export interface MatrixSeat {
  key: string
  seatId?: string
  number: number
  seatType: SeatType
}

export interface RoomMatrix {
  columnCount: number
  rows: Array<Array<MatrixSeat | null>>
}

function requireInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Giá trị phải là số nguyên từ ${minimum} đến ${maximum}.`)
  }
}

function getRow(matrix: RoomMatrix, rowIndex: number) {
  requireInteger(rowIndex, 0, matrix.rows.length - 1)
  return matrix.rows[rowIndex]!
}

function renumber(row: Array<MatrixSeat | null>) {
  let number = 1

  for (const seat of row) {
    if (seat) seat.number = number++
  }
}

export function createRoomMatrix(rowCount = 6, columnCount = 6): RoomMatrix {
  requireInteger(rowCount, 1, MATRIX_LIMITS.rows)
  requireInteger(columnCount, 1, MATRIX_LIMITS.columns)

  return {
    columnCount,
    rows: Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => null)),
  }
}

export function matrixRowLabel(rowIndex: number): string {
  requireInteger(rowIndex, 0, MATRIX_LIMITS.rows - 1)

  let value = rowIndex + 1
  let label = ''

  while (value > 0) {
    value--
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }

  return label
}

export function addMatrixSeat(
  matrix: RoomMatrix,
  rowIndex: number,
  columnIndex: number,
  inputNumber: number,
) {
  const row = getRow(matrix, rowIndex)
  requireInteger(columnIndex, 0, matrix.columnCount - 1)
  requireInteger(inputNumber, 1, MATRIX_LIMITS.columns)

  if (row[columnIndex]) throw new Error('Ô này đã có ghế.')

  if (row.some((seat) => seat?.number === inputNumber)) {
    throw new Error('Số ghế đã được dùng trong hàng.')
  }

  const occupied = row.filter((seat) => seat !== null).length

  if (inputNumber !== occupied + 1) {
    throw new Error(`Nhập số ${occupied + 1} để thêm ghế.`)
  }

  const total = matrix.rows.reduce(
    (count, items) => count + items.filter((seat) => seat !== null).length,
    0,
  )

  if (total >= MATRIX_LIMITS.seats) {
    throw new Error('Đã đạt giới hạn số ghế của layout.')
  }

  row[columnIndex] = {
    key: crypto.randomUUID(),
    number: inputNumber,
    seatType: SeatType.STANDARD,
  }

  renumber(row)
}

export function clearMatrixSeat(matrix: RoomMatrix, rowIndex: number, columnIndex: number) {
  const row = getRow(matrix, rowIndex)
  requireInteger(columnIndex, 0, matrix.columnCount - 1)

  row[columnIndex] = null
  renumber(row)
}

export function changeMatrixSeatType(
  matrix: RoomMatrix,
  rowIndex: number,
  columnIndex: number,
  seatType: SeatType,
) {
  const row = getRow(matrix, rowIndex)
  requireInteger(columnIndex, 0, matrix.columnCount - 1)

  const seat = row[columnIndex]
  if (!seat) throw new Error('Ô trống chưa có ghế.')

  if (!Object.values(SeatType).includes(seatType)) {
    throw new Error('Loại ghế không hợp lệ.')
  }

  seat.seatType = seatType
}

export function insertMatrixRow(matrix: RoomMatrix, index: number) {
  requireInteger(index, 0, matrix.rows.length)

  if (matrix.rows.length >= MATRIX_LIMITS.rows) {
    throw new Error('Đã đạt giới hạn số hàng.')
  }

  matrix.rows.splice(
    index,
    0,
    Array.from({ length: matrix.columnCount }, () => null),
  )
}

export function deleteMatrixRow(matrix: RoomMatrix, index: number) {
  getRow(matrix, index)

  if (matrix.rows.length <= 1) {
    throw new Error('Ma trận phải có ít nhất một hàng.')
  }

  matrix.rows.splice(index, 1)
}

export function insertMatrixColumn(matrix: RoomMatrix, index: number) {
  requireInteger(index, 0, matrix.columnCount)

  if (matrix.columnCount >= MATRIX_LIMITS.columns) {
    throw new Error('Đã đạt giới hạn số cột.')
  }

  for (const row of matrix.rows) row.splice(index, 0, null)
  matrix.columnCount++
}

export function deleteMatrixColumn(matrix: RoomMatrix, index: number) {
  requireInteger(index, 0, matrix.columnCount - 1)

  if (matrix.columnCount <= 1) {
    throw new Error('Ma trận phải có ít nhất một cột.')
  }

  for (const row of matrix.rows) {
    row.splice(index, 1)
    renumber(row)
  }

  matrix.columnCount--
}

export function toSparseRoomMatrix(matrix: RoomMatrix) {
  return {
    rowCount: matrix.rows.length,
    columnCount: matrix.columnCount,
    seats: matrix.rows.flatMap((row, rowIndex) =>
      row.flatMap((seat, columnIndex) =>
        seat
          ? [
              {
                seatId: seat.seatId,
                rowIndex,
                columnIndex,
                number: seat.number,
                seatType: seat.seatType,
              },
            ]
          : [],
      ),
    ),
  }
}
