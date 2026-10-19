import { computed, ref } from 'vue'
import type { SeatResponseSeatType } from '@/services/api/generated/inventory-service/model/seatResponseSeatType'

export type MatrixSeat = {
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

type AddSeatResult = { ok: true; changed: boolean } | { ok: false; message: string }

export const matrixSeatTypes = [
  { value: 'STANDARD', label: 'Standard — ghế thường' },
  { value: 'VIP', label: 'VIP — ghế cao cấp' },
  { value: 'COUPLE', label: 'Couple — ghế đôi' },
  { value: 'ACCESSIBLE', label: 'Accessible — ghế tiếp cận' },
] as const satisfies readonly {
  value: SeatResponseSeatType
  label: string
}[]

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

function emptyRow(columns: number): MatrixCell[] {
  return Array.from({ length: columns }, () => null)
}

function emptyDocument(): SeatMatrixDocument {
  return {
    columns: 6,
    rows: Array.from({ length: 6 }, () => emptyRow(6)),
  }
}

function renumber(row: MatrixCell[]) {
  let number = 0

  for (const seat of row) {
    if (seat) seat.number = ++number
  }
}

export function useAdminSeatMatrix() {
  const document = ref<SeatMatrixDocument>(emptyDocument())
  const selection = ref<MatrixSelection>({ row: 0, column: 0 })

  const selectedSeat = computed(
    () => document.value.rows[selection.value.row]?.[selection.value.column] ?? null,
  )

  const statistics = computed(() => {
    const counts = {
      rows: document.value.rows.length,
      columns: document.value.columns,
      seats: 0,
      empty: 0,
      STANDARD: 0,
      VIP: 0,
      COUPLE: 0,
      ACCESSIBLE: 0,
    }

    for (const row of document.value.rows) {
      for (const seat of row) {
        if (seat) {
          counts.seats += 1
          counts[seat.seatType] += 1
        } else {
          counts.empty += 1
        }
      }
    }

    return counts
  })

  function select(row: number, column: number) {
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      row >= document.value.rows.length ||
      column < 0 ||
      column >= document.value.columns
    ) {
      return
    }

    selection.value = { row, column }
  }

  function snapshot(): SeatMatrixDocument {
    return {
      columns: document.value.columns,
      rows: document.value.rows.map((row) => row.map((seat) => (seat ? { ...seat } : null))),
    }
  }

  function reset() {
    document.value = emptyDocument()
    selection.value = { row: 0, column: 0 }
  }

  function addSeat(rowIndex: number, columnIndex: number, raw: string): AddSeatResult {
    const row = document.value.rows[rowIndex]

    if (!row || columnIndex < 0 || columnIndex >= document.value.columns) {
      return { ok: false, message: 'Ô được chọn không còn tồn tại.' }
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

    row[columnIndex] = { number, seatType: 'STANDARD' }
    renumber(row)
    select(rowIndex, columnIndex)

    return { ok: true, changed: true }
  }

  function clearSelectedSeat() {
    const row = document.value.rows[selection.value.row]

    if (!row || !row[selection.value.column]) return false

    row[selection.value.column] = null
    renumber(row)
    return true
  }

  function changeSelectedType(value: string) {
    if (!matrixSeatTypes.some((option) => option.value === value)) return false

    const seat = selectedSeat.value
    if (!seat) return false

    seat.seatType = value as SeatResponseSeatType
    return true
  }

  function insertRow(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > document.value.rows.length) {
      return false
    }

    document.value.rows.splice(index, 0, emptyRow(document.value.columns))
    select(index, selection.value.column)
    return true
  }

  function deleteSelectedRow() {
    if (document.value.rows.length <= 1) return false

    const index = selection.value.row
    document.value.rows.splice(index, 1)
    select(Math.min(index, document.value.rows.length - 1), selection.value.column)
    return true
  }

  function insertColumn(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > document.value.columns) {
      return false
    }

    for (const row of document.value.rows) {
      row.splice(index, 0, null)
      renumber(row)
    }

    document.value.columns += 1
    select(selection.value.row, index)
    return true
  }

  function deleteSelectedColumn() {
    if (document.value.columns <= 1) return false

    const index = selection.value.column

    for (const row of document.value.rows) {
      row.splice(index, 1)
      renumber(row)
    }

    document.value.columns -= 1
    select(selection.value.row, Math.min(index, document.value.columns - 1))
    return true
  }

  return {
    document,
    selection,
    selectedSeat,
    statistics,
    select,
    snapshot,
    reset,
    addSeat,
    clearSelectedSeat,
    changeSelectedType,
    insertRow,
    deleteSelectedRow,
    insertColumn,
    deleteSelectedColumn,
  }
}
