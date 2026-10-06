import { z } from 'zod'
import type {
  CreateMovieRequest,
  MovieResponse,
} from '@/services/api/generated/movie-service/model'
import type { ApiError } from '@/services/http/api-error'

export const movieStatuses = ['UPCOMING', 'NOW_SHOWING', 'ENDED', 'INACTIVE'] as const

export type AdminMovieStatus = (typeof movieStatuses)[number]

export const movieStatusLabels: Record<AdminMovieStatus, string> = {
  UPCOMING: 'Sắp chiếu',
  NOW_SHOWING: 'Đang chiếu',
  ENDED: 'Đã kết thúc',
  INACTIVE: 'Ngừng hiển thị',
}

export const movieStatusOptions = movieStatuses.map((value) => ({
  value,
  label: movieStatusLabels[value],
}))

export function isMovieStatus(value: unknown): value is AdminMovieStatus {
  return movieStatuses.some((status) => status === value)
}

function isValidDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)

  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isHttpUrl(value: string) {
  if (!value) return true

  try {
    const url = new URL(value)

    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname)
  } catch {
    return false
  }
}

export const adminMovieSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tên phim.').max(255, 'Tên phim tối đa 255 ký tự.'),

  description: z.string().trim().max(5000, 'Mô tả tối đa 5.000 ký tự.'),

  durationMinutes: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Nhập thời lượng bằng số phút nguyên.')
    .refine((value) => {
      const number = Number(value)

      return Number.isInteger(number) && number >= 1 && number <= 2147483647
    }, 'Thời lượng phải từ 1 đến 2.147.483.647 phút.'),

  releaseDate: z.string().trim().refine(isValidDate, 'Ngày phát hành không hợp lệ.'),

  posterUrl: z.string().trim().max(500, 'Đường dẫn poster tối đa 500 ký tự.'),

  trailerUrl: z
    .string()
    .trim()
    .max(500, 'Đường dẫn trailer tối đa 500 ký tự.')
    .refine(isHttpUrl, 'Trailer phải là URL HTTP hoặc HTTPS hợp lệ.'),

  status: z.enum(movieStatuses),
  genreIds: z.array(z.string().uuid('Thể loại không hợp lệ.')).min(1, 'Chọn ít nhất một thể loại.'),
})

export type AdminMovieFormInput = z.input<typeof adminMovieSchema>
export type AdminMovieFormOutput = z.output<typeof adminMovieSchema>

export function createAdminMovieFormValues(movie?: MovieResponse): AdminMovieFormInput {
  return {
    title: movie?.title ?? '',
    description: movie?.description ?? '',
    durationMinutes: movie?.durationMinutes == null ? '' : String(movie.durationMinutes),
    releaseDate: movie?.releaseDate ?? '',
    posterUrl: movie?.posterUrl ?? '',
    trailerUrl: movie?.trailerUrl ?? '',
    status: isMovieStatus(movie?.status) ? movie.status : 'INACTIVE',
    genreIds: (movie?.genres ?? [])
      .map((genre) => genre.id)
      .filter((id): id is string => Boolean(id)),
  }
}

export function toAdminMovieRequest(values: AdminMovieFormOutput): CreateMovieRequest {
  return {
    title: values.title,
    description: values.description || undefined,
    durationMinutes: Number(values.durationMinutes),
    releaseDate: values.releaseDate || undefined,
    posterUrl: values.posterUrl || undefined,
    trailerUrl: values.trailerUrl || undefined,
    status: values.status,
    genreIds: [...new Set(values.genreIds)],
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'fieldErrors' in error &&
    Array.isArray(error.fieldErrors)
  )
}

export function adminMovieErrorMessage(error: unknown, fallback = 'Không thể tải dữ liệu phim.') {
  if (!isApiError(error)) return fallback

  if (error.status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (error.status === 403) {
    return 'Tài khoản không có quyền quản lý phim.'
  }

  switch (error.code) {
    case 'MOVIE_NOT_FOUND':
      return 'Phim không còn tồn tại. Hãy tải lại danh sách.'
    case 'GENRE_NOT_FOUND':
      return 'Một thể loại đã không còn tồn tại. Hãy tải lại thể loại.'
    case 'INVALID_MOVIE_TITLE':
      return 'Tên phim không hợp lệ hoặc đã được sử dụng.'
    case 'INVALID_TRAILER_URL':
      return 'Đường dẫn trailer không hợp lệ.'
    case 'TRAILER_URL_TOO_LONG':
      return 'Đường dẫn trailer tối đa 500 ký tự.'
  }

  if (error.status === null) {
    return 'Không thể kết nối dịch vụ. Vui lòng thử lại.'
  }

  return error.message || fallback
}
