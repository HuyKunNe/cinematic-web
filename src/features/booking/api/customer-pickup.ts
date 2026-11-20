import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { toDataURL } from 'qrcode'
import { useAuthStore } from '@/stores/auth.store'
import { getBookingPickupPass } from '@/services/api/generated/booking-service/booking-pickup-controller/booking-pickup-controller'
import { BookingPickupPassResponseStatus } from '@/services/api/generated/booking-service/model/bookingPickupPassResponseStatus'
import { BookingPickupPassResponseBookingStatus } from '@/services/api/generated/booking-service/model/bookingPickupPassResponseBookingStatus'
import type { BookingPickupPassResponse } from '@/services/api/generated/booking-service/model/bookingPickupPassResponse'
import { customerBookingId, type CustomerBooking } from './customer-bookings'
import { formatBookingReference } from '../mappers/booking-reference.mapper'

// Validate the transport credential, render locally, then discard the raw payload.
const passSchema = z.object({
  bookingId: customerBookingId,
  displayCode: z.string().regex(/^[0-9A-F]{6}$/),
  bookingStatus: z.nativeEnum(BookingPickupPassResponseBookingStatus),
  status: z.nativeEnum(BookingPickupPassResponseStatus),
  expectedTickets: z.number().int().nonnegative(),
  issuedTickets: z.number().int().nonnegative(),
  expiresAt: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)))
    .nullish()
    .transform((value) => value ?? undefined),
  qrPayload: z
    .string()
    .regex(/^cinema-booking:v1:[A-Za-z0-9_-]{43}$/)
    .nullish()
    .transform((value) => value ?? undefined),
})

export function useCustomerPickupQuery(booking: MaybeRefOrGetter<CustomerBooking>) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(
      () => ['customer-bookings', auth.subject, 'pickup', toValue(booking).id] as const,
    ),
    enabled: computed(
      () =>
        auth.isAuthenticated &&
        !!auth.subject &&
        toValue(booking).userId === auth.subject &&
        toValue(booking).status === 'CONFIRMED',
    ),
    queryFn: async ({ queryKey }) => {
      const snapshot = toValue(booking)
      const owner = queryKey[1]
      if (
        !auth.isAuthenticated ||
        !owner ||
        auth.subject !== owner ||
        snapshot.id !== queryKey[3] ||
        snapshot.userId !== owner ||
        snapshot.status !== 'CONFIRMED'
      )
        throw new Error('Booking session changed')
      const response = await getBookingPickupPass(queryKey[3])
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      const parsed = z.object({ success: z.literal(true), data: passSchema }).safeParse(response)
      if (!parsed.success) throw new Error('Invalid booking pickup response')
      const { qrPayload, ...pass } = parsed.data.data satisfies BookingPickupPassResponse
      if (
        pass.bookingId !== queryKey[3] ||
        pass.displayCode !== formatBookingReference(queryKey[3]) ||
        (pass.status === 'READY' &&
          (pass.bookingStatus !== 'CONFIRMED' ||
            pass.expectedTickets === 0 ||
            pass.issuedTickets !== pass.expectedTickets ||
            !pass.expiresAt ||
            !qrPayload))
      )
        throw new Error('Booking pickup mismatch')
      let qrImage: string | undefined
      if (
        pass.status === 'READY' &&
        qrPayload &&
        pass.expiresAt &&
        Date.parse(pass.expiresAt) > Date.now()
      ) {
        try {
          // Keep the standard quiet zone and black/white contrast for scanning.
          qrImage = await toDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 4, scale: 8 })
        } catch {
          throw new Error('Could not render booking pickup QR')
        }
      }
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      return { ...pass, qrImage }
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      !query.state.error && query.state.data?.status === 'WAITING_FOR_TICKETS' ? 3_000 : false,
  })
}
