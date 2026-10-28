import { z } from 'zod'
import { ShowtimeResponseStatus } from '@/services/api/generated/inventory-service/model/showtimeResponseStatus'
import { ShowtimeScreeningVersionResponseContentFormat } from '@/services/api/generated/inventory-service/model/showtimeScreeningVersionResponseContentFormat'
import { ShowtimeScreeningVersionResponsePresentationType } from '@/services/api/generated/inventory-service/model/showtimeScreeningVersionResponsePresentationType'

export const showtimeStatusLabels: Record<ShowtimeResponseStatus, string> = {
  SCHEDULED: 'Đã lên lịch',
  OPEN_FOR_BOOKING: 'Đang mở bán',
  CLOSED: 'Đã đóng bán',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn tất',
}

export const showtimeStatusOptions = Object.entries(showtimeStatusLabels).map(([value, label]) => ({
  value,
  label,
}))

export const showtimePresentationLabels: Record<
  ShowtimeScreeningVersionResponsePresentationType,
  string
> = {
  SUBTITLED: 'Phụ đề',
  DUBBED: 'Lồng tiếng',
  NO_SUBTITLES: 'Không phụ đề',
}

const uuid = z.string().uuid()
const timestamp = z.string().datetime({ offset: true })

const screeningVersionSchema = z.object({
  id: uuid,
  version: z.number().int().nonnegative(),
  contentFormat: z.nativeEnum(ShowtimeScreeningVersionResponseContentFormat),
  audioLanguage: z.string().trim().min(1).max(100),
  presentationType: z.nativeEnum(ShowtimeScreeningVersionResponsePresentationType),
  subtitleLanguage: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((value) => value ?? undefined),
})

const schedulingSchema = z.object({
  movieRevision: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  breakMinutes: z.number().int().min(0).max(120),
  readyAt: timestamp,
})

export const adminShowtimeSchema = z
  .object({
    id: z.string().uuid(),
    movieId: z.string().uuid(),
    roomId: z.string().uuid(),
    roomName: z.string().trim().min(1),
    cinemaId: z.string().uuid(),
    cinemaName: z.string().trim().min(1),
    startsAt: timestamp,
    endsAt: timestamp,
    status: z.nativeEnum(ShowtimeResponseStatus),
    roomLayoutId: z.string().uuid().nullish(),
    screeningVersion: screeningVersionSchema.nullish().transform((value) => value ?? undefined),
    scheduling: schedulingSchema.nullish().transform((value) => value ?? undefined),
  })
  .refine(
    (value) => Date.parse(value.endsAt) > Date.parse(value.startsAt),
    'Thời gian kết thúc phải sau thời gian bắt đầu.',
  )

export const adminShowtimesSchema = z.array(adminShowtimeSchema).superRefine((items, context) => {
  const ids = new Set<string>()

  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: 'Danh sách suất chiếu chứa mã trùng.',
      })
    }

    ids.add(item.id)
  }
})

export const adminShowtimeMoviesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(1),
  }),
)

export type AdminShowtime = z.infer<typeof adminShowtimeSchema>

export function showtimeErrorMessage(error: unknown, fallback = 'Không thể tải lịch chiếu.') {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu trả về không hợp lệ. Hãy tải lại.'
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (error.status === 403) {
      return 'Tài khoản không có quyền thực hiện thao tác này.'
    }

    if (error.status === null) {
      return 'Không thể kết nối dịch vụ. Vui lòng thử lại.'
    }
  }

  return fallback
}
