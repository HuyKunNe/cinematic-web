import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQueryClient } from '@tanstack/vue-query'
import { getShowtimeById } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { findMovieById } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type { AdminBookingListItem } from './admin-booking-queries'

// BookingResponse contains identifiers only. Resolve labels without changing
// pagination or making a failed catalogue read hide the booking itself.
export function useAdminBookingShowtimes(
  rows: MaybeRefOrGetter<AdminBookingListItem[]>,
  enabled: MaybeRefOrGetter<boolean>,
  subject: MaybeRefOrGetter<string>,
) {
  const client = useQueryClient()
  const ids = computed(() => [...new Set(toValue(rows).map((row) => row.showtimeId))])
  const queries = useQueries({
    queries: computed(() =>
      ids.value.map((id) => ({
        queryKey: ['bookings', 'admin', 'showtime-label', toValue(subject), id] as const,
        enabled: toValue(enabled) && Boolean(toValue(subject)),
        queryFn: async () => {
          const owner = toValue(subject)
          if (!toValue(enabled) || !owner) throw new Error('Không có quyền tra cứu suất chiếu.')
          const showtime = await getShowtimeById(id)
          if (
            showtime.id !== id ||
            !showtime.movieId ||
            !showtime.startsAt ||
            !Number.isFinite(Date.parse(showtime.startsAt))
          ) {
            throw new Error('Thông tin suất chiếu không hợp lệ.')
          }
          const movieId = showtime.movieId
          const movie = await client.fetchQuery({
            queryKey: ['bookings', 'admin', 'movie-label', owner, movieId],
            queryFn: () => findMovieById(movieId),
            staleTime: 60_000,
            retry: false,
          })
          if (movie.id !== movieId || !movie.title?.trim()) {
            throw new Error('Chưa có tên phim hợp lệ.')
          }
          return { id, title: movie.title, startsAt: showtime.startsAt }
        },
        staleTime: 60_000,
        retry: false,
      })),
    ),
  })
  const labels = computed(
    () =>
      new Map(
        ids.value.map((id, index) => {
          const query = queries.value[index]
          return [
            id,
            {
              data: query?.data?.id === id ? query.data : undefined,
              loading: query?.isPending ?? true,
              error: query?.isError ?? false,
            },
          ] as const
        }),
      ),
  )
  function refresh() {
    if (toValue(enabled)) void Promise.all(queries.value.map((query) => query.refetch()))
  }
  return { labels, refresh }
}
