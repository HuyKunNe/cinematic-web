import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQueryClient } from '@tanstack/vue-query'
import { cinemaRoomQueryKeys } from '@/features/cinemas'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { getBookableShowtimes } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'

export function useMovieScheduleContexts(requests: MaybeRefOrGetter<GetBookableShowtimesParams[]>) {
  const client = useQueryClient()
  const params = computed(() => toValue(requests))
  const queries = useQueries({
    queries: computed(() =>
      params.value.map((request) => ({
        queryKey: [
          'movies',
          'schedule-context',
          request.cinemaId,
          request.movieId,
          request.from,
          request.to,
        ] as const,
        queryFn: async () => {
          const [schedule, rooms] = await Promise.allSettled([
            getBookableShowtimes(request),
            client.fetchQuery({
              queryKey: cinemaRoomQueryKeys.active(request.cinemaId),
              queryFn: () => getActiveRooms({ cinemaId: request.cinemaId }),
              staleTime: 30_000,
              retry: false,
            }),
          ])
          if (schedule.status === 'rejected') throw schedule.reason
          if (
            schedule.value.some(
              (slot) => slot.cinemaId !== request.cinemaId || slot.movieId !== request.movieId,
            )
          )
            throw new Error('Showtime scope mismatch')
          return {
            cinemaId: request.cinemaId,
            showtimes: schedule.value,
            rooms:
              rooms.status === 'fulfilled'
                ? rooms.value.filter(
                    (room) => room.active === true && room.cinemaId === request.cinemaId,
                  )
                : [],
            roomError: rooms.status === 'rejected',
          }
        },
        retry: false,
        staleTime: 0,
      })),
    ),
  })
  const contexts = computed(() =>
    queries.value.flatMap((query) => (query.isSuccess && query.data ? [query.data] : [])),
  )
  const isFetching = computed(() => queries.value.some((query) => query.isFetching))
  const showtimes = computed(() => contexts.value.flatMap((context) => context.showtimes))
  async function refresh() {
    await Promise.all(queries.value.map((query) => query.refetch()))
  }
  return {
    showtimesQuery: {
      data: showtimes,
      isPending: computed(() => queries.value.some((query) => query.isPending)),
      isFetching,
      isSuccess: computed(() => queries.value.some((query) => query.isSuccess)),
      isError: computed(() => queries.value.some((query) => query.isError)),
      refetch: refresh,
    },
    roomsQuery: {
      data: computed(() => contexts.value.flatMap((context) => context.rooms)),
      isFetching,
      isError: computed(() => contexts.value.some((context) => context.roomError)),
      refetch: async () => {
        await Promise.all(
          params.value.map((request) =>
            client.invalidateQueries({
              queryKey: cinemaRoomQueryKeys.active(request.cinemaId),
              refetchType: 'none',
            }),
          ),
        )
        await refresh()
      },
    },
    refetchCinema: async (cinemaId: string) => {
      const query =
        queries.value[params.value.findIndex((request) => request.cinemaId === cinemaId)]
      if (!query) return { isError: true, data: [] }
      const result = await query.refetch()
      return { isError: result.isError, data: result.data?.showtimes ?? [] }
    },
  }
}
