import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getById as getShowtime } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { getById2 as getRoom } from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { getById3 as getCinema } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getActiveSeats } from '@/services/api/generated/inventory-service/seat-controller/seat-controller'
import { getByShowtimeId } from '@/services/api/generated/inventory-service/show-seat-controller/show-seat-controller'
import { findById as getMovie } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import type { RoomResponse } from '@/services/api/generated/inventory-service/model/roomResponse'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model/cinemaResponse'
import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { ApiError } from '@/services/http/api-error'
import type { BookingSeat } from '../models/booking-seat.model'
import { mapBookingSeats } from '../mappers/booking-seat.mapper'

interface BookingContext {
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
  const showtime = await getShowtime(showtimeId)
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
    getMovie(movieId),
    getRoom(roomId),
    getCinema(cinemaId),
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
    BookingSeat[],
    ApiError,
    BookingSeat[],
    ReturnType<typeof bookingQueryKeys.seats>
  >({
    queryKey: computed(() => bookingQueryKeys.seats(toValue(showtimeId), toValue(roomId))),
    enabled: computed(() => isBookingUuid(toValue(showtimeId)) && isBookingUuid(toValue(roomId))),
    queryFn: async ({ queryKey }) => {
      const currentShowtimeId = queryKey[2]
      const currentRoomId = queryKey[3]

      const [physicalSeats, showSeats] = await Promise.all([
        getActiveSeats({ roomId: currentRoomId }),
        getByShowtimeId({
          showtimeId: currentShowtimeId,
          availableOnly: false,
        }),
      ])

      return mapBookingSeats(physicalSeats, showSeats, currentRoomId, currentShowtimeId)
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.error ? false : 15_000),
  })
}
