import { z } from 'zod'
import { ShowtimeResponseStatus } from '@/services/api/generated/inventory-service/model/showtimeResponseStatus'
import { formatCinemaTime, getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'
import { adminShowtimeSchema } from './admin-showtime.schema'

const uuid = z.string().uuid()
const timestamp = z.string().datetime({ offset: true })

export function localToInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null

  const milliseconds = Date.parse(`${value}:00+07:00`)
  if (!Number.isFinite(milliseconds)) return null

  const iso = new Date(milliseconds).toISOString()

  if (getCinemaDateKey(iso) !== value.slice(0, 10) || formatCinemaTime(iso) !== value.slice(11)) {
    return null
  }

  return iso
}

export function instantToLocal(value: string): string {
  const date = getCinemaDateKey(value)
  const time = formatCinemaTime(value)

  return date && time ? `${date}T${time}` : ''
}

export function getShowtimeStartError(
  date: string,
  startTime: string,
  nowMilliseconds: number,
): string {
  if (!date || !startTime) return ''

  const startsAt = localToInstant(`${date}T${startTime}`)

  if (!startsAt) return 'Ngày hoặc giờ bắt đầu không hợp lệ.'

  if (!Number.isFinite(nowMilliseconds)) {
    return 'Không xác định được thời gian hiện tại. Vui lòng tải lại trang.'
  }

  if (Date.parse(startsAt) <= nowMilliseconds) {
    return 'Giờ bắt đầu phải sau thời điểm hiện tại, theo giờ Việt Nam.'
  }

  return ''
}

export const showtimeBreakMinutesSchema = z
  .union([z.number(), z.string().trim().min(1, 'Nhập khoảng nghỉ sau suất.')])
  .pipe(
    z.coerce
      .number()
      .int('Khoảng nghỉ phải là số phút nguyên.')
      .min(0, 'Khoảng nghỉ không được âm.')
      .max(120, 'Khoảng nghỉ tối đa 120 phút.'),
  )

export const showtimeDraftSchema = z
  .object({
    cinemaId: uuid,
    roomId: uuid,
    movieId: uuid,
    movieScreeningVersionId: uuid,
    breakMinutes: showtimeBreakMinutesSchema,
    date: z
      .string()
      .refine((value) => getCinemaDayRange(value) !== null, 'Ngày chiếu không hợp lệ.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu không hợp lệ.'),
  })
  .refine((value) => localToInstant(`${value.date}T${value.startTime}`) !== null, {
    path: ['startTime'],
    message: 'Ngày hoặc giờ bắt đầu không hợp lệ.',
  })

// Luồng lập lịch chưa gán bảng giá không gửi basePrice hoặc pricingPolicyVersionId.
export const scheduleShowtimeRequestSchema = z
  .object({
    movieId: uuid,
    roomId: uuid,
    startsAt: timestamp,
    endsAt: timestamp,
    roomLayoutId: uuid.optional(),
    movieScreeningVersionId: uuid,
    breakMinutes: z.number().int().min(0).max(120),
  })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    path: ['endsAt'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu.',
  })

// Generated createShowtime trả unknown; kiểm tra các trường cần xác nhận kết quả.
export const scheduledShowtimeSchema = adminShowtimeSchema.and(
  z.object({
    status: z.literal(ShowtimeResponseStatus.SCHEDULED),
    version: z.number().int().nonnegative(),
    pricingPolicyId: uuid.nullish(),
    pricingPolicyVersionId: uuid.nullish(),
    screeningVersion: z.object({
      id: uuid,
    }),
    scheduling: z.object({
      movieRevision: z.number().int().nonnegative(),
      durationMinutes: z.number().int().positive(),
      breakMinutes: z.number().int().min(0).max(120),
      readyAt: timestamp,
    }),
  }),
)

export type ShowtimeDraftValues = z.input<typeof showtimeDraftSchema>
export type CreatedScheduledShowtime = z.infer<typeof scheduledShowtimeSchema>
