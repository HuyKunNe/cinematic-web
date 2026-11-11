import { z } from 'zod'
import type { ShowtimeSeatMapResponse } from '@/services/api/generated/inventory-service/model/showtimeSeatMapResponse'
import { ShowtimeSeatMapSeatResponseSeatType } from '@/services/api/generated/inventory-service/model/showtimeSeatMapSeatResponseSeatType'
import type { BookingSeat, BookingSeatMap } from '../models/booking-seat.model'

const seatTypes: Record<ShowtimeSeatMapSeatResponseSeatType, { label: string; capacity: number }> = {
  STANDARD: { label: 'Tiêu chuẩn', capacity: 1 },
  VIP: { label: 'VIP', capacity: 1 },
  COUPLE: { label: 'Ghế đôi', capacity: 2 },
  ACCESSIBLE: { label: 'Hỗ trợ tiếp cận', capacity: 1 },
}

export const bookingSeatStatusLabels: Record<BookingSeat['status'], string> = {
  AVAILABLE: 'Còn trống',
  HELD: 'Đang được giữ',
  BOOKED: 'Đã đặt',
  UNAVAILABLE: 'Không khả dụng',
  UNKNOWN: 'Dữ liệu chưa đầy đủ',
}

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatBookingMoney(minorAmount: number): string {
  return moneyFormatter.format(minorAmount / 100)
}

const seatMapSchema = z.object({
  showtimeId: z.string().uuid(),
  roomId: z.string().uuid(),
  matrix: z.object({
    rowCount: z.number().int().positive().max(100),
    columnCount: z.number().int().positive().max(100),
  }).nullish(),
  seats: z.array(z.object({
    rowIndex: z.number().int().nonnegative().nullish(),
    columnIndex: z.number().int().nonnegative().nullish(),
    columnSpan: z.number().int().positive().max(2).nullish(),
    seatId: z.string().uuid(),
    showSeatId: z.string().uuid().nullish(),
    seatNumber: z.string().trim().min(1),
    rowLabel: z.string().trim().min(1),
    seatType: z.nativeEnum(ShowtimeSeatMapSeatResponseSeatType),
    capacity: z.number().int().positive(),
    price: z.number().finite().nonnegative().nullish(),
    currency: z.literal('VND'),
    status: z.enum(['AVAILABLE', 'HELD', 'BOOKED', 'UNAVAILABLE']).nullish(),
    selectable: z.boolean(),
  })),
})

export function mapBookingSeatMap(
  snapshot: ShowtimeSeatMapResponse,
  roomId: string,
  showtimeId: string,
): BookingSeatMap {
  const parsed = seatMapSchema.parse(snapshot)
  const ids = parsed.seats.map((seat) => seat.seatId)
  const numbers = parsed.seats.map((seat) => seat.seatNumber.toUpperCase())
  const showSeatIds = parsed.seats.flatMap((seat) => seat.showSeatId ? [seat.showSeatId] : [])

  if (
    parsed.roomId !== roomId || parsed.showtimeId !== showtimeId ||
    new Set(ids).size !== ids.length ||
    new Set(numbers).size !== numbers.length ||
    new Set(showSeatIds).size !== showSeatIds.length
  ) {
    throw new Error('BOOKING_SEAT_MAP_INCONSISTENT')
  }

  const occupied = new Set<string>()
  const seats = parsed.seats.map((seat): BookingSeat => {
    let position: BookingSeat['position'] = null
    if (parsed.matrix) {
      const { rowIndex: row, columnIndex: column, columnSpan: span } = seat
      if (row == null || column == null || span == null ||
        row >= parsed.matrix.rowCount || column + span > parsed.matrix.columnCount ||
        span !== (seat.seatType === 'COUPLE' ? 2 : 1)) {
        throw new Error('BOOKING_SEAT_MAP_INCONSISTENT')
      }
      for (let offset = 0; offset < span; offset += 1) {
        const key = `${row}:${column + offset}`
        if (occupied.has(key)) throw new Error('BOOKING_SEAT_MAP_INCONSISTENT')
        occupied.add(key)
      }
      position = { row, column, span }
    }
    const amount = seat.price == null ? null : Math.round(seat.price * 100)
    const priceMinor = amount !== null && Number.isSafeInteger(amount) ? amount : null
    const status = seat.showSeatId && seat.status ? seat.status : 'UNKNOWN'

    return {
      id: seat.seatId,
      seatType: seat.seatType,
      position,
      seatNumber: seat.seatNumber,
      rowLabel: seat.rowLabel,
      typeLabel: seatTypes[seat.seatType].label,
      capacity: seat.capacity,
      priceMinor,
      status,
      selectable: seat.selectable && status === 'AVAILABLE' && priceMinor !== null,
    }
  }).sort((a, b) =>
    a.rowLabel.localeCompare(b.rowLabel, 'vi', { numeric: true }) ||
    a.seatNumber.localeCompare(b.seatNumber, 'vi', { numeric: true }),
  )
  return { seats, matrix: parsed.matrix ?? null }
}
