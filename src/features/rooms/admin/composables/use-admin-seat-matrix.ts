import { computed, ref } from 'vue'
import type { SeatResponseSeatType } from '@/services/api/generated/inventory-service/model/seatResponseSeatType'

export type MatrixSeat = {
  seatId?: string
  number: number
  seatType: SeatResponseSeatType
}

export type MatrixCell = MatrixSeat | null

export type SeatMatrixDocument = {
  columns: number
  rows: MatrixCell[][]
}

type MatrixSelection = {
  row: number
  column: number
}

type MatrixCheckpoint = {
  document: SeatMatrixDocument
  selection: MatrixSelection
}

type AddSeatResult = { ok: true; changed: boolean } | { ok: false; message: string }

export const MATRIX_LIMITS = {
  dimension: 100,
  seats: 2500,
} as const

export const matrixSeatTypes = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'VIP', label: 'VIP' },
  { value: 'COUPLE', label: 'Couple' },
  { value: 'ACCESSIBLE', label: 'Accessible' },
] as const satisfies readonly {
  value: SeatResponseSeatType
  label: string
}[]

const HISTORY_LIMIT = 50

export function matrixRowLabel(index: number) {
  let value = index + 1
  let result = ''

  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }

  return result
}

export function matrixSeatSpan(seat: MatrixSeat | null | undefined): 1 | 2 {
  return seat?.seatType === 'COUPLE' ? 2 : 1
}

export function matrixSeatOwnerColumn(row: readonly MatrixCell[], column: number) {
  if (column > 0 && row[column - 1]?.seatType === 'COUPLE') {
    return column - 1
  }

  return column
}

export function validateSeatMatrixDocument(input: SeatMatrixDocument) {
  if (
    !input ||
    !Number.isSafeInteger(input.columns) ||
    input.columns < 1 ||
    input.columns > MATRIX_LIMITS.dimension ||
    !Array.isArray(input.rows) ||
    input.rows.length < 1 ||
    input.rows.length > MATRIX_LIMITS.dimension
  ) {
    throw new Error('Ma trận phải có từ 1 đến 100 hàng và cột.')
  }

  let seatCount = 0

  for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex += 1) {
    const row = input.rows[rowIndex]

    if (!Array.isArray(row) || row.length !== input.columns) {
      throw new Error('Tất cả hàng phải có cùng số cột.')
    }

    let expectedNumber = 1

    for (let column = 0; column < row.length; column += 1) {
      const seat = row[column]

      if (seat === null) continue

      if (
        !seat ||
        !Number.isSafeInteger(seat.number) ||
        seat.number !== expectedNumber ||
        !matrixSeatTypes.some((option) => option.value === seat.seatType)
      ) {
        throw new Error(
          `Ghế hàng ${matrixRowLabel(rowIndex)} phải có loại hợp lệ và số liên tiếp từ 1.`,
        )
      }

      if (seat.seatType === 'COUPLE') {
        if (column + 1 >= input.columns) {
          throw new Error(`Ghế ${matrixRowLabel(rowIndex)}${seat.number} cần thêm một ô bên phải.`)
        }

        if (row[column + 1] !== null) {
          throw new Error(
            `Ghế đôi ${matrixRowLabel(rowIndex)}${seat.number} đang chồng lên ghế bên phải.`,
          )
        }

        column += 1
      }

      expectedNumber += 1
      seatCount += 1

      if (seatCount > MATRIX_LIMITS.seats) {
        throw new Error('Ma trận chỉ hỗ trợ tối đa 2.500 ghế.')
      }
    }
  }
}

function emptyRow(columns: number): MatrixCell[] {
  return Array.from({ length: columns }, () => null)
}

function emptyDocument(): SeatMatrixDocument {
  return {
    columns: 6,
    rows: Array.from({ length: 6 }, () => emptyRow(6)),
  }
}

function copyDocument(input: SeatMatrixDocument): SeatMatrixDocument {
  return {
    columns: input.columns,
    rows: input.rows.map((row) => row.map((seat) => (seat ? { ...seat } : null))),
  }
}

function renumber(row: MatrixCell[]) {
  let number = 0

  for (const seat of row) {
    if (seat) seat.number = ++number
  }
}

export function useAdminSeatMatrix(initialDocument?: SeatMatrixDocument) {
  const initial = initialDocument ?? emptyDocument()
  validateSeatMatrixDocument(initial)

  const document = ref<SeatMatrixDocument>(copyDocument(initial))
  const selection = ref<MatrixSelection>({ row: 0, column: 0 })
  const undoStack = ref<MatrixCheckpoint[]>([])
  const redoStack = ref<MatrixCheckpoint[]>([])
  const operationError = ref('')

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  const selectedSeat = computed(
    () => document.value.rows[selection.value.row]?.[selection.value.column] ?? null,
  )

  const selectedSpan = computed(() => matrixSeatSpan(selectedSeat.value))

  const statistics = computed(() => {
    const counts = {
      rows: document.value.rows.length,
      columns: document.value.columns,
      seats: 0,
      occupied: 0,
      empty: 0,
      STANDARD: 0,
      VIP: 0,
      COUPLE: 0,
      ACCESSIBLE: 0,
    }

    for (const row of document.value.rows) {
      for (const seat of row) {
        if (!seat) continue

        counts.seats += 1
        counts.occupied += matrixSeatSpan(seat)
        counts[seat.seatType] += 1
      }
    }

    counts.empty = counts.rows * counts.columns - counts.occupied
    return counts
  })

  function fail(message: string) {
    operationError.value = message
    return false
  }

  function validCell(row: number, column: number) {
    return (
      Number.isInteger(row) &&
      Number.isInteger(column) &&
      row >= 0 &&
      row < document.value.rows.length &&
      column >= 0 &&
      column < document.value.columns
    )
  }

  function select(row: number, column: number) {
    if (!validCell(row, column)) return

    selection.value = {
      row,
      column: matrixSeatOwnerColumn(document.value.rows[row]!, column),
    }
  }

  function snapshot() {
    return copyDocument(document.value)
  }

  function checkpoint(): MatrixCheckpoint {
    return {
      document: snapshot(),
      selection: { ...selection.value },
    }
  }

  function restore(entry: MatrixCheckpoint) {
    document.value = copyDocument(entry.document)

    const row = Math.max(0, Math.min(entry.selection.row, document.value.rows.length - 1))
    const column = Math.max(0, Math.min(entry.selection.column, document.value.columns - 1))

    select(row, column)
  }

  function commit(next: SeatMatrixDocument, nextSelection: MatrixSelection = selection.value) {
    operationError.value = ''

    try {
      validateSeatMatrixDocument(next)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Ma trận sau thao tác không hợp lệ.')
    }

    if (JSON.stringify(next) === JSON.stringify(document.value)) {
      select(nextSelection.row, nextSelection.column)
      return false
    }

    undoStack.value = [...undoStack.value, checkpoint()].slice(-HISTORY_LIMIT)
    redoStack.value = []

    restore({
      document: next,
      selection: { ...nextSelection },
    })

    return true
  }

  function undo() {
    operationError.value = ''

    const entry = undoStack.value.at(-1)
    if (!entry) return false

    redoStack.value = [...redoStack.value, checkpoint()].slice(-HISTORY_LIMIT)
    undoStack.value = undoStack.value.slice(0, -1)
    restore(entry)
    return true
  }

  function redo() {
    operationError.value = ''

    const entry = redoStack.value.at(-1)
    if (!entry) return false

    undoStack.value = [...undoStack.value, checkpoint()].slice(-HISTORY_LIMIT)
    redoStack.value = redoStack.value.slice(0, -1)
    restore(entry)
    return true
  }

  function reset() {
    return commit(emptyDocument(), { row: 0, column: 0 })
  }

  function addSeat(
    rowIndex: number,
    columnIndex: number,
    raw: string,
    seatType: string = 'STANDARD',
  ): AddSeatResult {
    operationError.value = ''

    if (!validCell(rowIndex, columnIndex)) {
      return { ok: false, message: 'Ô được chọn không còn tồn tại.' }
    }

    const row = document.value.rows[rowIndex]!

    if (matrixSeatOwnerColumn(row, columnIndex) !== columnIndex) {
      return {
        ok: false,
        message: 'Ô này là phần thứ hai của ghế đôi, không thể thêm ghế.',
      }
    }

    if (row[columnIndex]) {
      return { ok: false, message: 'Ô này đã có ghế.' }
    }

    const value = raw.trim()
    if (!value) return { ok: true, changed: false }

    if (!/^[0-9]+$/.test(value)) {
      return { ok: false, message: 'Số ghế phải là số nguyên dương.' }
    }

    const number = Number(value)

    if (!Number.isSafeInteger(number) || number <= 0) {
      return {
        ok: false,
        message: 'Nhập số nguyên lớn hơn 0 trong giới hạn an toàn.',
      }
    }

    if (row.some((seat) => seat?.number === number)) {
      return {
        ok: false,
        message: `Hàng ${matrixRowLabel(rowIndex)} đã có số ${number}.`,
      }
    }

    const option = matrixSeatTypes.find((item) => item.value === seatType)

    if (!option) {
      return { ok: false, message: 'Loại ghế được chọn không hợp lệ.' }
    }

    if (option.value === 'COUPLE') {
      if (columnIndex + 1 >= document.value.columns) {
        return {
          ok: false,
          message: 'Ghế đôi cần 2 ô liền nhau. Hãy thêm cột bên phải trước.',
        }
      }

      if (row[columnIndex + 1] !== null) {
        return {
          ok: false,
          message: 'Ô bên phải đã có ghế, không đủ chỗ để tạo ghế đôi.',
        }
      }
    }

    if (statistics.value.seats >= MATRIX_LIMITS.seats) {
      return { ok: false, message: 'Ma trận chỉ hỗ trợ tối đa 2.500 ghế.' }
    }

    const next = snapshot()
    const nextRow = next.rows[rowIndex]!

    nextRow[columnIndex] = {
      number,
      seatType: option.value,
    }

    renumber(nextRow)

    const changed = commit(next, { row: rowIndex, column: columnIndex })

    if (!changed && operationError.value) {
      return { ok: false, message: operationError.value }
    }

    return { ok: true, changed }
  }

  function clearSelectedSeat() {
    operationError.value = ''
    if (!selectedSeat.value) return false

    const next = snapshot()
    const row = next.rows[selection.value.row]!

    row[selection.value.column] = null
    renumber(row)

    return commit(next)
  }

  function changeSelectedType(value: string) {
    operationError.value = ''

    const option = matrixSeatTypes.find((item) => item.value === value)

    if (!option || !selectedSeat.value || selectedSeat.value.seatType === option.value) {
      return false
    }

    const { row: rowIndex, column } = selection.value
    const row = document.value.rows[rowIndex]!

    if (option.value === 'COUPLE') {
      if (column + 1 >= document.value.columns) {
        return fail('Ghế đôi cần 2 ô liền nhau. Hãy thêm cột bên phải trước.')
      }

      if (row[column + 1] !== null) {
        return fail('Ô bên phải đã có ghế. Hãy để trống ô đó trước khi đổi sang ghế đôi.')
      }
    }

    const next = snapshot()
    next.rows[rowIndex]![column]!.seatType = option.value

    return commit(next)
  }

  function insertCell(rowIndex: number, index: number) {
    operationError.value = ''

    if (
      !Number.isInteger(rowIndex) ||
      rowIndex < 0 ||
      rowIndex >= document.value.rows.length ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > document.value.columns
    ) {
      return fail('Vị trí chèn ô không hợp lệ.')
    }

    const row = document.value.rows[rowIndex]!

    if (index > 0 && row[index - 1]?.seatType === 'COUPLE') {
      return fail('Không thể chèn ô giữa hai phần của ghế đôi.')
    }

    const lastColumn = document.value.columns - 1
    const lastIsFree =
      row[lastColumn] === null && matrixSeatOwnerColumn(row, lastColumn) === lastColumn

    const needsColumn = index === document.value.columns || !lastIsFree

    if (needsColumn && document.value.columns >= MATRIX_LIMITS.dimension) {
      return fail(
        'Không thể chèn ô vì cần thêm cột nhưng ma trận đã đủ 100 cột. ' +
          'Hãy để trống ô cuối hàng trước.',
      )
    }

    const next = snapshot()
    const nextRow = next.rows[rowIndex]!

    nextRow.splice(index, 0, null)

    if (needsColumn) {
      for (let currentRow = 0; currentRow < next.rows.length; currentRow += 1) {
        if (currentRow !== rowIndex) next.rows[currentRow]!.push(null)
      }

      next.columns += 1
    } else {
      nextRow.pop()
    }

    renumber(nextRow)

    const changed = commit(next, { row: rowIndex, column: index })
    return changed || !operationError.value
  }

  function deleteSelectedCell() {
    operationError.value = ''

    const { row: rowIndex, column } = selection.value

    if (!validCell(rowIndex, column)) {
      return fail('Ô được chọn không còn tồn tại.')
    }

    const next = snapshot()
    const row = next.rows[rowIndex]!
    const ownerColumn = matrixSeatOwnerColumn(row, column)
    const span = matrixSeatSpan(row[ownerColumn])

    // Xóa toàn bộ vùng đang chọn, kể cả hai ô của ghế đôi.
    row.splice(ownerColumn, span)

    // Bù đúng số ô ở cuối để giữ số cột và hình chữ nhật.
    row.push(...emptyRow(span))
    renumber(row)

    const changed = commit(next, {
      row: rowIndex,
      column: ownerColumn,
    })

    return changed || !operationError.value
  }

  function insertRow(index: number) {
    operationError.value = ''

    if (!Number.isInteger(index) || index < 0 || index > document.value.rows.length) {
      return fail('Vị trí chèn hàng không hợp lệ.')
    }

    if (document.value.rows.length >= MATRIX_LIMITS.dimension) {
      return fail('Ma trận chỉ hỗ trợ tối đa 100 hàng.')
    }

    const next = snapshot()
    next.rows.splice(index, 0, emptyRow(next.columns))

    return commit(next, { row: index, column: selection.value.column })
  }

  function deleteSelectedRow() {
    operationError.value = ''

    if (document.value.rows.length <= 1) {
      return fail('Ma trận phải còn ít nhất một hàng.')
    }

    const next = snapshot()
    const index = selection.value.row
    next.rows.splice(index, 1)

    return commit(next, {
      row: Math.min(index, next.rows.length - 1),
      column: selection.value.column,
    })
  }

  function insertColumn(index: number) {
    operationError.value = ''

    if (!Number.isInteger(index) || index < 0 || index > document.value.columns) {
      return fail('Vị trí chèn cột không hợp lệ.')
    }

    if (document.value.columns >= MATRIX_LIMITS.dimension) {
      return fail('Ma trận chỉ hỗ trợ tối đa 100 cột.')
    }

    const affectedRow = document.value.rows.findIndex(
      (row) => index > 0 && row[index - 1]?.seatType === 'COUPLE',
    )

    if (affectedRow >= 0) {
      return fail(
        `Không thể chèn cột giữa ghế đôi ở hàng ${matrixRowLabel(affectedRow)}. ` +
          'Hãy chọn vị trí nằm ngoài ghế đôi.',
      )
    }

    const next = snapshot()

    for (const row of next.rows) {
      row.splice(index, 0, null)
      renumber(row)
    }

    next.columns += 1

    return commit(next, { row: selection.value.row, column: index })
  }

  function deleteSelectedColumn() {
    operationError.value = ''

    if (document.value.columns <= 1) {
      return fail('Ma trận phải còn ít nhất một cột.')
    }

    const next = snapshot()
    const index = selection.value.column

    for (const row of next.rows) {
      const owner = matrixSeatOwnerColumn(row, index)

      if (row[owner]?.seatType === 'COUPLE') {
        row[owner] = null
      }

      row.splice(index, 1)
      renumber(row)
    }

    next.columns -= 1

    return commit(next, {
      row: selection.value.row,
      column: Math.min(index, next.columns - 1),
    })
  }

  return {
    document,
    selection,
    selectedSeat,
    selectedSpan,
    statistics,
    operationError,
    canUndo,
    canRedo,
    select,
    snapshot,
    reset,
    undo,
    redo,
    addSeat,
    clearSelectedSeat,
    changeSelectedType,
    insertCell,
    deleteSelectedCell,
    insertRow,
    deleteSelectedRow,
    insertColumn,
    deleteSelectedColumn,
  }
}
