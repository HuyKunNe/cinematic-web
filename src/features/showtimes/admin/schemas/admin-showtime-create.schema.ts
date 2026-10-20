import { z } from 'zod'
import type { CreateShowtimeRequest } from '@/services/api/generated/inventory-service/model'
import { formatCinemaTime, getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'
import { showtimeErrorMessage } from './admin-showtime.schema'

export function localToInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null
  }

  const milliseconds = Date.parse(`${value}:00+07:00`)

  if (!Number.isFinite(milliseconds)) return null

  const iso = new Date(milliseconds).toISOString()

  // Chặn ngày/giờ không hợp lệ bị Date tự chuẩn hóa.
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

export const showtimeCreateSchema = z
  .object({
    cinemaId: z.string().uuid('Chọn rạp.'),
    roomId: z.string().uuid('Chọn phòng.'),
    movieId: z.string().uuid('Chọn phim.'),
    roomLayoutId: z.string().uuid('Chọn sơ đồ đã xuất bản.'),
    date: z.string().refine((value) => getCinemaDayRange(value) !== null, 'Chọn ngày hợp lệ.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Nhập giờ bắt đầu.'),
    endsAt: z.string().min(1, 'Nhập ngày giờ kết thúc.'),
    basePrice: z
      .string()
      .trim()
      .regex(
        /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
        'Giá tối đa 10 chữ số phần nguyên và 2 chữ số thập phân.',
      )
      .refine((value) => Number(value) >= 0.01, 'Giá cơ bản phải từ 0.01.'),
  })
  .superRefine((value, context) => {
    const start = localToInstant(`${value.date}T${value.startTime}`)
    const end = localToInstant(value.endsAt)
    const now = Date.now()

    if (!start) {
      context.addIssue({
        code: 'custom',
        path: ['startTime'],
        message: 'Ngày hoặc giờ bắt đầu không hợp lệ.',
      })
    } else if (Date.parse(start) <= now) {
      context.addIssue({
        code: 'custom',
        path: ['startTime'],
        message: 'Thời gian bắt đầu phải nằm trong tương lai.',
      })
    }

    if (!end) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Ngày giờ kết thúc không hợp lệ.',
      })
    } else if (Date.parse(end) <= now || (start !== null && Date.parse(end) <= Date.parse(start))) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Giờ kết thúc phải sau giờ bắt đầu và nằm trong tương lai.',
      })
    }
  })

export type ShowtimeCreateValues = z.input<typeof showtimeCreateSchema>

export function toCreateShowtimeRequest(values: ShowtimeCreateValues): CreateShowtimeRequest {
  const parsed = showtimeCreateSchema.parse(values)

  return {
    movieId: parsed.movieId,
    roomId: parsed.roomId,
    roomLayoutId: parsed.roomLayoutId,
    startsAt: localToInstant(`${parsed.date}T${parsed.startTime}`)!,
    endsAt: localToInstant(parsed.endsAt)!,
    basePrice: Number(parsed.basePrice),
  }
}

export function uncertainShowtimeCreation(error: unknown): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('status' in error) ||
    typeof error.status !== 'number'
  ) {
    return true
  }

  return error.status === 408 || error.status >= 500
}

export function showtimeCreateErrorMessage(error: unknown) {
  const messages: Record<string, string> = {
    INVENTORY_SHOWTIME_OVERLAP: 'Phòng đã có suất chiếu trùng khoảng thời gian này.',
    INVENTORY_CINEMA_INACTIVE: 'Rạp đang tạm ngưng. Hãy chọn rạp khác.',
    INVENTORY_ROOM_INACTIVE: 'Phòng đang tạm ngưng. Hãy chọn phòng khác.',
    INVENTORY_SHOWTIME_LAYOUT_REQUIRED: 'Cần chọn phiên bản sơ đồ đã xuất bản.',
    INVENTORY_SHOWTIME_LAYOUT_ROOM_MISMATCH:
      'Sơ đồ không thuộc phòng đang chọn. Hãy tải lại lựa chọn.',
    INVENTORY_ROOM_LAYOUT_NOT_PUBLISHED: 'Sơ đồ đã chọn chưa được xuất bản.',
    INVENTORY_ROOM_LAYOUT_NOT_FOUND: 'Sơ đồ không còn tồn tại. Hãy tải lại lựa chọn.',
    INVENTORY_NO_ACTIVE_SEATS: 'Phòng chưa có ghế hoạt động để tạo suất chiếu.',
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const message = messages[error.code]
    if (message) return message
  }

  return showtimeErrorMessage(error, 'Không thể tạo suất chiếu.')
}
