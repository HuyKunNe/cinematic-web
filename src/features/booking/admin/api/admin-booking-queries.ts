import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { listBookingsForAdmin } from '@/services/api/generated/booking-service/booking-management/booking-management'
import { BookingResponseStatus } from '@/services/api/generated/booking-service/model/bookingResponseStatus'
import type { ListBookingsForAdminParams } from '@/services/api/generated/booking-service/model/listBookingsForAdminParams'

export const ADMIN_BOOKING_PAGE_SIZE = 20

export type AdminBookingStatusFilter = BookingResponseStatus | ''

export const adminBookingStatusLabels: Record<BookingResponseStatus, string> = {
  PENDING: 'Đang xử lý',
  RESERVED: 'Đã giữ ghế',
  REJECTED: 'Bị từ chối',
  CONFIRMED: 'Đã xác nhận',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

const counter = z.number().int().nonnegative()

const bookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  showtimeId: z.string().uuid(),
  status: z.nativeEnum(BookingResponseStatus),
  createdAt: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value))),
  totalAmount: z
    .number()
    .finite()
    .nonnegative()
    .nullish()
    .transform((value) => value ?? null),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullish()
    .transform((value) => value ?? null),
  seatCount: counter.nullable(),
  capacity: counter.nullable(),
  seats: z
    .array(
      z.object({
        seatNumber: z.string().trim().min(1),
      }),
    )
    .nullish()
    .transform((value) => value ?? null),
})

const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    content: z.array(bookingSchema),
    page: z.object({
      page: counter,
      size: z.number().int().min(1).max(100),
      totalElements: counter,
      totalPages: counter,
      first: z.boolean(),
      last: z.boolean(),
    }),
  }),
})

export type AdminBookingListItem = z.infer<typeof bookingSchema>

export function adminBookingErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu danh sách đơn chưa đúng contract. Vui lòng thử tải lại.'
  }

  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : null

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Chỉ quản trị viên ADMIN được tra cứu danh sách đơn.'
  if (status === 400 || status === 422) {
    return 'Thông tin lọc hoặc phân trang chưa hợp lệ.'
  }

  if (error instanceof Error) return error.message

  return 'Không thể tải danh sách đơn. Vui lòng thử lại.'
}

export function useAdminBookingsQuery(
  enabled: MaybeRefOrGetter<boolean>,
  subject: MaybeRefOrGetter<string>,
  status: MaybeRefOrGetter<AdminBookingStatusFilter>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(
      () =>
        [
          'bookings',
          'admin',
          'list',
          toValue(subject),
          toValue(status),
          toValue(page),
          ADMIN_BOOKING_PAGE_SIZE,
        ] as const,
    ),
    enabled: computed(
      () => toValue(enabled) && toValue(subject).trim() !== '',
    ),
    queryFn: async ({ queryKey }) => {
      if (
        !toValue(enabled) ||
        queryKey[3] === '' ||
        queryKey[3] !== toValue(subject)
      ) {
        throw new Error('Bạn không có quyền tải danh sách đơn.')
      }

      const requestedPage = counter.parse(queryKey[5])
      const requestedStatus =
        queryKey[4] === ''
          ? undefined
          : z.nativeEnum(BookingResponseStatus).parse(queryKey[4])

      const request = {
        page: requestedPage,
        size: ADMIN_BOOKING_PAGE_SIZE,
        ...(requestedStatus ? { status: requestedStatus } : {}),
      } satisfies ListBookingsForAdminParams

      const result = responseSchema.parse(
        await listBookingsForAdmin(request),
      ).data

      if (
        result.page.page !== requestedPage ||
        result.page.size !== ADMIN_BOOKING_PAGE_SIZE ||
        result.content.length > result.page.size ||
        new Set(result.content.map((item) => item.id)).size !==
          result.content.length ||
        result.content.some(
          (item) =>
            (requestedStatus !== undefined && item.status !== requestedStatus) ||
            (item.seats !== null &&
              item.seatCount !== null &&
              item.seatCount !== item.seats.length),
        )
      ) {
        throw new Error(
          'Danh sách phản hồi không khớp bộ lọc hoặc trang đang yêu cầu.',
        )
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
}