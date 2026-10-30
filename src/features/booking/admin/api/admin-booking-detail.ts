import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { APP_ROLES } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { getBookingForAdmin } from '@/services/api/generated/booking-service/booking-management/booking-management'
import { BookingResponseStatus } from '@/services/api/generated/booking-service/model/bookingResponseStatus'
import { BookingSeatResponseUnit } from '@/services/api/generated/booking-service/model/bookingSeatResponseUnit'

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const bookingIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

const counter = z.number().int().nonnegative()

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)))

const nullableText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)

const nullableMoney = z
  .number()
  .finite()
  .nonnegative()
  .nullish()
  .transform((value) => value ?? null)

const seatSchema = z.object({
  id: uuid,
  showtimeId: uuid,
  seatNumber: z.string().trim().min(1),
  seatType: nullableText,
  price: nullableMoney,
  ticketGroupId: uuid.nullable(),
  ticketGroupName: nullableText,
  capacity: z.number().int().positive().nullable(),
  unit: z.nativeEnum(BookingSeatResponseUnit).nullable(),
})

const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: uuid,
    userId: uuid,
    showtimeId: uuid,
    status: z.nativeEnum(BookingResponseStatus),
    totalAmount: nullableMoney,
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullish()
      .transform((value) => value ?? null),
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: timestamp,
    confirmedAt: timestamp.nullish().transform((value) => value ?? null),
    cancelledAt: timestamp.nullish().transform((value) => value ?? null),
    rejectionReason: nullableText,
    seatCount: counter.nullable(),
    capacity: counter.nullable(),
    seats: z
      .array(seatSchema)
      .nullish()
      .transform((value) => value ?? null),
  }),
})

export type AdminBookingDetailSeat = z.infer<typeof seatSchema>

export const adminBookingDetailStatusLabels: Record<BookingResponseStatus, string> = {
  PENDING: 'Đang xử lý',
  RESERVED: 'Đã giữ ghế',
  REJECTED: 'Bị từ chối',
  CONFIRMED: 'Đã xác nhận',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

export function adminBookingDetailErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu chi tiết đơn chưa đúng contract. Vui lòng tải lại.'
  }

  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : null

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Chỉ quản trị viên ADMIN được xem chi tiết đơn.'
  if (status === 404) return 'Không tìm thấy đơn đặt vé.'
  if (status === 400 || status === 422) return 'Mã đơn chưa hợp lệ.'

  if (error instanceof Error) return error.message

  return 'Không thể tải chi tiết đơn. Vui lòng thử lại.'
}

export function useAdminBookingDetailQuery(bookingId: MaybeRefOrGetter<string>) {
  const auth = useAuthStore()

  const canView = computed(() => auth.isAuthenticated && auth.hasRole(APP_ROLES.ADMIN))

  const requestedId = computed(() => toValue(bookingId).trim().toLowerCase())

  const validId = computed(() => bookingIdSchema.safeParse(requestedId.value).success)

  const query = useQuery({
    queryKey: computed(
      () => ['bookings', 'admin', 'detail', auth.subject ?? '', requestedId.value] as const,
    ),
    enabled: computed(() => canView.value && validId.value && Boolean(auth.subject)),
    queryFn: async ({ queryKey }) => {
      if (!canView.value || !queryKey[3] || queryKey[3] !== auth.subject) {
        throw new Error('Bạn không có quyền tải chi tiết đơn.')
      }

      const id = bookingIdSchema.parse(queryKey[4])
      const result = responseSchema.parse(await getBookingForAdmin(id)).data
      const seats = result.seats

      if (
        result.id.toLowerCase() !== id ||
        result.seatCount !== (seats === null ? null : seats.length) ||
        (seats !== null &&
          (new Set(seats.map((seat) => seat.id)).size !== seats.length ||
            seats.some(
              (seat) => seat.showtimeId.toLowerCase() !== result.showtimeId.toLowerCase(),
            )))
      ) {
        throw new Error('Dữ liệu phản hồi không khớp đơn đang xem.')
      }

      return result
    },
    placeholderData: () => undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  return { canView, validId, query }
}
