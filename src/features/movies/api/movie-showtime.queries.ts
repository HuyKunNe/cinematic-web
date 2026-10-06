import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getBookableShowtimes } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'

export const movieShowtimeQueryKeys = {
  bookable: (params: GetBookableShowtimesParams | null) =>
    [
      'movies',
      'bookable-showtimes',
      params?.cinemaId ?? '',
      params?.movieId ?? '',
      params?.from ?? '',
      params?.to ?? '',
    ] as const,
}

export function useMovieBookableShowtimes(
  params: MaybeRefOrGetter<GetBookableShowtimesParams | null>,
) {
  const request = computed(() => toValue(params))

  return useQuery({
    queryKey: computed(() => movieShowtimeQueryKeys.bookable(request.value)),
    enabled: computed(() =>
      Boolean(
        request.value?.cinemaId && request.value.movieId && request.value.from && request.value.to,
      ),
    ),
    retry: false,
    queryFn: ({ queryKey }): Promise<ShowtimeResponse[]> => {
      const [, , cinemaId, movieId, from, to] = queryKey

      if (!cinemaId || !movieId || !from || !to) {
        return Promise.resolve([])
      }

      return getBookableShowtimes({
        cinemaId,
        movieId,
        from,
        to,
      })
    },
  })
}
