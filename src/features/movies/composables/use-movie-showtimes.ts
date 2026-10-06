import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { useRouter } from 'vue-router'
import { useCinemaLocation, useCinemaRoomsQuery } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
import { getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import type { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { useMovieBookableShowtimes } from '../api/movie-showtime.queries'

type BookableShowtime = ShowtimeResponse & {
  id: string
  startsAt: string
}

const roomTypeLabels: Record<RoomResponseRoomType, string> = {
  STANDARD: 'Tiêu chuẩn',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  SCREEN_X: 'ScreenX',
  VIP: 'VIP',
}

export function useMovieShowtimes(movieId: MaybeRefOrGetter<string>) {
  const router = useRouter()

  const {
    query: locationQuery,
    selectedCinema,
    selectedCity,
    locationDescription,
  } = useCinemaLocation()

  const now = ref(Date.now())
  const today = computed(() => getCinemaDateKey(new Date(now.value).toISOString()))

  const selectedDate = ref(today.value)
  const checkingId = ref('')
  const navigationError = ref('')

  let timer: number | undefined
  let disposed = false

  const cinemaId = computed(() => selectedCinema.value?.id ?? '')

  const dateValid = computed(() =>
    Boolean(getCinemaDayRange(selectedDate.value) && selectedDate.value >= today.value),
  )

  const locationReady = computed(
    () =>
      locationQuery.isSuccess.value &&
      !locationQuery.isFetching.value &&
      !locationQuery.isError.value &&
      Boolean(cinemaId.value),
  )

  const request = computed<GetBookableShowtimesParams | null>(() => {
    const id = toValue(movieId)
    const range = getCinemaDayRange(selectedDate.value)

    if (!id || !locationReady.value || !dateValid.value || !range) {
      return null
    }

    return {
      cinemaId: cinemaId.value,
      movieId: id,
      ...range,
    }
  })

  const scopeKey = computed(() => [toValue(movieId), cinemaId.value, selectedDate.value].join('|'))

  const showtimesQuery = useMovieBookableShowtimes(request)
  const roomsQuery = useCinemaRoomsQuery(cinemaId)

  const roomsById = computed(
    () =>
      new Map(
        (roomsQuery.data.value ?? [])
          .filter(
            (room) => Boolean(room.id) && room.active === true && room.cinemaId === cinemaId.value,
          )
          .map((room) => [room.id, room] as const),
      ),
  )

  function filterShowtimes(items: ShowtimeResponse[]): BookableShowtime[] {
    const params = request.value

    if (!params) return []

    const from = Date.parse(params.from)
    const to = Date.parse(params.to)

    return items
      .filter((item): item is BookableShowtime => {
        const startsAt = Date.parse(item.startsAt ?? '')

        return Boolean(
          item.id &&
          item.startsAt &&
          item.movieId === params.movieId &&
          item.cinemaId === params.cinemaId &&
          item.status === 'OPEN_FOR_BOOKING' &&
          Number.isFinite(startsAt) &&
          startsAt > now.value &&
          startsAt >= from &&
          startsAt < to,
        )
      })
      .sort(
        (first, second) =>
          Date.parse(first.startsAt) - Date.parse(second.startsAt) ||
          first.id.localeCompare(second.id),
      )
  }

  const showtimes = computed(() => filterShowtimes(showtimesQuery.data.value ?? []))

  const canBook = computed(
    () =>
      Boolean(request.value) &&
      showtimesQuery.isSuccess.value &&
      !showtimesQuery.isFetching.value &&
      !checkingId.value,
  )

  function roomCaption(showtime: BookableShowtime): string {
    const room = roomsById.value.get(showtime.roomId ?? '')

    const typeLabel = room?.roomType
      ? roomTypeLabels[room.roomType] || 'Loại phòng chưa cập nhật'
      : roomsQuery.isFetching.value
        ? 'Đang tải loại phòng…'
        : 'Loại phòng chưa cập nhật'

    const roomName = showtime.roomName?.trim() || room?.name?.trim()

    return [typeLabel, roomName].filter(Boolean).join(' · ')
  }

  watch(
    scopeKey,
    () => {
      navigationError.value = ''
    },
    { flush: 'sync' },
  )

  watch(today, (value) => {
    if (selectedDate.value && selectedDate.value < value) {
      selectedDate.value = value
    }
  })

  function updateClock() {
    now.value = Date.now()
  }

  function retryShowtimes() {
    if (!request.value || checkingId.value) return

    navigationError.value = ''
    void showtimesQuery.refetch()
  }

  async function selectShowtime(showtimeId: string) {
    updateClock()

    if (!canBook.value || !showtimes.value.some((item) => item.id === showtimeId)) {
      return
    }

    const chosenScope = scopeKey.value

    checkingId.value = showtimeId
    navigationError.value = ''

    try {
      const result = await showtimesQuery.refetch()

      if (disposed || chosenScope !== scopeKey.value) return

      updateClock()

      if (result.isError) {
        navigationError.value = 'Không thể kiểm tra lại suất chiếu. Vui lòng thử lại.'
        return
      }

      if (!locationReady.value) {
        navigationError.value = 'Địa điểm đang được cập nhật. Vui lòng chọn suất lại.'
        return
      }

      const stillBookable = filterShowtimes(result.data ?? []).some(
        (item) => item.id === showtimeId,
      )

      if (!stillBookable) {
        navigationError.value = 'Suất này không còn mở bán. Vui lòng chọn suất khác.'
        return
      }

      await router.push({
        name: ROUTE_NAMES.BOOKING,
        params: { showtimeId },
      })
    } catch {
      if (!disposed && chosenScope === scopeKey.value) {
        navigationError.value = 'Chưa thể tiếp tục đặt vé. Vui lòng thử lại.'
      }
    } finally {
      if (!disposed) checkingId.value = ''
    }
  }

  onMounted(() => {
    updateClock()
    timer = window.setInterval(updateClock, 30_000)
    document.addEventListener('visibilitychange', updateClock)
  })

  onBeforeUnmount(() => {
    disposed = true

    if (timer !== undefined) window.clearInterval(timer)

    document.removeEventListener('visibilitychange', updateClock)
  })

  return {
    locationQuery,
    selectedCinema,
    selectedCity,
    locationDescription,
    today,
    selectedDate,
    dateValid,
    showtimesQuery,
    roomsQuery,
    showtimes,
    checkingId,
    navigationError,
    canBook,
    roomCaption,
    retryShowtimes,
    selectShowtime,
  }
}
