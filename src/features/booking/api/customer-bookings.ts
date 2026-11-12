import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import {
  createBooking,
  cancelBooking,
  findAllBookings,
  findById,
} from '@/services/api/generated/booking-service/booking-controller/booking-controller'
import type { CreateBookingRequest } from '@/services/api/generated/booking-service/model/createBookingRequest'
import { BookingResponseStatus } from '@/services/api/generated/booking-service/model/bookingResponseStatus'

const uuid = z.string().uuid()
export const customerBookingId = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)))
const money = z
  .number()
  .finite()
  .nonnegative()
  .nullish()
  .transform((value) => value ?? null)
const nullableTime = timestamp.nullish().transform((value) => value ?? null)
// Runtime validation of the generated BookingResponse contract, not a replacement DTO.
const bookingSchema = z.object({
  id: customerBookingId,
  userId: uuid,
  showtimeId: uuid,
  clientRequestId: z.string(),
  status: z.nativeEnum(BookingResponseStatus),
  totalAmount: money,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullish()
    .transform((value) => value ?? null),
  createdAt: timestamp,
  updatedAt: timestamp,
  expiresAt: timestamp,
  confirmedAt: nullableTime,
  cancelledAt: nullableTime,
  rejectionReason: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  seatCount: z.number().int().nonnegative().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  seats: z
    .array(
      z.object({
        id: uuid,
        showtimeId: uuid,
        seatNumber: z.string().min(1),
        seatType: z.string().nullish(),
        price: money,
        ticketGroupName: z.string().nullish(),
        capacity: z.number().int().positive().nullish(),
        unit: z.enum(['SEAT', 'PAIR']).nullish(),
      }),
    )
    .nullish()
    .transform((value) => value ?? null),
})
const envelope = z.object({ success: z.literal(true), data: bookingSchema })
export type CustomerBooking = z.infer<typeof bookingSchema>
export const customerBookingLabels: Record<BookingResponseStatus, string> = {
  PENDING: 'Đang xử lý',
  RESERVED: 'Đã giữ ghế',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Bị từ chối',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}
export function customerBookingError(cause: unknown): string {
  const error = cause as { status?: number; code?: string }
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (error?.status === 403 || error?.status === 404)
    return 'Không tìm thấy đơn đặt vé thuộc tài khoản của bạn.'
  if (error?.code === 'BOOKING_TOO_MANY_SEATS')
    return 'Số ghế vượt giới hạn đặt vé. Vui lòng chọn ít ghế hơn.'
  if (error?.status === 409)
    return 'Ghế, giá vé hoặc trạng thái đơn đã thay đổi. Vui lòng tải lại để kiểm tra.'
  if (cause instanceof z.ZodError) return 'Thông tin đơn trả về chưa hợp lệ. Vui lòng tải lại.'
  return 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.'
}
function readBooking(response: unknown, owner: string, id?: string) {
  const booking = envelope.parse(response).data
  if (
    booking.userId !== owner ||
    (id && booking.id !== id) ||
    (booking.seats &&
      (booking.seatCount !== booking.seats.length ||
        new Set(booking.seats.map((seat) => seat.id)).size !== booking.seats.length ||
        booking.seats.some((seat) => seat.showtimeId !== booking.showtimeId)))
  ) {
    throw new Error('Booking response identity mismatch')
  }
  return booking
}
export async function submitCustomerBooking(request: CreateBookingRequest, owner: string) {
  const booking = readBooking(await createBooking(request), owner)
  if (
    booking.showtimeId !== request.showtimeId ||
    booking.clientRequestId !== request.clientRequestId
  )
    throw new Error('Booking request mismatch')
  return booking
}
export async function cancelCustomerBooking(id: string, owner: string) {
  const booking = readBooking(await cancelBooking(customerBookingId.parse(id)), owner, id)
  if (booking.status !== 'CANCELLED') throw new Error('Cancellation not confirmed')
  return booking
}
export function useCustomerBookingQuery(id: MaybeRefOrGetter<string>) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['customer-bookings', auth.subject, 'detail', toValue(id)] as const),
    enabled: computed(
      () =>
        auth.isAuthenticated && !!auth.subject && customerBookingId.safeParse(toValue(id)).success,
    ),
    queryFn: async ({ queryKey }) => {
      if (!auth.isAuthenticated || auth.subject !== queryKey[1]) throw new Error('Session changed')
      const booking = readBooking(await findById(queryKey[3]), queryKey[1]!, queryKey[3])
      if (!auth.isAuthenticated || auth.subject !== queryKey[1]) throw new Error('Session changed')
      return booking
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      !query.state.error && ['PENDING', 'RESERVED'].includes(query.state.data?.status ?? '')
        ? 3000
        : false,
  })
}
export function useCustomerBookingsQuery(
  page: MaybeRefOrGetter<number>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['customer-bookings', auth.subject, 'list', toValue(page)] as const),
    enabled: computed(() => auth.isAuthenticated && !!auth.subject && toValue(enabled)),
    queryFn: async ({ queryKey }) => {
      if (!auth.isAuthenticated || auth.subject !== queryKey[1]) throw new Error('Session changed')
      const response = z
        .object({
          success: z.literal(true),
          data: z.object({
            content: z.array(bookingSchema),
            page: z.object({
              page: z.number().int().nonnegative(),
              size: z.number().int().positive(),
              totalPages: z.number().int().nonnegative(),
              totalElements: z.number().int().nonnegative(),
              last: z.boolean(),
            }),
          }),
        })
        .parse(await findAllBookings({ page: queryKey[3], size: 10 })).data
      if (
        !auth.isAuthenticated ||
        auth.subject !== queryKey[1] ||
        response.page.page !== queryKey[3] ||
        response.content.some((booking) => booking.userId !== queryKey[1])
      )
        throw new Error('Booking list mismatch')
      return response
    },
    retry: false,
    staleTime: 0,
  })
}
