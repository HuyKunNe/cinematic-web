import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { getBookingTickets } from '@/services/api/generated/booking-service/booking-ticket-controller/booking-ticket-controller'
import type { TicketResponse } from '@/services/api/generated/booking-service/model/ticketResponse'
import { customerBookingId, type CustomerBooking } from './customer-bookings'

// Validate only fields used by this view. Do not retain the QR credential in query data.
const ticketSchema = z.object({
  id: z.string().uuid(),
  bookingId: customerBookingId,
  bookingSeatId: z.string().uuid(),
  seatNumber: z.string().min(1),
  capacity: z.number().int().positive(),
  status: z.string().min(1),
  checkedInAt: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)))
    .nullish()
    .transform((value) => value ?? null),
})
const ISSUANCE_REFRESH_INTERVAL_MS = 3_000

export function useCustomerTicketsQuery(booking: MaybeRefOrGetter<CustomerBooking>) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(
      () => ['customer-bookings', auth.subject, 'tickets', toValue(booking).id] as const,
    ),
    enabled: computed(
      () =>
        auth.isAuthenticated &&
        !!auth.subject &&
        toValue(booking).userId === auth.subject &&
        toValue(booking).status === 'CONFIRMED',
    ),
    queryFn: async ({ queryKey }) => {
      const owner = queryKey[1]
      const snapshot = toValue(booking)
      if (!auth.isAuthenticated || !owner || auth.subject !== owner)
        throw new Error('Session changed')
      if (
        snapshot.id !== queryKey[3] ||
        snapshot.userId !== owner ||
        snapshot.status !== 'CONFIRMED'
      )
        throw new Error('Booking changed')
      const response = await getBookingTickets(queryKey[3])
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      const tickets = z
        .object({ success: z.literal(true), data: z.array(ticketSchema) })
        .parse(response).data satisfies TicketResponse[]
      if (
        tickets.some((ticket) => ticket.bookingId !== queryKey[3]) ||
        new Set(tickets.map((ticket) => ticket.id)).size !== tickets.length ||
        new Set(tickets.map((ticket) => ticket.bookingSeatId)).size !== tickets.length ||
        new Set(tickets.map((ticket) => ticket.seatNumber)).size !== tickets.length ||
        (snapshot.seatCount != null && tickets.length > snapshot.seatCount)
      )
        throw new Error('Ticket booking mismatch')
      if (snapshot.seats) {
        const seatsById = new Map(snapshot.seats.map((seat) => [seat.id, seat]))
        if (
          tickets.some((ticket) => {
            const seat = seatsById.get(ticket.bookingSeatId)
            return (
              !seat ||
              seat.seatNumber !== ticket.seatNumber ||
              (seat.capacity != null && seat.capacity !== ticket.capacity)
            )
          })
        )
          throw new Error('Ticket seat mismatch')
      }
      return tickets
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      const snapshot = toValue(booking)
      const expected = snapshot.seatCount ?? snapshot.seats?.length
      const returned = query.state.data
      return auth.isAuthenticated &&
        snapshot.userId === auth.subject &&
        snapshot.status === 'CONFIRMED' &&
        !query.state.error &&
        expected != null &&
        expected > 0 &&
        returned !== undefined &&
        returned.length < expected
        ? ISSUANCE_REFRESH_INTERVAL_MS
        : false
    },
  })
}
