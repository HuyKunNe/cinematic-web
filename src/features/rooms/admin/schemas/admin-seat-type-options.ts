import { SeatResponseSeatType } from '@/services/api/generated/inventory-service/model'

export const adminSeatTypeOptions = [
  { value: SeatResponseSeatType.STANDARD, label: 'Tiêu chuẩn' },
  { value: SeatResponseSeatType.VIP, label: 'VIP' },
  { value: SeatResponseSeatType.COUPLE, label: 'Ghế đôi' },
  {
    value: SeatResponseSeatType.ACCESSIBLE,
    label: 'Hỗ trợ tiếp cận',
  },
] as const