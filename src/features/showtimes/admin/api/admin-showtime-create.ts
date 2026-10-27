import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { createShowtime } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { RoomResponseContentFormatsItem } from '@/services/api/generated/inventory-service/model/roomResponseContentFormatsItem'
import type { CreateShowtimeRequest } from '@/services/api/generated/inventory-service/model/createShowtimeRequest'
import { findAllMovies } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { listMovieScreeningVersions } from '@/services/api/generated/movie-service/movie-screening-version-controller/movie-screening-version-controller'
import { MovieResponseStatus } from '@/services/api/generated/movie-service/model/movieResponseStatus'
import { MovieScreeningVersionResponseContentFormat } from '@/services/api/generated/movie-service/model/movieScreeningVersionResponseContentFormat'
import { MovieScreeningVersionResponsePresentationType } from '@/services/api/generated/movie-service/model/movieScreeningVersionResponsePresentationType'
import {
  scheduledShowtimeSchema,
  scheduleShowtimeRequestSchema,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'

const uuid = z.string().uuid()

const cinemaSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1),
  active: z.boolean(),
})

const roomSchema = z.object({
  id: uuid,
  cinemaId: uuid,
  name: z.string().trim().min(1),
  active: z.boolean(),
  contentFormats: z.array(z.nativeEnum(RoomResponseContentFormatsItem)),
})

const movieSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1),
  durationMinutes: z.number().int().positive().nullish(),
  releaseDate: z.string().date().nullish(),
  status: z.nativeEnum(MovieResponseStatus),
})

const screeningVersionSchema = z.object({
  id: uuid,
  movieId: uuid,
  contentFormat: z.nativeEnum(MovieScreeningVersionResponseContentFormat),
  audioLanguage: z.string().trim().min(1),
  presentationType: z.nativeEnum(MovieScreeningVersionResponsePresentationType),
  subtitleLanguage: z.string().nullish().transform((value) => value ?? ''),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
})

export type ShowtimeScreeningVersionOption = z.infer<typeof screeningVersionSchema>

const presentationLabels: Record<MovieScreeningVersionResponsePresentationType, string> = {
  SUBTITLED: 'Phụ đề',
  DUBBED: 'Lồng tiếng',
  NO_SUBTITLES: 'Không phụ đề',
}

export function screeningVersionLabel(version: ShowtimeScreeningVersionOption): string {
  return [
    version.contentFormat,
    `Âm thanh ${version.audioLanguage}`,
    presentationLabels[version.presentationType],
    version.subtitleLanguage ? `Ngôn ngữ phụ đề ${version.subtitleLanguage}` : '',
  ]
    .filter((value) => value !== '')
    .join(' · ')
}

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách lựa chọn chứa mã trùng.')
  }

  return items
}

const queryOptions = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const

export function useShowtimeCreationOptions(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
  movieId: MaybeRefOrGetter<string> = () => '',
) {
  function requireAccess(): void {
    if (!toValue(enabled)) {
      throw new Error('Không có quyền tải lựa chọn tạo suất chiếu.')
    }
  }

  const cinemas = useQuery({
    ...queryOptions,
    queryKey: ['showtimes', 'admin', 'create', 'cinemas'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () => {
      requireAccess()

      return uniqueIds(z.array(cinemaSchema).parse(await getActiveCinemas())).filter(
        (item) => item.active,
      )
    },
  })

  const movies = useQuery({
    ...queryOptions,
    queryKey: ['showtimes', 'admin', 'create', 'movies'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () => {
      requireAccess()

      return uniqueIds(z.array(movieSchema).parse(await findAllMovies())).filter(
        (item) => item.status === 'NOW_SHOWING' || item.status === 'UPCOMING',
      )
    },
  })

  const rooms = useQuery({
    ...queryOptions,
    queryKey: computed(
      () => ['showtimes', 'admin', 'create', 'rooms', toValue(cinemaId)] as const,
    ),
    enabled: computed(() => toValue(enabled) && uuid.safeParse(toValue(cinemaId)).success),
    queryFn: async ({ queryKey }) => {
      requireAccess()

      const requestedCinemaId = uuid.parse(queryKey[4])
      const items = uniqueIds(
        z.array(roomSchema).parse(await getActiveRooms({ cinemaId: requestedCinemaId })),
      )

      if (items.some((item) => item.cinemaId !== requestedCinemaId)) {
        throw new Error('Danh sách phòng không khớp rạp đang chọn.')
      }

      for (const room of items) {
        if (new Set(room.contentFormats).size !== room.contentFormats.length) {
          throw new Error('Định dạng hỗ trợ của phòng bị trùng.')
        }
      }

      return items.filter((item) => item.active)
    },
    placeholderData: () => undefined,
  })

  const screeningVersions = useQuery({
    ...queryOptions,
    queryKey: computed(
      () => ['showtimes', 'admin', 'create', 'screening-versions', toValue(movieId)] as const,
    ),
    enabled: computed(() => toValue(enabled) && uuid.safeParse(toValue(movieId)).success),
    queryFn: async ({ queryKey }) => {
      requireAccess()

      const requestedMovieId = uuid.parse(queryKey[4])
      const items = uniqueIds(
        z.array(screeningVersionSchema).parse(
          await listMovieScreeningVersions(requestedMovieId, { active: true }),
        ),
      )

      if (items.some((item) => item.movieId !== requestedMovieId)) {
        throw new Error('Danh sách phiên bản chiếu không thuộc phim đang chọn.')
      }

      return items.filter((item) => item.active)
    },
    placeholderData: () => undefined,
  })

  return { cinemas, movies, rooms, screeningVersions }
}

class ShowtimeCreationInputError extends Error {}

export function showtimeCreationStatus(error: unknown): number | null {
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

export function isShowtimeCreationRejected(error: unknown): boolean {
  if (error instanceof ShowtimeCreationInputError) return true

  const status = showtimeCreationStatus(error)
  return status !== null && [400, 401, 403, 404, 409, 422].includes(status)
}

export function showtimeCreationErrorMessage(error: unknown): string {
  if (error instanceof ShowtimeCreationInputError) return error.message

  const messages: Record<string, string> = {
    INVENTORY_SHOWTIME_OVERLAP:
      'Lịch phòng bị trùng, đã tính cả khoảng nghỉ. Điều chỉnh thời gian và tải lại lựa chọn trước khi gửi tiếp.',
    INVENTORY_SHOWTIME_DURATION_MISMATCH:
      'Thời lượng phim đã thay đổi hoặc giờ kết thúc chưa đúng. Hãy tải lại lựa chọn.',
    INVENTORY_SHOWTIME_START_NOT_FUTURE:
      'Giờ bắt đầu phải sau thời điểm hiện tại.',
    INVENTORY_SHOWTIME_BEFORE_RELEASE_DATE:
      'Suất chiếu nằm trước ngày khởi chiếu của phim theo múi giờ cụm rạp.',
    INVENTORY_SCREENING_VERSION_INACTIVE:
      'Phiên bản chiếu đã ngừng hoạt động. Hãy tải lại và chọn phiên bản khác.',
    INVENTORY_SCREENING_VERSION_NOT_FOUND:
      'Không tìm thấy phiên bản chiếu đã chọn.',
    INVENTORY_SHOWTIME_FORMAT_NOT_SUPPORTED:
      'Phòng không còn hỗ trợ định dạng của phiên bản chiếu. Hãy tải lại lựa chọn.',
    INVENTORY_ROOM_CONTENT_FORMATS_NOT_CONFIGURED:
      'Phòng chưa được cấu hình định dạng nội dung hỗ trợ.',
    INVENTORY_SHOWTIME_LAYOUT_REQUIRED:
      'Phòng có sơ đồ đã công bố. Hãy tải lại và xác nhận phiên bản sơ đồ cần gắn.',
    INVENTORY_ROOM_LAYOUT_NOT_PUBLISHED:
      'Sơ đồ được chọn không còn ở trạng thái đã công bố. Hãy tải lại.',
    INVENTORY_SHOWTIME_LAYOUT_ROOM_MISMATCH:
      'Sơ đồ đã chọn không thuộc phòng này.',
    INVENTORY_ROOM_LAYOUT_SEAT_SNAPSHOT_MISMATCH:
      'Dữ liệu ghế không còn khớp sơ đồ. Hãy tải lại và kiểm tra phòng.',
    INVENTORY_NO_ACTIVE_SEATS:
      'Phòng chưa có ghế hoạt động hợp lệ để lập suất chiếu.',
    INVENTORY_ROOM_INACTIVE:
      'Phòng đã ngừng hoạt động.',
    INVENTORY_CINEMA_INACTIVE:
      'Cụm rạp đã ngừng hoạt động.',
    INVENTORY_INVALID_SHOWTIME_BREAK:
      'Khoảng nghỉ phải là số phút nguyên từ 0 đến 120.',
  }

  const code = errorCode(error)
  if (code && messages[code]) return messages[code]

  return showtimeErrorMessage(
    error,
    'Không thể tạo suất chiếu. Kiểm tra lựa chọn, thời gian và cấu hình phòng.',
  )
}

export function useCreateAdminShowtimeMutation(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: async (input: {
      cinemaId: string
      request: CreateShowtimeRequest
    }) => {
      if (!toValue(enabled)) {
        throw new ShowtimeCreationInputError('Bạn không có quyền tạo suất chiếu.')
      }

      const cinema = uuid.safeParse(input.cinemaId)
      const parsed = scheduleShowtimeRequestSchema.safeParse(input.request)

      if (!cinema.success || !parsed.success) {
        throw new ShowtimeCreationInputError('Thông tin lập lịch chưa hợp lệ.')
      }

      const request = parsed.data satisfies CreateShowtimeRequest
      const response = await createShowtime(request)
      const created = scheduledShowtimeSchema.parse(response)

      if (
        created.cinemaId !== cinema.data ||
        created.roomId !== request.roomId ||
        created.movieId !== request.movieId ||
        created.screeningVersion.id !== request.movieScreeningVersionId ||
        (created.roomLayoutId ?? null) !== (request.roomLayoutId ?? null) ||
        Date.parse(created.startsAt) !== Date.parse(request.startsAt) ||
        Date.parse(created.endsAt) !== Date.parse(request.endsAt) ||
        created.scheduling.breakMinutes !== request.breakMinutes ||
        created.pricingPolicyId != null ||
        created.pricingPolicyVersionId != null ||
        Date.parse(created.endsAt) - Date.parse(created.startsAt) !==
          created.scheduling.durationMinutes * 60_000 ||
        Date.parse(created.scheduling.readyAt) !==
          Date.parse(created.endsAt) + request.breakMinutes * 60_000
      ) {
        throw new Error('Chưa xác nhận được kết quả tạo thuộc thông tin đã gửi.')
      }

      return created
    },
    onSuccess: () => {
      void queryClient
        .invalidateQueries({
          predicate: ({ queryKey }) =>
            ['showtimes', 'home', 'booking', 'cinemas'].includes(String(queryKey[0])),
          refetchType: 'none',
        })
        .catch(() => undefined)
    },
  })
}