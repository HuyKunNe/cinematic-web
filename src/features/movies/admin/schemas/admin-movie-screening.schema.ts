import { z } from 'zod'
import type {
  CreateMovieRequest,
  MovieResponse,
  UpdateMovieRequest,
} from '@/services/api/generated/movie-service/model'
import { SaveMovieScreeningVersionRequestContentFormat } from '@/services/api/generated/movie-service/model/saveMovieScreeningVersionRequestContentFormat'
import { SaveMovieScreeningVersionRequestPresentationType } from '@/services/api/generated/movie-service/model/saveMovieScreeningVersionRequestPresentationType'
import { adminMovieErrorMessage, isApiError } from './admin-movie.schema'

const uuid = z.string().uuid()
const counter = z.number().int().nonnegative()

export const screeningFormatOptions = Object.values(
  SaveMovieScreeningVersionRequestContentFormat,
).map((value) => ({ value, label: value }))

export const screeningPresentationOptions = [
  { value: 'SUBTITLED', label: 'Có phụ đề' },
  { value: 'DUBBED', label: 'Lồng tiếng' },
  { value: 'NO_SUBTITLES', label: 'Không phụ đề' },
] satisfies {
  value: SaveMovieScreeningVersionRequestPresentationType
  label: string
}[]

const screeningRowSchema = z.object({
  key: z.string().min(1),
  id: uuid.nullable(),
  expectedVersion: counter.nullable(),
  contentFormat: z.nativeEnum(SaveMovieScreeningVersionRequestContentFormat),
  audioLanguage: z
    .string()
    .trim()
    .min(1, 'Nhập ngôn ngữ âm thanh.')
    .max(100, 'Ngôn ngữ âm thanh tối đa 100 ký tự.'),
  presentationType: z.nativeEnum(SaveMovieScreeningVersionRequestPresentationType),
  subtitleLanguage: z.string().trim().max(100, 'Ngôn ngữ phụ đề tối đa 100 ký tự.'),
  active: z.boolean(),
})

const screeningRowsSchema = z.array(screeningRowSchema).superRefine((rows, context) => {
  const definitions = new Set<string>()
  const ids = new Set<string>()

  rows.forEach((row, index) => {
    const report = (message: string) =>
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index],
        message,
      })

    if ((row.id === null) !== (row.expectedVersion === null)) {
      report('Phiên bản có sẵn phải giữ đúng ID và version đã tải.')
    }

    if (row.presentationType === 'SUBTITLED' && !row.subtitleLanguage) {
      report('Phiên bản có phụ đề phải nhập ngôn ngữ phụ đề.')
    }

    if (row.presentationType !== 'SUBTITLED' && row.subtitleLanguage) {
      report('Phiên bản lồng tiếng hoặc không phụ đề phải để trống ngôn ngữ phụ đề.')
    }

    const definition = JSON.stringify([
      row.contentFormat,
      row.audioLanguage,
      row.presentationType,
      row.subtitleLanguage,
    ])

    if (definitions.has(definition)) report('Định nghĩa phiên bản bị trùng.')
    definitions.add(definition)

    if (row.id !== null) {
      if (ids.has(row.id)) report('ID phiên bản bị trùng.')
      ids.add(row.id)
    }
  })
})

export type AdminMovieScreeningRow = z.infer<typeof screeningRowSchema>

let nextRowKey = 0

export function createAdminMovieScreeningRow(): AdminMovieScreeningRow {
  nextRowKey += 1

  return {
    key: 'new-screening-' + nextRowKey,
    id: null,
    expectedVersion: null,
    contentFormat: '2D',
    audioLanguage: '',
    presentationType: 'SUBTITLED',
    subtitleLanguage: '',
    active: true,
  }
}

const screeningResponseSchema = screeningRowSchema
  .omit({ key: true, expectedVersion: true })
  .extend({
    id: uuid,
    movieId: uuid,
    version: counter,
    subtitleLanguage: z
      .string()
      .nullish()
      .transform((value) => value ?? ''),
  })

export function readAdminMovieScreeningRows(movie: MovieResponse): AdminMovieScreeningRow[] {
  const parsed = z.array(screeningResponseSchema).safeParse(movie.screeningVersions)

  if (!parsed.success || parsed.data.some((item) => item.movieId !== movie.id)) {
    throw new Error(
      'Chưa nhận được danh sách phiên bản chiếu hợp lệ của phim. Hãy đóng và mở lại form.',
    )
  }

  return screeningRowsSchema.parse(
    parsed.data.map((item) => ({
      ...item,
      key: item.id,
      expectedVersion: item.version,
    })),
  )
}

function definition(row: AdminMovieScreeningRow) {
  return {
    contentFormat: row.contentFormat,
    audioLanguage: row.audioLanguage,
    presentationType: row.presentationType,
    subtitleLanguage: row.presentationType === 'SUBTITLED' ? row.subtitleLanguage : undefined,
  }
}

export function toAdminMovieCreateRequest(
  base: CreateMovieRequest,
  rows: AdminMovieScreeningRow[],
): CreateMovieRequest {
  const parsed = screeningRowsSchema.parse(rows)

  if (parsed.length === 0) {
    throw new Error('Thêm ít nhất một phiên bản chiếu trước khi tạo phim.')
  }

  if (parsed.some((row) => row.id !== null || !row.active)) {
    throw new Error('Các phiên bản của phim mới phải là phiên bản mới và đang hoạt động.')
  }

  return {
    ...base,
    screeningVersions: parsed.map(definition),
  }
}

export function toAdminMovieUpdateRequest(
  base: CreateMovieRequest,
  rows: AdminMovieScreeningRow[],
): UpdateMovieRequest {
  return {
    ...base,
    screeningVersions: screeningRowsSchema.parse(rows).map((row) => ({
      ...definition(row),
      ...(row.id !== null ? { id: row.id, expectedVersion: row.expectedVersion } : {}),
      active: row.active,
    })),
  }
}

export function adminMovieScreeningErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const index = issue.path[0]
        const prefix = typeof index === 'number' ? 'Phiên bản ' + (index + 1) + ': ' : ''
        return prefix + issue.message
      })
      .join(' ')
  }

  if (isApiError(error)) {
    switch (error.code) {
      case 'INVALID_MOVIE_SCREENING_VERSION':
        return 'Kiểm tra định dạng, ngôn ngữ âm thanh và phụ đề của phiên bản chiếu.'
      case 'MOVIE_SCREENING_VERSION_CONFLICT':
        return 'Phiên bản chiếu đã thay đổi. Đóng và mở lại form trước khi lưu tiếp.'
      case 'MOVIE_SCREENING_VERSION_IMMUTABLE':
        return 'Định nghĩa phiên bản đã lưu không được thay đổi. Hãy thêm phiên bản mới.'
      case 'MOVIE_SCREENING_VERSION_NOT_FOUND':
        return 'Không tìm thấy phiên bản chiếu. Đóng và mở lại form để kiểm tra.'
    }

    return adminMovieErrorMessage(error, 'Không thể lưu phiên bản chiếu.')
  }

  return error instanceof Error ? error.message : 'Dữ liệu phiên bản chiếu chưa hợp lệ.'
}
