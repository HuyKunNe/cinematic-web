import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { getByRoomId } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'

export const cinemaProgrammeQueryKeys = {
  programme: (cinemaId: string) => ['cinemas', 'programme', cinemaId] as const,
}

const ROOM_REQUEST_CONCURRENCY = 4

function ensureActive(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('Query cancelled', 'AbortError')
  }
}

export function useCinemaProgrammeQuery(cinemaId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(cinemaId))

  return useQuery({
    queryKey: computed(() => cinemaProgrammeQueryKeys.programme(id.value)),
    enabled: computed(() => Boolean(id.value)),
    retry: false,

    queryFn: async ({ queryKey, signal }): Promise<ShowtimeResponse[]> => {
      const requestedCinemaId = queryKey[2]

      if (!requestedCinemaId) return []

      ensureActive(signal)

      const rooms = await getActiveRooms({
        cinemaId: requestedCinemaId,
      })

      ensureActive(signal)

      const roomIds = [
        ...new Set(
          rooms.flatMap((room) =>
            room.id && room.active === true && room.cinemaId === requestedCinemaId ? [room.id] : [],
          ),
        ),
      ]

      const result: ShowtimeResponse[] = []

      for (let index = 0; index < roomIds.length; index += ROOM_REQUEST_CONCURRENCY) {
        ensureActive(signal)

        const batch = roomIds.slice(index, index + ROOM_REQUEST_CONCURRENCY)

        const responses = await Promise.all(
          batch.map(async (roomId) => {
            const showtimes = await getByRoomId(roomId)

            return showtimes.filter(
              (showtime) => showtime.roomId === roomId && showtime.cinemaId === requestedCinemaId,
            )
          }),
        )

        ensureActive(signal)
        result.push(...responses.flat())
      }

      return result
    },
  })
}
