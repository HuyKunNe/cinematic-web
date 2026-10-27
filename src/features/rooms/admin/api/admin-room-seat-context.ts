import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getRoomById } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { getCinemaById } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import type { CinemaResponse, RoomResponse } from '@/services/api/generated/inventory-service/model'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'

interface RoomSeatContext {
  room: RoomResponse
  cinema: CinemaResponse
}

export function useAdminRoomSeatContext(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['rooms', 'admin', 'seat-context', toValue(roomId)] as const),
    enabled: computed(() => toValue(enabled) && isRoomSeatUuid(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ queryKey }): Promise<RoomSeatContext> => {
      const requestedRoomId = queryKey[3]
      const room = await getRoomById(requestedRoomId)

      if (
        room.id !== requestedRoomId ||
        !isRoomSeatUuid(room.cinemaId) ||
        !room.name?.trim() ||
        typeof room.active !== 'boolean'
      ) {
        throw new Error('Thông tin phòng không hợp lệ. Hãy tải lại.')
      }

      const cinema = await getCinemaById(room.cinemaId)

      if (
        cinema.id !== room.cinemaId ||
        !cinema.name?.trim() ||
        typeof cinema.active !== 'boolean'
      ) {
        throw new Error('Thông tin rạp không hợp lệ. Hãy tải lại.')
      }

      return { room, cinema }
    },
  })
}
