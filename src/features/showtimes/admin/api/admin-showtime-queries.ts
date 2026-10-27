import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getShowtimesByTimeRange } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { findAllMovies } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getCinemaDayRange } from '@/utils/cinema-time'
import { adminShowtimeMoviesSchema, adminShowtimesSchema } from '../schemas/admin-showtime.schema'

export const adminShowtimeKeys = {
  day: (date: string) => ['showtimes', 'admin', 'day', date] as const,
  movies: ['showtimes', 'admin', 'movie-names'] as const,
}

export function useAdminShowtimesQuery(
  date: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminShowtimeKeys.day(toValue(date))),
    enabled: computed(() => toValue(enabled) && getCinemaDayRange(toValue(date)) !== null),
    queryFn: async ({ queryKey }) => {
      const range = getCinemaDayRange(queryKey[3])

      if (!range) {
        throw new Error('Ngày xem lịch không hợp lệ.')
      }

      const response = await getShowtimesByTimeRange(range)
      const items = adminShowtimesSchema.parse(response)

      const from = Date.parse(range.from)
      const to = Date.parse(range.to)

      return items
        .filter((item) => {
          const startsAt = Date.parse(item.startsAt)
          return startsAt >= from && startsAt < to
        })
        .sort(
          (left, right) =>
            Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
            left.id.localeCompare(right.id),
        )
    },
    placeholderData: () => undefined,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminShowtimeMoviesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: adminShowtimeKeys.movies,
    enabled: computed(() => toValue(enabled)),
    queryFn: async () => adminShowtimeMoviesSchema.parse(await findAllMovies()),
    retry: false,
    refetchOnWindowFocus: false,
  })
}
