import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getShowtimeById } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { getRoomById } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { getCinemaById } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getShowtimeSeatMap } from '@/services/api/generated/inventory-service/showtime-seat-map-controller/showtime-seat-map-controller'
import { findMovieById } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import type { RoomResponse } from '@/services/api/generated/inventory-service/model/roomResponse'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model/cinemaResponse'
import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { ApiError } from '@/services/http/api-error'
import type { BookingSeatMap } from '../models/booking-seat.model'
import { mapBookingSeatMap } from '../mappers/booking-seat.mapper'

export interface BookingContext {
  showtime: ShowtimeResponse
  room: RoomResponse
  cinema: CinemaResponse
  movie: MovieResponse
}

export function isBookingUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

const bookingQueryKeys = {
  context: (showtimeId: string) => ['booking', 'context', showtimeId] as const,
  seats: (showtimeId: string, roomId: string) => ['booking', 'seats', showtimeId, roomId] as const,
}

async function readBookingContext(showtimeId: string): Promise<BookingContext | null> {
  const showtime = await getShowtimeById(showtimeId)
  const { id, movieId, roomId, cinemaId, startsAt } = showtime

  if (
    id !== showtimeId ||
    !isBookingUuid(movieId) ||
    !isBookingUuid(roomId) ||
    !isBookingUuid(cinemaId) ||
    !startsAt ||
    !Number.isFinite(Date.parse(startsAt))
  ) {
    return null
  }

  const [movie, room, cinema] = await Promise.all([
    findMovieById(movieId),
    getRoomById(roomId),
    getCinemaById(cinemaId),
  ])

  if (
    movie.id !== movieId ||
    room.id !== roomId ||
    room.cinemaId !== cinemaId ||
    cinema.id !== cinemaId
  ) {
    return null
  }

  return { showtime, movie, room, cinema }
}

export function useBookingContextQuery(showtimeId: MaybeRefOrGetter<string>) {
  return useQuery<
    BookingContext | null,
    ApiError,
    BookingContext | null,
    ReturnType<typeof bookingQueryKeys.context>
  >({
    queryKey: computed(() => bookingQueryKeys.context(toValue(showtimeId))),
    enabled: computed(() => isBookingUuid(toValue(showtimeId))),
    queryFn: ({ queryKey }) => readBookingContext(queryKey[2]),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.error ? false : 30_000),
  })
}

export function useBookingSeatsQuery(
  showtimeId: MaybeRefOrGetter<string>,
  roomId: MaybeRefOrGetter<string>,
) {
  return useQuery<
    BookingSeatMap,
    ApiError,
    BookingSeatMap,
    ReturnType<typeof bookingQueryKeys.seats>
  >({
    queryKey: computed(() => bookingQueryKeys.seats(toValue(showtimeId), toValue(roomId))),
    enabled: computed(() => isBookingUuid(toValue(showtimeId)) && isBookingUuid(toValue(roomId))),
    queryFn: async ({ queryKey }) => {
      const currentShowtimeId = queryKey[2]
      const currentRoomId = queryKey[3]

      const snapshot = await getShowtimeSeatMap(currentShowtimeId)
      return mapBookingSeatMap(snapshot, currentRoomId, currentShowtimeId)
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.error ? false : 15_000),
  })
}
