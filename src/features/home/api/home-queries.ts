import { useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { findAll } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getActiveRooms } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import {
  getByMovieId,
  getByRoomId,
} from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import { toHomeMovie } from '../mappers/home-movie.mapper'

export const homeQueryKeys = {
  movies: ['home', 'movies'] as const,
  cinemas: ['home', 'cinemas'] as const,
  showtimes: (movieId: string) => ['home', 'showtimes', movieId] as const,
  cinemaProgramme: (cinemaId: string) => ['home', 'cinema-programme', cinemaId] as const,
}

export function useHomeMovies() {
  return useQuery({
    queryKey: homeQueryKeys.movies,
    queryFn: findAll,
    select: (response) => response.map(toHomeMovie).filter((movie) => movie !== null),
  })
}

export function useHomeCinemas() {
  return useQuery({
    queryKey: homeQueryKeys.cinemas,
    queryFn: () => getActiveCinemas(),
  })
}

export function useHomeShowtimes(movieId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(movieId))

  return useQuery({
    queryKey: computed(() => homeQueryKeys.showtimes(id.value)),
    queryFn: () => getByMovieId(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

const ROOM_REQUEST_CONCURRENCY = 4

function ensureActive(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('Query cancelled', 'AbortError')
  }
}

export function useHomeCinemaProgramme(cinemaId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(cinemaId))

  return useQuery({
    queryKey: computed(() => homeQueryKeys.cinemaProgramme(id.value)),
    enabled: computed(() => Boolean(id.value)),
    retry: false,

    queryFn: async ({ signal }): Promise<ShowtimeResponse[]> => {
      // Giữ ID của request này khi người dùng đổi rạp trong lúc tải.
      const requestedCinemaId = id.value

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
