import type { SeatResponse } from '@/services/api/generated/inventory-service/model/seatResponse'
import type { ShowSeatResponse } from '@/services/api/generated/inventory-service/model/showSeatResponse'
import type { ShowSeatResponseSeatType } from '@/services/api/generated/inventory-service/model/showSeatResponseSeatType'
import type { BookingSeat } from '../models/booking-seat.model'

const seatTypes: Record<ShowSeatResponseSeatType, { label: string; capacity: number }> = {
  STANDARD: { label: 'Tiêu chuẩn', capacity: 1 },
  VIP: { label: 'VIP', capacity: 1 },
  COUPLE: { label: 'Ghế đôi', capacity: 2 },
  ACCESSIBLE: { label: 'Hỗ trợ tiếp cận', capacity: 1 },
}

export const bookingSeatStatusLabels: Record<BookingSeat['status'], string> = {
  AVAILABLE: 'Còn trống',
  HELD: 'Đang được giữ',
  BOOKED: 'Đã đặt',
  UNAVAILABLE: 'Không bán',
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

function toMinorAmount(price: number | undefined): number | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return null
  }

  const amount = Math.round(price * 100)
  return Number.isSafeInteger(amount) ? amount : null
}

export function mapBookingSeats(
  physicalSeats: SeatResponse[],
  showSeats: ShowSeatResponse[],
  roomId: string,
  showtimeId: string,
): BookingSeat[] {
  const showSeatsBySeatId = new Map<string, ShowSeatResponse[]>()

  for (const seat of showSeats) {
    if (!seat.seatId || seat.showtimeId !== showtimeId) continue

    const matches = showSeatsBySeatId.get(seat.seatId) ?? []
    matches.push(seat)
    showSeatsBySeatId.set(seat.seatId, matches)
  }

  return physicalSeats
    .flatMap((physical): BookingSeat[] => {
      if (
        !physical.id ||
        !physical.seatNumber?.trim() ||
        physical.roomId !== roomId ||
        physical.active !== true
      ) {
        return []
      }

      const candidates = showSeatsBySeatId.get(physical.id) ?? []
      const showSeat = candidates.length === 1 ? candidates[0] : undefined
      const type = showSeat?.seatType
      const typeInfo = type ? seatTypes[type] : undefined
      const priceMinor = toMinorAmount(showSeat?.price)
      const rowLabel = physical.rowLabel?.trim() ?? ''

      const matching =
        Boolean(showSeat?.id) &&
        showSeat?.seatNumber?.trim() === physical.seatNumber.trim() &&
        showSeat?.seatType === physical.seatType &&
        Boolean(rowLabel) &&
        Boolean(typeInfo) &&
        priceMinor !== null

      const responseStatus = showSeat?.status
      const knownStatus =
        responseStatus === 'AVAILABLE' ||
        responseStatus === 'HELD' ||
        responseStatus === 'BOOKED' ||
        responseStatus === 'UNAVAILABLE'

      const status: BookingSeat['status'] = matching && knownStatus ? responseStatus : 'UNKNOWN'

      return [
        {
          id: physical.id,
          seatNumber: physical.seatNumber.trim(),
          rowLabel: rowLabel || 'Chưa phân hàng',
          typeLabel: typeInfo?.label ?? 'Chưa xác định loại ghế',
          capacity: typeInfo?.capacity ?? 0,
          priceMinor: matching ? priceMinor : null,
          status,
          selectable: status === 'AVAILABLE',
        },
      ]
    })
    .sort(
      (a, b) =>
        a.rowLabel.localeCompare(b.rowLabel, 'vi', { numeric: true }) ||
        a.seatNumber.localeCompare(b.seatNumber, 'vi', { numeric: true }),
    )
}
