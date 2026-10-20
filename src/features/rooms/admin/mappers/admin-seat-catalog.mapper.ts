import type { SeatResponse } from '@/services/api/generated/inventory-service/model'
import { adminSeatCapacity, adminSeatTypeOptions } from '../schemas/admin-seat-type-options'

export type ManagedSeat = SeatResponse & {
  id: string
  roomId: string
  seatNumber: string
  rowLabel: string
  active: boolean
}

export interface SeatCatalogCell {
  seat: ManagedSeat | null
  column: number
  span: 1 | 2
}

export interface SeatCatalogRow {
  label: string
  cells: SeatCatalogCell[]
}

export interface SeatCatalogMatrix {
  rows: SeatCatalogRow[]
  seats: ManagedSeat[]
  columnCount: number
  occupiedCount: number
  emptyCount: number
  inactiveCount: number
  capacity: number
  activeCapacity: number
}

export function isRoomSeatUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

const collator = new Intl.Collator('vi', { numeric: true })

function compareRowLabels(left: string, right: string): number {
  const leftIsMatrixLabel = /^[A-Z]+$/.test(left)
  const rightIsMatrixLabel = /^[A-Z]+$/.test(right)

  // Nhãn hàng chuẩn A…Z, AA… đứng trước các nhãn khác.
  if (leftIsMatrixLabel !== rightIsMatrixLabel) {
    return leftIsMatrixLabel ? -1 : 1
  }

  if (leftIsMatrixLabel && rightIsMatrixLabel) {
    // Với nhãn cùng độ dài, thứ tự chữ cũng là thứ tự hàng.
    if (left.length !== right.length) {
      return left.length - right.length
    }

    if (left === right) return 0

    return left < right ? -1 : 1
  }

  return collator.compare(left, right)
}

function seatColumnSpan(seat: ManagedSeat): 1 | 2 {
  return seat.seatType === 'COUPLE' ? 2 : 1
}

export function mapAdminSeatCatalog(
  input: readonly SeatResponse[],
  roomId: string,
): SeatCatalogMatrix {
  const ids = new Set<string>()
  const seats: ManagedSeat[] = []

  for (const seat of input) {
    if (
      !isRoomSeatUuid(seat.id) ||
      seat.roomId !== roomId ||
      !seat.seatNumber?.trim() ||
      !seat.rowLabel?.trim() ||
      typeof seat.active !== 'boolean' ||
      !adminSeatTypeOptions.some((option) => option.value === seat.seatType) ||
      ids.has(seat.id)
    ) {
      throw new Error('Danh mục ghế không hợp lệ. Hãy tải lại dữ liệu.')
    }

    ids.add(seat.id)
    seats.push(seat as ManagedSeat)
  }

  seats.sort(
    (a, b) =>
      compareRowLabels(a.rowLabel, b.rowLabel) ||
      collator.compare(a.seatNumber, b.seatNumber) ||
      a.id.localeCompare(b.id),
  )

  const grouped = new Map<string, ManagedSeat[]>()

  for (const seat of seats) {
    const items = grouped.get(seat.rowLabel) ?? []
    items.push(seat)
    grouped.set(seat.rowLabel, items)
  }

  const rowWidths = new Map<string, number>()
  let columnCount = 0
  let occupiedCount = 0

  for (const [label, items] of grouped) {
    const width = items.reduce((total, seat) => total + seatColumnSpan(seat), 0)

    rowWidths.set(label, width)
    columnCount = Math.max(columnCount, width)
    occupiedCount += width
  }

  const rows: SeatCatalogRow[] = []

  for (const [label, items] of grouped) {
    const cells: SeatCatalogCell[] = []
    let column = 0

    for (const seat of items) {
      const span = seatColumnSpan(seat)

      cells.push({
        seat,
        column,
        span,
      })

      column += span
    }

    const width = rowWidths.get(label) ?? 0

    for (let emptyColumn = width; emptyColumn < columnCount; emptyColumn += 1) {
      cells.push({
        seat: null,
        column: emptyColumn,
        span: 1,
      })
    }

    rows.push({ label, cells })
  }
  let capacity = 0
  let activeCapacity = 0

  for (const seat of seats) {
    const seatCapacity = adminSeatCapacity(seat.seatType)

    capacity += seatCapacity

    if (seat.active) {
      activeCapacity += seatCapacity
    }
  }

  return {
    rows,
    seats,
    columnCount,
    occupiedCount,
    emptyCount: rows.length * columnCount - occupiedCount,
    inactiveCount: seats.filter((seat) => !seat.active).length,
    capacity,
    activeCapacity,
  }
}
