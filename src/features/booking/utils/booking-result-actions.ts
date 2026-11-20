import type { BookingResponseStatus } from '@/services/api/generated/booking-service/model/bookingResponseStatus'
import type { PaymentCheckoutResponseStatus } from '@/services/api/generated/payment-service/model/paymentCheckoutResponseStatus'

export function needsBookingPaymentReview(
  bookingStatus: BookingResponseStatus | undefined,
  paymentStatus: PaymentCheckoutResponseStatus | undefined,
): boolean {
  return (
    bookingStatus !== 'CONFIRMED' &&
    (paymentStatus === 'SUCCEEDED' || paymentStatus === 'RECONCILIATION_REQUIRED')
  )
}

export function canRestartBooking(
  bookingStatus: BookingResponseStatus | undefined,
  paymentStatus: PaymentCheckoutResponseStatus | undefined,
  paymentChecked: boolean,
): boolean {
  if (needsBookingPaymentReview(bookingStatus, paymentStatus)) return false
  if (bookingStatus === 'REJECTED') return true
  return (
    (bookingStatus === 'CANCELLED' || bookingStatus === 'EXPIRED') &&
    paymentChecked &&
    (paymentStatus === undefined || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED')
  )
}
