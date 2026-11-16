import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useCinemaLocation } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
import { getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import type { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { ShowtimeScreeningVersionResponseContentFormat } from '@/services/api/generated/inventory-service/model/showtimeScreeningVersionResponseContentFormat'
import { useMovieScheduleContexts } from '../api/movie-schedule-context.queries'

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
  const route = useRoute()

  const {
    query: locationQuery,
    selectedCinema: locationCinema,
    selectedCity: locationCity,
    cinemas,
    cities,
    selectCinemaById,
    locationDescription,
  } = useCinemaLocation()

  const now = ref(Date.now())
  const today = computed(() => getCinemaDateKey(new Date(now.value).toISOString()))

  const checkingId = ref('')
  const navigationError = ref('')
  const updatingFilters = ref(false)
  const requestedCinemaId = computed(() =>
    typeof route.query.cinema === 'string' ? route.query.cinema.toLowerCase() : '',
  )
  const selectedCinema = computed(() =>
    requestedCinemaId.value === 'all'
      ? undefined
      : requestedCinemaId.value
        ? cinemas.value.find((cinema) => cinema.id === requestedCinemaId.value)
        : locationCinema.value,
  )
  const selectedCity = computed(() =>
    selectedCinema.value
      ? cities.value.find((city) => city.key === selectedCinema.value?.cityKey)
      : locationCity.value,
  )
  const selectedDate = computed({
    get: () => (typeof route.query.date === 'string' ? route.query.date : today.value),
    set: (date: string) => {
      void updateFilters({ date })
    },
  })
  const selectedFormat = computed({
    get: () =>
      Object.values(ShowtimeScreeningVersionResponseContentFormat).find(
        (format) => route.query.format === format,
      ) ?? '',
    set: (format: string) => {
      void updateFilters({ format: format || undefined })
    },
  })

  async function updateFilters(query: LocationQueryRaw) {
    if (checkingId.value || updatingFilters.value) return
    const target = {
      path: route.path,
      query: {
        ...route.query,
        cinema: requestedCinemaId.value === 'all' ? 'all' : selectedCinema.value?.id,
        ...query,
      },
      hash: route.hash,
    }
    if (router.resolve(target).fullPath === route.fullPath) return
    updatingFilters.value = true
    navigationError.value = ''
    try {
      const failure = await router.push(target)
      if (failure) navigationError.value = 'Chưa thể cập nhật bộ lọc lịch chiếu. Vui lòng thử lại.'
    } catch {
      navigationError.value = 'Chưa thể cập nhật bộ lọc lịch chiếu. Vui lòng thử lại.'
    } finally {
      updatingFilters.value = false
    }
  }

  let timer: number | undefined
  let disposed = false

  const cinemaId = computed(() => selectedCinema.value?.id ?? '')
  const targetCinemas = computed(() => {
    if (requestedCinemaId.value && requestedCinemaId.value !== 'all' && !selectedCinema.value)
      return []
    return selectedCinema.value
      ? [selectedCinema.value]
      : cinemas.value.filter((cinema) => cinema.cityKey === selectedCity.value?.key)
  })

  const dateValid = computed(() =>
    Boolean(getCinemaDayRange(selectedDate.value) && selectedDate.value >= today.value),
  )

  const locationReady = computed(
    () =>
      locationQuery.isSuccess.value &&
      !locationQuery.isFetching.value &&
      !locationQuery.isError.value &&
      Boolean(selectedCity.value),
  )

  const requests = computed<GetBookableShowtimesParams[]>(() => {
    const id = toValue(movieId)
    const range = getCinemaDayRange(selectedDate.value)
    if (!id || !locationReady.value || !dateValid.value || !range) return []
    return targetCinemas.value.map((cinema) => ({ cinemaId: cinema.id, movieId: id, ...range }))
  })
  const scopeKey = computed(() =>
    [
      toValue(movieId),
      selectedCity.value?.key,
      cinemaId.value || 'all',
      selectedDate.value,
      selectedFormat.value,
    ].join('|'),
  )
  const { showtimesQuery, roomsQuery, refetchCinema } = useMovieScheduleContexts(requests)

  const roomsById = computed(
    () =>
      new Map(
        (roomsQuery.data.value ?? [])
          .filter(
            (room) =>
              Boolean(room.id) &&
              room.active === true &&
              targetCinemas.value.some((cinema) => cinema.id === room.cinemaId),
          )
          .map((room) => [room.id, room] as const),
      ),
  )

  function filterShowtimes(items: ShowtimeResponse[]): BookableShowtime[] {
    const byCinema = new Map(requests.value.map((params) => [params.cinemaId, params]))

    return items
      .filter((item): item is BookableShowtime => {
        const params = byCinema.get(item.cinemaId ?? '')
        if (!params) return false
        const from = Date.parse(params.from)
        const to = Date.parse(params.to)
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

  const allShowtimes = computed(() => filterShowtimes(showtimesQuery.data.value ?? []))
  const formats = computed(() =>
    [
      ...new Set(
        allShowtimes.value.flatMap((item) =>
          item.screeningVersion?.contentFormat ? [item.screeningVersion.contentFormat] : [],
        ),
      ),
    ].sort(),
  )
  const showtimes = computed(() =>
    allShowtimes.value.filter(
      (item) =>
        !selectedFormat.value || item.screeningVersion?.contentFormat === selectedFormat.value,
    ),
  )

  const canBook = computed(
    () =>
      requests.value.length > 0 &&
      showtimesQuery.isSuccess.value &&
      !showtimesQuery.isFetching.value &&
      !updatingFilters.value &&
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

    const version = showtime.screeningVersion
    const presentation =
      version?.presentationType === 'SUBTITLED'
        ? 'Phụ đề'
        : version?.presentationType === 'DUBBED'
          ? 'Lồng tiếng'
          : ''
    return [version?.contentFormat, version?.audioLanguage, presentation, typeLabel, roomName]
      .filter(Boolean)
      .join(' · ')
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

  watch(
    [requestedCinemaId, () => locationQuery.isSuccess.value],
    ([id, ready]) => {
      if (!id || id === 'all' || !ready) return
      const cinema = cinemas.value.find((item) => item.id === id)
      if (cinema) selectCinemaById(cinema.id, cinema.cityKey)
    },
    { immediate: true },
  )

  watch(
    () => locationCity.value?.key,
    (city, previous) => {
      if (
        city &&
        previous &&
        city !== previous &&
        requestedCinemaId.value &&
        requestedCinemaId.value !== 'all' &&
        selectedCinema.value?.cityKey !== city
      )
        void updateFilters({ cinema: undefined })
    },
  )

  function updateClock() {
    now.value = Date.now()
  }

  function retryShowtimes() {
    if (!requests.value.length || checkingId.value) return

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
      const chosen = showtimes.value.find((item) => item.id === showtimeId)
      if (!chosen?.cinemaId) return
      const result = await refetchCinema(chosen.cinemaId)

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
        (item) =>
          item.id === showtimeId &&
          (!selectedFormat.value || item.screeningVersion?.contentFormat === selectedFormat.value),
      )

      if (!stillBookable) {
        navigationError.value = 'Suất này không còn mở bán. Vui lòng chọn suất khác.'
        return
      }

      const cinema = targetCinemas.value.find((item) => item.id === chosen.cinemaId)
      if (!cinema || !selectCinemaById(cinema.id, cinema.cityKey)) {
        navigationError.value = 'Chưa thể chọn rạp của suất chiếu. Vui lòng thử lại.'
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
    selectedFormat,
    formats,
    updatingFilters,
    updateFilters,
    dateValid,
    showtimesQuery,
    roomsQuery,
    showtimes,
    targetCinemas,
    showtimeGroups: computed(() =>
      targetCinemas.value.flatMap((cinema) => {
        const slots = showtimes.value.filter((slot) => slot.cinemaId === cinema.id)
        return slots.length ? [{ cinema, slots }] : []
      }),
    ),
    checkingId,
    navigationError,
    canBook,
    roomCaption,
    retryShowtimes,
    selectShowtime,
  }
}
