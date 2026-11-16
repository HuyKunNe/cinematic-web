import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { cinemaRoomQueryKeys } from './cinema-room.queries'

export function useCinemaExperienceRooms(cinemaIds: MaybeRefOrGetter<string[]>) {
  const ids = computed(() => [...new Set(toValue(cinemaIds))])
  const queries = useQueries({
    queries: computed(() =>
      ids.value.map((id) => ({
        queryKey: cinemaRoomQueryKeys.active(id),
        queryFn: async () => {
          const rooms = await getActiveRooms({ cinemaId: id })
          if (
            rooms.some(
              (room) =>
                room.cinemaId !== id ||
                !room.roomType ||
                !Object.values(RoomResponseRoomType).includes(room.roomType),
            )
          ) {
            throw new Error('Thông tin phòng không khớp rạp hoặc loại phòng được hỗ trợ.')
          }
          return rooms
        },
        staleTime: 60_000,
        retry: false,
      })),
    ),
  })
  return {
    rooms: computed(() =>
      queries.value.flatMap((query) => (query.isSuccess ? (query.data ?? []) : [])),
    ),
    loading: computed(() => queries.value.some((query) => query.isFetching)),
    failed: computed(() => queries.value.some((query) => query.isError)),
    refresh: () => Promise.all(queries.value.map((query) => query.refetch())),
  }
}
