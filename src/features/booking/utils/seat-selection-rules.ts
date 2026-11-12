import type { BookingSeat } from '../models/booking-seat.model'

/** Validate physical positions, never infer adjacency from seat labels or prices. */
export function seatSelectionError(seats: BookingSeat[], selected: BookingSeat[]): string {
  // A single sellable unit, including an indivisible couple seat, is explicitly allowed.
  if (selected.length <= 1) return ''
  if (selected.some((seat) => !seat.position)) {
    return 'Sơ đồ chưa có đủ dữ liệu vị trí để kiểm tra các ghế liền nhau. Vui lòng chọn suất khác.'
  }

  const rows = new Map<number, BookingSeat[]>()
  for (const seat of selected) {
    const row = seat.position!.row
    const items = rows.get(row) ?? []
    items.push(seat)
    rows.set(row, items)
  }
  const isolatedSelections = [...rows.values()]
    .filter((items) => items.length === 1 && items[0]!.capacity === 1)
    .map((items) => items[0]!.seatNumber)
  if (isolatedSelections.length) {
    return `Không chọn ghế đơn lẻ ${isolatedSelections.join(', ')} khi đặt nhiều ghế. Vui lòng chọn thêm ghế liền kề trong từng hàng hoặc chỉ giữ lại một ghế cho cả đơn.`
  }
  for (const items of rows.values()) {
    const error = rowSelectionError(seats, items)
    if (error) return error
  }
  return ''
}

function rowSelectionError(seats: BookingSeat[], selected: BookingSeat[]): string {
  const ordered = [...selected].sort((a, b) => a.position!.column - b.position!.column)
  const row = ordered[0]!.position!.row
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!.position!
    if (ordered[index]!.position!.column !== previous.column + previous.span) {
      return `Hàng ${ordered[0]!.rowLabel}: không chọn ghế cách nhau hoặc ngăn bởi lối đi. Vui lòng chọn liền nhau trong hàng này.`
    }
  }

  // Aisles and unavailable seats are boundaries. Do not penalize an isolated seat
  // elsewhere in the room that was already isolated before this selection.
  const rowSeats = seats
    .filter((seat) => seat.position?.row === row)
    .sort((a, b) => a.position!.column - b.position!.column)
  const runs: BookingSeat[][] = []
  let run: BookingSeat[] = []
  for (const seat of rowSeats) {
    const previous = run[run.length - 1]
    if (
      !seat.selectable ||
      (previous && seat.position!.column !== previous.position!.column + previous.position!.span)
    ) {
      if (run.length) runs.push(run)
      run = []
    }
    if (seat.selectable) run.push(seat)
  }
  if (run.length) runs.push(run)

  const selectedIds = new Set(selected.map((seat) => seat.id))
  const affected = runs.find((items) => items.some((seat) => selectedIds.has(seat.id)))
  if (!affected) return 'Ghế đã thay đổi trạng thái. Vui lòng chọn lại.'
  const first = affected.findIndex((seat) => selectedIds.has(seat.id))
  let last = first
  for (let index = first + 1; index < affected.length; index += 1) {
    if (selectedIds.has(affected[index]!.id)) last = index
  }
  const leftovers = [affected.slice(0, first), affected.slice(last + 1)]
    .filter((items) => items.length === 1 && items[0]!.capacity === 1)
    .map((items) => items[0]!.seatNumber)
  return leftovers.length
    ? `Không để trống ghế lẻ ${leftovers.join(', ')}. Vui lòng chọn thêm ghế đó hoặc đổi vị trí.`
    : ''
}
