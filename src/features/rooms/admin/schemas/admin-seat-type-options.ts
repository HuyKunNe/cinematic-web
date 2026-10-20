import { SeatResponseSeatType } from '@/services/api/generated/inventory-service/model'

export const adminSeatTypeOptions = [
  { value: SeatResponseSeatType.STANDARD, label: 'STANDARD' },
  { value: SeatResponseSeatType.VIP, label: 'VIP' },
  { value: SeatResponseSeatType.COUPLE, label: 'COUPLE' },
  {
    value: SeatResponseSeatType.ACCESSIBLE,
    label: 'Ưu tiên',
  },
] as const
