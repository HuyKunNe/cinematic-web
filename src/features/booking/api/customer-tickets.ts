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
})

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
      if (!auth.isAuthenticated || !owner || auth.subject !== owner)
        throw new Error('Session changed')
      const response = await getBookingTickets(queryKey[3])
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      const tickets = z
        .object({ success: z.literal(true), data: z.array(ticketSchema) })
        .parse(response).data satisfies TicketResponse[]
      if (
        tickets.some((ticket) => ticket.bookingId !== queryKey[3]) ||
        new Set(tickets.map((ticket) => ticket.id)).size !== tickets.length ||
        new Set(tickets.map((ticket) => ticket.bookingSeatId)).size !== tickets.length
      )
        throw new Error('Ticket booking mismatch')
      return tickets
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  })
}
