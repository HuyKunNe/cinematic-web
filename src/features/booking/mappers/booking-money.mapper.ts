import type { BookingResponseStatus } from '@/services/api/generated/booking-service/model/bookingResponseStatus'

export function formatSavedBookingMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  status: BookingResponseStatus | undefined,
): string {
  if (value == null || !currency)
    return status === 'PENDING' ? 'Đang xác nhận' : 'Chưa có dữ liệu giá'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value)
}
