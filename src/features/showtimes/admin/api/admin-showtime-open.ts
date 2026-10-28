import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  getShowtimeById,
  openShowtimeForBooking,
} from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { adminShowtimeSchema } from '../schemas/admin-showtime.schema'

const uuid = z.string().uuid()

const openingDetailSchema = adminShowtimeSchema.and(
  z
    .object({
      version: z.number().int().nonnegative(),
      pricingPolicyId: uuid.nullish().transform((value) => value ?? undefined),
      pricingPolicyVersionId: uuid.nullish().transform((value) => value ?? undefined),
    })
    .refine(
      (value) =>
        (value.pricingPolicyId === undefined) === (value.pricingPolicyVersionId === undefined),
      'Thông tin bảng giá của suất chiếu chưa nhất quán.',
    ),
)

export type ShowtimeOpeningDetail = z.infer<typeof openingDetailSchema>

function parseShowtime(response: unknown, showtimeId: string): ShowtimeOpeningDetail {
  const result = openingDetailSchema.parse(response)

  if (result.id !== showtimeId) {
    throw new Error('Dữ liệu phản hồi không thuộc suất chiếu đang mở.')
  }

  return result
}

function contextKey(value: ShowtimeOpeningDetail): string {
  return JSON.stringify({
    id: value.id,
    movieId: value.movieId,
    cinemaId: value.cinemaId,
    roomId: value.roomId,
    roomLayoutId: value.roomLayoutId ?? null,
    startsAt: Date.parse(value.startsAt),
    endsAt: Date.parse(value.endsAt),
    pricingPolicyId: value.pricingPolicyId ?? null,
    pricingPolicyVersionId: value.pricingPolicyVersionId ?? null,
    screeningVersion: value.screeningVersion ?? null,
    scheduling: value.scheduling
      ? {
          movieRevision: value.scheduling.movieRevision,
          durationMinutes: value.scheduling.durationMinutes,
          breakMinutes: value.scheduling.breakMinutes,
          readyAt: Date.parse(value.scheduling.readyAt),
        }
      : null,
  })
}

function requireOpeningContext(value: ShowtimeOpeningDetail): void {
  if (value.status !== 'SCHEDULED') {
    throw new Error('Chỉ suất ở trạng thái “Đã lên lịch” mới có thể mở bán.')
  }

  if (!value.pricingPolicyId || !value.pricingPolicyVersionId) {
    throw new Error('Cần gán bảng giá đã công bố trước khi mở bán.')
  }

  if (!value.screeningVersion) {
    throw new Error('Suất chưa có phiên bản chiếu hợp lệ để áp dụng bảng giá.')
  }

  if (Date.parse(value.startsAt) <= Date.now()) {
    throw new Error('Suất đã đến giờ bắt đầu hoặc đã qua giờ chiếu. Hãy tải lại để kiểm tra.')
  }
}

function errorStatus(error: unknown): number | null {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : null
}

function errorCode(error: unknown): string | null {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : null
}

export function showtimeOpeningErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Chưa xác nhận được dữ liệu phản hồi. Hãy tải lại để kiểm tra trạng thái suất chiếu.'
  }

  const messages: Record<string, string> = {
    INVENTORY_SHOWTIME_NOT_EDITABLE:
      'Trạng thái hoặc giờ bắt đầu của suất không còn cho phép mở bán. Hãy tải lại.',
    INVENTORY_SHOWTIME_PRICING_REQUIRED: 'Cần gán bảng giá đã công bố trước khi mở bán.',
    INVENTORY_PRICING_POLICY_VERSION_NOT_PUBLISHED:
      'Bảng giá đang gán không còn ở trạng thái đã công bố.',
    INVENTORY_PRICING_FARE_NOT_APPLICABLE:
      'Bảng giá không có giá áp dụng cho giờ chiếu, loại phòng, định dạng hoặc hạng ghế của suất này.',
    INVENTORY_PRICING_POLICY_DATA_INCONSISTENT:
      'Dữ liệu bảng giá chưa nhất quán. Cần kiểm tra bảng giá trước khi mở bán.',
    INVENTORY_SHOWTIME_PRICING_CONTEXT_REQUIRED:
      'Suất cần có loại phòng và phiên bản chiếu hợp lệ để áp dụng giá.',
    INVENTORY_SHOWTIME_PRICING_GENERATION_LOCKED:
      'Dữ liệu ghế của suất chiếu chưa sẵn sàng để áp dụng giá.',
    INVENTORY_ROOM_INACTIVE: 'Phòng đã ngừng hoạt động nên không thể mở bán.',
    INVENTORY_CINEMA_INACTIVE: 'Cụm rạp đã ngừng hoạt động nên không thể mở bán.',
    INVENTORY_NO_ACTIVE_SEATS: 'Phòng chưa có ghế hoạt động hợp lệ để mở bán.',
    INVENTORY_SEAT_MAP_DATA_INCONSISTENT: 'Dữ liệu ghế chưa khớp sơ đồ của suất chiếu.',
    INVENTORY_HELD_SHOW_SEAT_CANNOT_BE_CHANGED:
      'Suất đang có ghế được giữ nên chưa thể cập nhật giá để mở bán.',
    INVENTORY_BOOKED_SHOW_SEAT_CANNOT_BE_CHANGED:
      'Suất đã có ghế được đặt nên chưa thể cập nhật giá để mở bán.',
  }

  const code = errorCode(error)
  const message = code ? messages[code] : undefined
  if (message) return message

  const status = errorStatus(error)
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền quản lý suất chiếu.'
  if (status === 404) return 'Không tìm thấy suất chiếu hoặc cấu hình liên quan.'
  if (status === 409) return 'Dữ liệu đã thay đổi hoặc chưa đủ điều kiện mở bán. Hãy tải lại.'

  if (error instanceof Error) return error.message

  return 'Chưa xác định được kết quả mở bán. Hãy tải lại để kiểm tra trước khi thao tác tiếp.'
}

export function useAdminShowtimeOpening(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()

  function requireAccess(): void {
    if (!toValue(enabled)) {
      throw new Error('Bạn không có quyền quản lý suất chiếu.')
    }
  }

  async function load(showtimeId: string): Promise<ShowtimeOpeningDetail> {
    requireAccess()
    const id = uuid.parse(showtimeId)

    return queryClient.fetchQuery({
      queryKey: ['showtimes', 'admin', 'opening-review', id],
      staleTime: 0,
      retry: false,
      queryFn: async () => {
        requireAccess()
        return parseShowtime(await getShowtimeById(id), id)
      },
    })
  }

  const open = useMutation({
    retry: false,
    mutationFn: async (reviewed: ShowtimeOpeningDetail) => {
      requireAccess()
      requireOpeningContext(reviewed)

      const fresh = await load(reviewed.id)

      if (
        fresh.version !== reviewed.version ||
        fresh.status !== reviewed.status ||
        contextKey(fresh) !== contextKey(reviewed)
      ) {
        throw new Error(
          'Thông tin suất chiếu đã thay đổi sau khi bạn mở hộp thoại. Hãy tải lại và kiểm tra.',
        )
      }

      requireOpeningContext(fresh)
      requireAccess()

      const result = parseShowtime(await openShowtimeForBooking(fresh.id), fresh.id)

      if (
        result.status !== 'OPEN_FOR_BOOKING' ||
        result.version < fresh.version ||
        contextKey(result) !== contextKey(fresh)
      ) {
        throw new Error(
          'Chưa xác nhận được kết quả mở bán theo thông tin đã kiểm tra. Hãy tải lại trạng thái suất.',
        )
      }

      return result
    },
    onSuccess: () => {
      void queryClient
        .invalidateQueries({
          predicate: ({ queryKey }) =>
            ['showtimes', 'booking', 'home', 'cinemas'].includes(String(queryKey[0])),
          refetchType: 'none',
        })
        .catch(() => undefined)
    },
  })

  return { load, open }
}
