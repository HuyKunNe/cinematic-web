import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { getShowtimeById } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { replaceShowtimePricing } from '@/services/api/generated/inventory-service/showtime-pricing-controller/showtime-pricing-controller'
import {
  listLatestCinemaPricingPolicies,
  listCinemaPricingPolicyVersions,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { CinemaPricingPolicyVersionResponseDayGroup } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyVersionResponseDayGroup'
import { CinemaPricingPolicyVersionResponseStatus } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyVersionResponseStatus'
import type { ReplaceShowtimePricingRequest } from '@/services/api/generated/inventory-service/model/replaceShowtimePricingRequest'
import { adminShowtimeSchema } from '../schemas/admin-showtime.schema'

const uuid = z.string().uuid()
const counter = z.number().int().nonnegative()

const pricingShowtimeSchema = adminShowtimeSchema.and(
  z
    .object({
      version: counter,
      pricingPolicyId: uuid.nullish().transform((value) => value ?? undefined),
      pricingPolicyVersionId: uuid.nullish().transform((value) => value ?? undefined),
    })
    .refine(
      (value) =>
        (value.pricingPolicyId === undefined) === (value.pricingPolicyVersionId === undefined),
      'Thông tin bảng giá đang gán cho suất chiếu chưa nhất quán.',
    ),
)

const pricingVersionSchema = z.object({
  id: uuid,
  policyId: uuid,
  cinemaIds: z.array(uuid).min(1),
  revision: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  dayGroup: z.nativeEnum(CinemaPricingPolicyVersionResponseDayGroup),
  status: z.nativeEnum(CinemaPricingPolicyVersionResponseStatus),
})

export type ShowtimePricingDetail = z.infer<typeof pricingShowtimeSchema>
export type ShowtimePricingVersion = z.infer<typeof pricingVersionSchema>

export type ShowtimePricingEditorData = {
  showtime: ShowtimePricingDetail
  versions: ShowtimePricingVersion[]
}

const dayGroupLabels: Record<CinemaPricingPolicyVersionResponseDayGroup, string> = {
  WEEKDAY: 'Ngày thường',
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Lễ/Tết',
}

export function showtimePricingVersionLabel(version: ShowtimePricingVersion): string {
  return [version.name, dayGroupLabels[version.dayGroup], `Phiên bản ${version.revision}`].join(
    ' · ',
  )
}

export function showtimePricingErrorStatus(error: unknown): number | null {
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

export function showtimePricingErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Chưa xác nhận được dữ liệu phản hồi. Hãy tải lại trước khi tiếp tục.'
  }

  const messages: Record<string, string> = {
    INVENTORY_SHOWTIME_VERSION_CONFLICT:
      'Suất chiếu đã thay đổi. Hãy tải lại và kiểm tra trước khi lưu tiếp.',
    INVENTORY_SHOWTIME_NOT_EDITABLE:
      'Chỉ suất ở trạng thái “Đã lên lịch” mới được thay đổi bảng giá.',
    INVENTORY_PRICING_POLICY_VERSION_NOT_PUBLISHED:
      'Phiên bản bảng giá không còn ở trạng thái đã công bố. Hãy tải lại lựa chọn.',
    INVENTORY_PRICING_POLICY_VERSION_NOT_FOUND:
      'Không tìm thấy phiên bản bảng giá phù hợp với cụm rạp của suất chiếu.',
    INVENTORY_PRICING_FARE_NOT_APPLICABLE:
      'Bảng giá không có giá áp dụng cho giờ chiếu, loại phòng, định dạng hoặc hạng ghế của suất này.',
    INVENTORY_PRICING_POLICY_DATA_INCONSISTENT:
      'Dữ liệu bảng giá chưa nhất quán. Cần kiểm tra bảng giá trước khi gán.',
    INVENTORY_SHOWTIME_PRICING_CONTEXT_REQUIRED:
      'Suất chiếu cần có loại phòng và phiên bản chiếu hợp lệ để áp dụng bảng giá.',
    INVENTORY_SHOWTIME_PRICING_GENERATION_LOCKED:
      'Dữ liệu ghế của suất chiếu chưa sẵn sàng để áp dụng bảng giá.',
    INVENTORY_HELD_SHOW_SEAT_CANNOT_BE_CHANGED:
      'Suất chiếu đang có ghế được giữ. Chưa thể thay đổi bảng giá.',
    INVENTORY_BOOKED_SHOW_SEAT_CANNOT_BE_CHANGED:
      'Suất chiếu đã có ghế được đặt. Chưa thể thay đổi bảng giá.',
    INVENTORY_NO_ACTIVE_SEATS: 'Phòng chưa có ghế hoạt động hợp lệ. Cần kiểm tra cấu hình phòng.',
    INVENTORY_INVALID_SHOWTIME_PRICING: 'Thông tin gán bảng giá chưa hợp lệ.',
  }

  const code = errorCode(error)
  if (code && messages[code]) return messages[code]

  const status = showtimePricingErrorStatus(error)
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có đủ quyền quản lý suất chiếu và bảng giá.'
  if (status === 404) return 'Không tìm thấy suất chiếu hoặc bảng giá được chọn.'
  if (status === 409) return 'Dữ liệu đã thay đổi hoặc chưa cho phép thao tác. Hãy tải lại.'
  if (status === 400 || status === 422) return 'Kiểm tra thông tin bảng giá trước khi lưu.'

  if (error instanceof Error) return error.message

  return 'Chưa xác định được kết quả yêu cầu. Hãy tải lại để kiểm tra.'
}

export function showtimePricingNeedsReload(error: unknown): boolean {
  const status = showtimePricingErrorStatus(error)
  return status === null || (status !== 400 && status !== 422)
}

function parseShowtime(response: unknown, requestedId: string): ShowtimePricingDetail {
  const result = pricingShowtimeSchema.parse(response)

  if (result.id !== requestedId) {
    throw new Error('Dữ liệu phản hồi không thuộc suất chiếu đang mở.')
  }

  return result
}

function parseVersions(
  response: unknown,
  cinemaId: string,
  policyId?: string,
): ShowtimePricingVersion[] {
  const items = z.array(pricingVersionSchema).parse(response)

  if (
    items.some(
      (item) =>
        !item.cinemaIds.includes(cinemaId) ||
        (policyId !== undefined && item.policyId !== policyId),
    )
  ) {
    throw new Error('Danh sách bảng giá không thuộc cụm rạp đang xem.')
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách phiên bản bảng giá chứa mã trùng.')
  }

  return items
}

export function useAdminShowtimePricing(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()

  function requireAccess(): void {
    if (!toValue(enabled)) {
      throw new Error('Bạn không có đủ quyền quản lý suất chiếu và bảng giá.')
    }
  }

  async function load(showtimeId: string): Promise<ShowtimePricingEditorData> {
    requireAccess()
    const requestedId = uuid.parse(showtimeId)

    return queryClient.fetchQuery({
      queryKey: ['showtimes', 'admin', 'pricing-editor', requestedId],
      staleTime: 0,
      retry: false,
      queryFn: async () => {
        requireAccess()

        const showtime = parseShowtime(await getShowtimeById(requestedId), requestedId)

        requireAccess()

        const latest = parseVersions(
          await listLatestCinemaPricingPolicies(showtime.cinemaId),
          showtime.cinemaId,
        )

        if (new Set(latest.map((item) => item.policyId)).size !== latest.length) {
          throw new Error('Danh sách bảng giá chứa chính sách trùng.')
        }

        const groups = await Promise.all(
          latest.map(async (policy) => {
            requireAccess()

            return parseVersions(
              await listCinemaPricingPolicyVersions(showtime.cinemaId, policy.policyId),
              showtime.cinemaId,
              policy.policyId,
            )
          }),
        )

        const versions = groups.flat()

        if (new Set(versions.map((item) => item.id)).size !== versions.length) {
          throw new Error('Danh sách phiên bản bảng giá chứa mã trùng.')
        }

        versions.sort(
          (first, second) =>
            first.name.localeCompare(second.name, 'vi-VN') ||
            second.revision - first.revision ||
            first.id.localeCompare(second.id),
        )

        return { showtime, versions }
      },
    })
  }

  const save = useMutation({
    retry: false,
    mutationFn: async (input: {
      current: ShowtimePricingDetail
      selection: ShowtimePricingVersion | null
    }) => {
      requireAccess()

      const current = input.current
      const selected = input.selection
      const showtimeId = uuid.parse(current.id)

      if (current.status !== 'SCHEDULED') {
        throw new Error('Chỉ suất đã lên lịch mới được thay đổi bảng giá.')
      }

      if (
        selected &&
        (selected.status !== 'PUBLISHED' || !selected.cinemaIds.includes(current.cinemaId))
      ) {
        throw new Error('Chọn phiên bản bảng giá đã công bố cho đúng cụm rạp.')
      }

      const request = {
        expectedVersion: counter.parse(current.version),
        ...(selected ? { pricingPolicyVersionId: uuid.parse(selected.id) } : {}),
      } satisfies ReplaceShowtimePricingRequest

      const result = parseShowtime(await replaceShowtimePricing(showtimeId, request), showtimeId)

      if (
        result.status !== 'SCHEDULED' ||
        result.version < current.version ||
        result.cinemaId !== current.cinemaId ||
        result.roomId !== current.roomId ||
        result.movieId !== current.movieId ||
        result.screeningVersion?.id !== current.screeningVersion?.id ||
        (result.roomLayoutId ?? null) !== (current.roomLayoutId ?? null) ||
        Date.parse(result.startsAt) !== Date.parse(current.startsAt) ||
        Date.parse(result.endsAt) !== Date.parse(current.endsAt) ||
        result.pricingPolicyId !== selected?.policyId ||
        result.pricingPolicyVersionId !== selected?.id
      ) {
        throw new Error('Chưa xác nhận được kết quả gán bảng giá. Hãy tải lại để kiểm tra.')
      }

      return result
    },
    onSuccess: () => {
      void queryClient
        .invalidateQueries({
          predicate: ({ queryKey }) =>
            ['showtimes', 'booking', 'home'].includes(String(queryKey[0])),
          refetchType: 'none',
        })
        .catch(() => undefined)
    },
  })

  return { load, save }
}
