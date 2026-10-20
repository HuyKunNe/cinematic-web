import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  getActiveCinemas,
} from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  getActiveRooms,
} from '@/services/api/generated/inventory-service/room-controller/room-controller'
import {
  getRoomLayoutsByRoom,
} from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import {
  create,
} from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import {
  findAll,
} from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type {
  CreateShowtimeRequest,
} from '@/services/api/generated/inventory-service/model'
import { adminShowtimeSchema } from '../schemas/admin-showtime.schema'

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
})

const movieSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1),
  durationMinutes: z.number().int().positive().nullish(),
  status: z.enum(['UPCOMING', 'NOW_SHOWING', 'ENDED', 'INACTIVE']),
})

const layoutSchema = z.object({
  id: uuid,
  roomId: uuid,
  layoutVersion: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
})

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách lựa chọn chứa mã trùng.')
  }

  return items
}

export function useShowtimeCreationOptions(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
  roomId: MaybeRefOrGetter<string>,
) {
  const cinemas = useQuery({
    queryKey: ['showtimes', 'admin', 'create', 'cinemas'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () =>
      uniqueIds(z.array(cinemaSchema).parse(await getActiveCinemas()))
        .filter((item) => item.active),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const movies = useQuery({
    queryKey: ['showtimes', 'admin', 'create', 'movies'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () =>
      uniqueIds(z.array(movieSchema).parse(await findAll()))
        .filter(
          (item) =>
            item.status === 'NOW_SHOWING' || item.status === 'UPCOMING',
        ),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const rooms = useQuery({
    queryKey: computed(
      () => ['showtimes', 'admin', 'create', 'rooms', toValue(cinemaId)] as const,
    ),
    enabled: computed(
      () => toValue(enabled) && uuid.safeParse(toValue(cinemaId)).success,
    ),
    queryFn: async ({ queryKey }) => {
      const requestedCinemaId = queryKey[4]
      uuid.parse(requestedCinemaId)

      const items = uniqueIds(
        z.array(roomSchema).parse(
          await getActiveRooms({ cinemaId: requestedCinemaId }),
        ),
      )

      if (items.some((item) => item.cinemaId !== requestedCinemaId)) {
        throw new Error('Danh sách phòng không khớp rạp đang chọn.')
      }

      return items.filter((item) => item.active)
    },
    placeholderData: () => undefined,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const layouts = useQuery({
    queryKey: computed(
      () => ['showtimes', 'admin', 'create', 'layouts', toValue(roomId)] as const,
    ),
    enabled: computed(
      () => toValue(enabled) && uuid.safeParse(toValue(roomId)).success,
    ),
    queryFn: async ({ queryKey }) => {
      const requestedRoomId = queryKey[4]
      uuid.parse(requestedRoomId)

      const items = uniqueIds(
        z.array(layoutSchema).parse(
          await getRoomLayoutsByRoom({ roomId: requestedRoomId }),
        ),
      )

      if (items.some((item) => item.roomId !== requestedRoomId)) {
        throw new Error('Danh sách sơ đồ không khớp phòng đang chọn.')
      }

      return items
        .filter((item) => item.status === 'PUBLISHED')
        .sort((left, right) => right.layoutVersion - left.layoutVersion)
    },
    placeholderData: () => undefined,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return { cinemas, movies, rooms, layouts }
}

export function useCreateAdminShowtimeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateShowtimeRequest) => {
      const created = adminShowtimeSchema.parse(await create(input))

      if (
        created.movieId !== input.movieId ||
        created.roomId !== input.roomId ||
        created.roomLayoutId !== input.roomLayoutId ||
        created.status !== 'SCHEDULED' ||
        Date.parse(created.startsAt) !== Date.parse(input.startsAt) ||
        Date.parse(created.endsAt) !== Date.parse(input.endsAt)
      ) {
        throw new Error('Chưa xác nhận được kết quả tạo suất chiếu.')
      }

      return created
    },
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          queryKey[0] === 'showtimes' ||
          (queryKey[0] === 'cinemas' && queryKey[1] === 'programme') ||
          (queryKey[0] === 'home' && queryKey[1] === 'showtimes'),
        refetchType: 'none',
      })
    },
  })
}