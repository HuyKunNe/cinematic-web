import type { SeatResponse } from '@/services/api/generated/inventory-service/model'
import { adminSeatTypeOptions } from '../schemas/admin-seat-range.schema'

export type ManagedSeat = SeatResponse & {
  id: string
  roomId: string
  seatNumber: string
  rowLabel: string
  active: boolean
}

export interface SeatCatalogRow {
  label: string
  cells: (ManagedSeat | null)[]
}

export interface SeatCatalogMatrix {
  rows: SeatCatalogRow[]
  seats: ManagedSeat[]
  columnCount: number
  emptyCount: number
  inactiveCount: number
}

export function isRoomSeatUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

const collator = new Intl.Collator('vi', { numeric: true })

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
      collator.compare(a.rowLabel, b.rowLabel) ||
      collator.compare(a.seatNumber, b.seatNumber) ||
      a.id.localeCompare(b.id),
  )

  const grouped = new Map<string, ManagedSeat[]>()

  for (const seat of seats) {
    const items = grouped.get(seat.rowLabel) ?? []
    items.push(seat)
    grouped.set(seat.rowLabel, items)
  }

  const columnCount = Math.max(0, ...[...grouped.values()].map((items) => items.length))

  const rows = [...grouped].map(([label, items]) => ({
    label,
    cells: Array.from({ length: columnCount }, (_, column) => items[column] ?? null),
  }))

  return {
    rows,
    seats,
    columnCount,
    emptyCount: rows.length * columnCount - seats.length,
    inactiveCount: seats.filter((seat) => !seat.active).length,
  }
}
