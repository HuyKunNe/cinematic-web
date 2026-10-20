import { SeatResponseSeatType } from '@/services/api/generated/inventory-service/model'

export const adminSeatTypeOptions = [
  {
    value: SeatResponseSeatType.STANDARD,
    label: 'STANDARD',
    capacity: 1,
  },
  {
    value: SeatResponseSeatType.VIP,
    label: 'VIP',
    capacity: 1,
  },
  {
    value: SeatResponseSeatType.COUPLE,
    label: 'COUPLE',
    capacity: 2,
  },
  {
    value: SeatResponseSeatType.ACCESSIBLE,
    label: 'Ưu tiên',
    capacity: 1,
  },
] as const

export function adminSeatCapacity(seatType: SeatResponseSeatType | null | undefined): number {
  return adminSeatTypeOptions.find((option) => option.value === seatType)?.capacity ?? 0
}
