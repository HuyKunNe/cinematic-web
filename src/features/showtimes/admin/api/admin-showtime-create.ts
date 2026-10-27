import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { findAllMovies } from '@/services/api/generated/movie-service/movie-controller/movie-controller'

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

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách lựa chọn chứa mã trùng.')
  }

  return items
}

export function useShowtimeCreationOptions(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
) {
  const cinemas = useQuery({
    queryKey: ['showtimes', 'admin', 'create', 'cinemas'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () =>
      uniqueIds(z.array(cinemaSchema).parse(await getActiveCinemas())).filter(
        (item) => item.active,
      ),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const movies = useQuery({
    queryKey: ['showtimes', 'admin', 'create', 'movies'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () =>
      uniqueIds(z.array(movieSchema).parse(await findAllMovies())).filter(
        (item) => item.status === 'NOW_SHOWING' || item.status === 'UPCOMING',
      ),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const rooms = useQuery({
    queryKey: computed(() => ['showtimes', 'admin', 'create', 'rooms', toValue(cinemaId)] as const),
    enabled: computed(() => toValue(enabled) && uuid.safeParse(toValue(cinemaId)).success),
    queryFn: async ({ queryKey }) => {
      const requestedCinemaId = uuid.parse(queryKey[4])

      const items = uniqueIds(
        z.array(roomSchema).parse(await getActiveRooms({ cinemaId: requestedCinemaId })),
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

  return { cinemas, movies, rooms }
}
