import { z } from 'zod'
import type {
  CreateGenreRequest,
  GenreResponse,
} from '@/services/api/generated/movie-service/model'
import { adminMovieErrorMessage, isApiError } from './admin-movie.schema'

export const adminGenreSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên thể loại.').max(100, 'Tên thể loại tối đa 100 ký tự.'),

  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự.'),
})

export type AdminGenreFormValues = z.infer<typeof adminGenreSchema>

export function createAdminGenreValues(genre?: GenreResponse): AdminGenreFormValues {
  return {
    name: genre?.name ?? '',
    description: genre?.description ?? '',
  }
}

export function toAdminGenreRequest(values: AdminGenreFormValues): CreateGenreRequest {
  return {
    name: values.name,
    description: values.description || undefined,
  }
}

export function adminGenreErrorMessage(
  error: unknown,
  fallback = 'Không thể tải dữ liệu thể loại.',
) {
  if (isApiError(error)) {
    if (error.code === 'GENRE_ALREADY_EXISTS') {
      return 'Tên thể loại đã được sử dụng.'
    }

    if (error.code === 'GENRE_NOT_FOUND') {
      return 'Thể loại không còn tồn tại. Hãy tải lại danh sách.'
    }
  }

  return adminMovieErrorMessage(error, fallback)
}
