import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'

export const cinemaRoomQueryKeys = {
  active: (cinemaId: string) => ['cinemas', 'active-rooms', cinemaId] as const,
}

export function useCinemaRoomsQuery(cinemaId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(cinemaId))

  return useQuery({
    queryKey: computed(() => cinemaRoomQueryKeys.active(id.value)),
    enabled: computed(() => Boolean(id.value)),
    retry: false,
    queryFn: ({ queryKey }) => {
      const requestedCinemaId = queryKey[2]

      return requestedCinemaId
        ? getActiveRooms({ cinemaId: requestedCinemaId })
        : Promise.resolve([])
    },
  })
}
