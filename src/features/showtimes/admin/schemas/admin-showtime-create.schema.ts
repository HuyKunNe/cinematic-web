import { z } from 'zod'
import { formatCinemaTime, getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'

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

export const showtimeDraftSchema = z
  .object({
    cinemaId: z.string().uuid('Chọn rạp.'),
    roomId: z.string().uuid('Chọn phòng.'),
    movieId: z.string().uuid('Chọn phim.'),
    date: z
      .string()
      .refine((value) => getCinemaDayRange(value) !== null, 'Ngày chiếu không hợp lệ.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu không hợp lệ.'),
  })
  .refine((value) => localToInstant(`${value.date}T${value.startTime}`) !== null, {
    path: ['startTime'],
    message: 'Ngày hoặc giờ bắt đầu không hợp lệ.',
  })

export type ShowtimeDraftValues = z.input<typeof showtimeDraftSchema>
