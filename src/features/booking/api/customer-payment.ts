import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { getCheckoutForCurrentUser } from '@/services/api/generated/payment-service/customer-payment-checkout-controller/customer-payment-checkout-controller'
import { PaymentCheckoutResponseStatus } from '@/services/api/generated/payment-service/model/paymentCheckoutResponseStatus'
import type { PaymentCheckoutResponse } from '@/services/api/generated/payment-service/model/paymentCheckoutResponse'
import { customerBookingId } from './customer-bookings'

const checkoutSchema = z.object({
  bookingId: customerBookingId,
  paymentId: z.string().uuid(),
  status: z.nativeEnum(PaymentCheckoutResponseStatus),
  checkoutUri: z
    .string()
    .max(2048)
    .nullish()
    .transform((value) => value ?? undefined),
  holdExpiresAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
})

export const customerPaymentLabels: Record<PaymentCheckoutResponseStatus, string> = {
  RECEIVED: 'Đã tiếp nhận thanh toán',
  PROCESSING: 'Đang chuẩn bị thanh toán',
  PENDING_PROVIDER: 'Chờ thanh toán tại cổng thanh toán',
  SUCCEEDED: 'Thanh toán thành công',
  FAILED: 'Thanh toán không thành công',
  EXPIRED: 'Đã hết thời gian thanh toán',
  RECONCILIATION_REQUIRED: 'Đang xác minh kết quả thanh toán',
}

export function checkoutLink(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

export function useCustomerPaymentQuery(
  bookingId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
  poll: MaybeRefOrGetter<boolean>,
) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['customer-payment', auth.subject, toValue(bookingId)] as const),
    enabled: computed(
      () =>
        auth.isAuthenticated &&
        !!auth.subject &&
        customerBookingId.safeParse(toValue(bookingId)).success &&
        toValue(enabled),
    ),
    queryFn: async ({ queryKey }) => {
      if (!auth.isAuthenticated || auth.subject !== queryKey[1]) throw new Error('Session changed')
      let response
      try {
        response = await getCheckoutForCurrentUser(queryKey[2])
      } catch (cause) {
        // Payment is created asynchronously after the seat reservation event.
        if ((cause as { status?: number })?.status === 404) return null
        throw cause
      }
      if (!auth.isAuthenticated || auth.subject !== queryKey[1]) throw new Error('Session changed')
      const payment = checkoutSchema.parse(
        z.object({ success: z.literal(true), data: z.unknown() }).parse(response).data,
      ) satisfies PaymentCheckoutResponse
      if (payment.bookingId !== queryKey[2]) throw new Error('Payment booking mismatch')
      return payment
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      toValue(poll) &&
      !query.state.error &&
      !['FAILED', 'EXPIRED', 'RECONCILIATION_REQUIRED', 'SUCCEEDED'].includes(
        query.state.data?.status ?? '',
      )
        ? 3_000
        : false,
  })
}
