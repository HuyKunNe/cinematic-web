<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  watchEffect,
} from 'vue'
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { getCinemaDateKey, formatCinemaTime, getCinemaDayRange } from '@/utils/cinema-time'
import { useHomeShowtimes, useHomeBookableShowtimes } from '../api/home-queries'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'
import type { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { CalendarDays, ChevronDown, Clapperboard, Clock3, MapPin } from 'lucide-vue-next'
import { useCinemaLocation, useCinemaLocationDialog, useCinemaRoomsQuery } from '@/features/cinemas'

const props = defineProps<{
  movies: HomeMovie[]
  moviesLoading: boolean
  moviesError: boolean
  locationChanged: boolean
  selectedMovieId?: string
}>()

const emit = defineEmits<{
  'retry-movies': []
  'dismiss-location-notice': []
  'movie-change': [movieId: string]
}>()

const router = useRouter()

const { isOpen: locationDialogOpen, open: openLocation } = useCinemaLocationDialog()

const {
  query: cinemasQuery,
  location,
  cinemas: locationCinemas,
  selectedCity,
  selectedCinema,
  locationDescription,
} = useCinemaLocation()

const cinemas = computed(() => {
  const cityKey = location.selectedCityKey

  return cityKey
    ? locationCinemas.value.filter((cinema) => cinema.cityKey === cityKey)
    : locationCinemas.value
})

// Location chỉ được cập nhật qua bộ chọn thành phố và rạp.
const cinemaSelection = computed(() => selectedCinema.value?.id ?? '')

const selection = reactive({
  cinema: cinemaSelection,
  movie: props.selectedMovieId ?? '',
  date: '',
  showtime: '',
})

const checking = ref(false)
function openBookingLocation(event: Event) {
  if (checking.value) return

  const trigger = event.currentTarget

  if (trigger instanceof HTMLButtonElement) {
    openLocation(trigger)
  }
}
const navigationError = ref('')
const now = ref(Date.now())
let clockTimer: number | undefined
let disposed = false

const showtimesQuery = useHomeShowtimes(() => selection.movie)

const roomsQuery = useCinemaRoomsQuery(() => selection.cinema)

const roomTypeLabels: Record<RoomResponseRoomType, string> = {
  STANDARD: 'Tiêu chuẩn',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  SCREEN_X: 'ScreenX',
  VIP: 'VIP',
}

const roomsById = computed(
  () =>
    new Map(
      (roomsQuery.data.value ?? [])
        .filter(
          (room) => Boolean(room.id) && room.active === true && room.cinemaId === selection.cinema,
        )
        .map((room) => [room.id, room] as const),
    ),
)

const hasCinema = computed(() => cinemas.value.some((cinema) => cinema.id === selection.cinema))

const hasMovie = computed(() => props.movies.some((movie) => movie.id === selection.movie))

const showtimesReady = computed(
  () =>
    hasCinema.value &&
    hasMovie.value &&
    showtimesQuery.isSuccess.value &&
    !showtimesQuery.isFetching.value,
)

function toAvailableShowtimes(showtimes: ShowtimeResponse[]) {
  if (!hasCinema.value || !hasMovie.value) return []

  return showtimes
    .flatMap((showtime) => {
      if (
        !showtime.id ||
        !showtime.startsAt ||
        showtime.movieId !== selection.movie ||
        showtime.cinemaId !== selection.cinema ||
        showtime.status !== 'OPEN_FOR_BOOKING'
      ) {
        return []
      }

      const startsAtMs = Date.parse(showtime.startsAt)

      if (!Number.isFinite(startsAtMs) || startsAtMs <= now.value) {
        return []
      }

      return [
        {
          id: showtime.id,
          startsAt: showtime.startsAt,
          roomId: showtime.roomId,
          startsAtMs,
          roomName: showtime.roomName,
        },
      ]
    })
    .sort((a, b) => a.startsAtMs - b.startsAtMs)
}

const available = computed(() => toAvailableShowtimes(showtimesQuery.data.value ?? []))

const dates = computed(() =>
  [
    ...new Set(available.value.map((showtime) => localDate(showtime.startsAt)).filter(Boolean)),
  ].sort(),
)

const bookableQuery = useHomeBookableShowtimes(() => {
  if (
    !hasCinema.value ||
    !hasMovie.value ||
    !selection.date ||
    !dates.value.includes(selection.date)
  ) {
    return null
  }

  const range = getCinemaDayRange(selection.date)
  if (!range) return null

  return {
    cinemaId: selection.cinema,
    movieId: selection.movie,
    ...range,
  }
})

const bookableReady = computed(
  () => bookableQuery.isSuccess.value && !bookableQuery.isFetching.value,
)

const times = computed(() =>
  toAvailableShowtimes(bookableQuery.data.value ?? []).filter(
    (showtime) => localDate(showtime.startsAt) === selection.date,
  ),
)

const canChooseMovie = computed(
  () =>
    hasCinema.value &&
    !cinemasQuery.isFetching.value &&
    !cinemasQuery.isError.value &&
    !props.moviesLoading &&
    !props.moviesError &&
    props.movies.length > 0,
)

const canChooseDate = computed(
  () => canChooseMovie.value && hasMovie.value && showtimesReady.value && dates.value.length > 0,
)

const canChooseShowtime = computed(
  () =>
    canChooseDate.value &&
    dates.value.includes(selection.date) &&
    bookableReady.value &&
    times.value.length > 0,
)

const canContinue = computed(
  () =>
    !checking.value &&
    canChooseShowtime.value &&
    times.value.some((showtime) => showtime.id === selection.showtime),
)

const fields = computed(() => [
  {
    key: 'cinema' as const,
    label: 'Địa điểm',
    mobileLabel: 'Địa điểm',
    icon: MapPin,
    placeholder: 'Chọn thành phố và rạp',
    disabled: checking.value,
    options: [],
  },
  {
    key: 'movie' as const,
    label: 'Chọn phim',
    mobileLabel: 'Phim',
    icon: Clapperboard,
    placeholder: !hasCinema.value
      ? 'Chọn rạp trước'
      : props.moviesLoading
        ? 'Đang tải phim…'
        : 'Chọn phim',
    disabled: checking.value || !canChooseMovie.value,
    options: props.movies.map((movie) => ({
      value: movie.id,
      label: movie.title,
    })),
  },
  {
    key: 'date' as const,
    label: 'Chọn ngày',
    mobileLabel: 'Ngày',
    icon: CalendarDays,
    placeholder:
      !hasCinema.value || !hasMovie.value
        ? 'Chọn rạp và phim trước'
        : showtimesQuery.isFetching.value
          ? 'Đang tải lịch chiếu…'
          : 'Chọn ngày',
    disabled: checking.value || !canChooseDate.value,
    options: dates.value.map((date) => ({
      value: date,
      label: labelDate(date),
    })),
  },
  {
    key: 'showtime' as const,
    label: 'Chọn suất',
    mobileLabel: 'Suất chiếu',
    icon: Clock3,
    placeholder: !selection.date
      ? 'Chọn ngày trước'
      : bookableQuery.isFetching.value
        ? 'Đang tải suất chiếu…'
        : 'Chọn suất',
    disabled: checking.value || !canChooseShowtime.value,
    options: times.value.map((showtime) => ({
      value: showtime.id,
      label: labelShowtime(showtime),
    })),
  },
])

const errorMessage = computed(() => {
  if (navigationError.value) return navigationError.value
  if (cinemasQuery.isError.value) return 'Không thể tải rạp. Vui lòng thử lại.'
  if (props.moviesError) return 'Không thể tải phim. Vui lòng thử lại.'

  if (hasMovie.value && showtimesQuery.isError.value) {
    return 'Không thể tải lịch chiếu. Vui lòng thử lại.'
  }

  if (selection.date && bookableQuery.isError.value) {
    return 'Không thể tải suất mở bán của ngày đã chọn. Vui lòng thử lại.'
  }
  if (hasCinema.value && roomsQuery.isError.value) {
    return 'Chưa thể tải loại phòng. Bạn vẫn có thể chọn suất theo giờ và tên phòng.'
  }
  return ''
})

const helperMessage = computed(() => {
  if (checking.value) return 'Đang kiểm tra lại suất chiếu…'

  if (cinemasQuery.isPending.value) {
    return 'Đang tải danh sách rạp…'
  }

  if (cinemasQuery.isFetching.value) {
    return 'Đang cập nhật danh sách rạp…'
  }

  if (!cinemas.value.length) {
    return 'Chưa có rạp đang hoạt động.'
  }

  if (!hasCinema.value) {
    return 'Chọn thành phố và rạp để bắt đầu đặt vé nhanh.'
  }

  if (props.moviesLoading) {
    return 'Đang tải danh sách phim…'
  }

  if (!props.movies.length) {
    return 'Rạp này hiện chưa có phim đang mở bán. Bạn có thể chọn rạp khác.'
  }

  if (!hasMovie.value) {
    return props.locationChanged
      ? 'Vui lòng chọn lại phim để tiếp tục.'
      : 'Chọn phim để xem lịch mở bán tại rạp đã chọn.'
  }

  if (showtimesQuery.isFetching.value || !showtimesQuery.isSuccess.value) {
    return 'Đang cập nhật lịch chiếu…'
  }

  if (!available.value.length) {
    return 'Phim này chưa có suất mở bán tại rạp đã chọn. Bạn có thể chọn phim hoặc rạp khác.'
  }

  if (!selection.date) {
    return 'Chọn ngày có suất mở bán.'
  }

  if (bookableQuery.isFetching.value || !bookableQuery.isSuccess.value) {
    return 'Đang tải suất mở bán của ngày đã chọn…'
  }

  if (!times.value.length) {
    return 'Ngày đã chọn hiện không có suất mở bán. Vui lòng chọn ngày hoặc rạp khác.'
  }

  if (!selection.showtime) {
    return 'Chọn giờ chiếu và phòng chiếu phù hợp.'
  }

  return 'Đã chọn suất chiếu. Nhấn Tiếp tục để sang bước tiếp theo.'
})

const feedbackMessage = computed(() => {
  const locationNotice =
    props.locationChanged && hasCinema.value && !hasMovie.value ? 'Đã đổi rạp. ' : ''

  return `${locationNotice}${errorMessage.value || helperMessage.value}`
})

const canChangeCinema = computed(() => {
  if (
    checking.value ||
    !hasCinema.value ||
    cinemasQuery.isFetching.value ||
    cinemasQuery.isError.value ||
    props.moviesLoading ||
    props.moviesError
  ) {
    return false
  }

  // Danh mục theo rạp đã tải xong nhưng không có phim mở bán.
  if (!props.movies.length) return true

  if (!hasMovie.value || showtimesQuery.isFetching.value || !showtimesQuery.isSuccess.value) {
    return false
  }

  // Phim đã chọn không còn suất mở bán trong tương lai.
  if (!available.value.length) return true

  // Ngày đã chọn tải thành công nhưng không còn suất phù hợp.
  return Boolean(selection.date && bookableReady.value && !times.value.length)
})

const canRetry = computed(
  () =>
    cinemasQuery.isError.value ||
    props.moviesError ||
    (hasMovie.value && showtimesQuery.isError.value) ||
    (Boolean(selection.date) && bookableQuery.isError.value),
)

function localDate(iso: string) {
  return getCinemaDateKey(iso)
}

function labelTime(iso: string) {
  return formatCinemaTime(iso)
}

function labelShowtime(showtime: (typeof available.value)[number]) {
  const room = roomsById.value.get(showtime.roomId ?? '')

  const roomTypeLabel = room?.roomType
    ? roomTypeLabels[room.roomType]
    : roomsQuery.isFetching.value
      ? 'Đang tải loại phòng…'
      : 'Chưa có loại phòng'

  return [labelTime(showtime.startsAt), roomTypeLabel].filter(Boolean).join(' · ')
}

function labelDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${date}T12:00:00+07:00`))
}

type BookingDropdown = 'movie' | 'date' | 'showtime'

const openField = ref<BookingDropdown | null>(null)
const pendingField = ref<BookingDropdown | null>(null)

function dropdownReady(field: BookingDropdown) {
  if (checking.value || locationDialogOpen.value) return false

  if (field === 'movie') return canChooseMovie.value
  if (field === 'date') return canChooseDate.value
  return canChooseShowtime.value
}

function requestDropdown(field: BookingDropdown | null) {
  openField.value = null
  pendingField.value = field
}

function handleDropdownOpen(fieldKey: string, open: boolean) {
  if (fieldKey !== 'movie' && fieldKey !== 'date' && fieldKey !== 'showtime') {
    return
  }

  if (open) {
    // Người dùng mở một field thủ công: hủy bước tự mở đang chờ.
    pendingField.value = null
    openField.value = dropdownReady(fieldKey) ? fieldKey : null
  } else if (openField.value === fieldKey) {
    openField.value = null
  }
}

function handleDropdownCloseFocus(event: Event) {
  // Tránh dropdown vừa đóng lấy lại focus từ dropdown kế tiếp.
  if (pendingField.value || openField.value) {
    event.preventDefault()
  }
}

function handleSelectChange(fieldKey: string, value: unknown) {
  if (typeof value !== 'string') return

  if (fieldKey === 'movie') {
    if (!canChooseMovie.value || !props.movies.some((movie) => movie.id === value)) {
      return
    }

    selection.movie = value
    navigationError.value = ''
    emit('movie-change', value)
    requestDropdown('date')
    return
  }

  if (fieldKey === 'date') {
    if (!canChooseDate.value || !dates.value.includes(value)) return

    selection.date = value
    navigationError.value = ''
    requestDropdown('showtime')
    return
  }

  if (fieldKey === 'showtime') {
    if (!canChooseShowtime.value || !times.value.some((showtime) => showtime.id === value)) {
      return
    }

    selection.showtime = value
    requestDropdown(null)
  }
}

watch(
  () => selection.cinema,
  (cinemaId, previousCinemaId) => {
    if (cinemaId === previousCinemaId) return

    // Home chọn lại phim theo rạp mới.
    // Trang /booking giữ phim được quản lý bằng URL.
    if (props.selectedMovieId === undefined) {
      selection.movie = ''
    }

    requestDropdown(cinemaId ? (selection.movie ? 'date' : 'movie') : null)
  },
  { flush: 'sync' },
)

watchEffect((onCleanup) => {
  if (openField.value && !dropdownReady(openField.value)) {
    openField.value = null
  }

  const field = pendingField.value
  if (!field || !dropdownReady(field)) return

  let cancelled = false
  let frame: number | undefined

  // Đợi DOM cập nhật và bước trả focus của dialog/dropdown trước.
  void nextTick(() => {
    if (cancelled || disposed) return

    frame = window.requestAnimationFrame(() => {
      if (cancelled || disposed || pendingField.value !== field || !dropdownReady(field)) {
        return
      }

      pendingField.value = null
      openField.value = field
    })
  })

  onCleanup(() => {
    cancelled = true
    if (frame !== undefined) window.cancelAnimationFrame(frame)
  })
})

function updateClock() {
  now.value = Date.now()
}

watch(
  [() => selection.cinema, () => selection.movie],
  () => {
    selection.date = ''
    selection.showtime = ''
    navigationError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => selection.date,
  () => {
    selection.showtime = ''
    navigationError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => selection.showtime,
  () => {
    navigationError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => props.selectedMovieId,
  (movieId) => {
    if (movieId !== undefined && movieId !== selection.movie) {
      selection.movie = movieId
    }
  },
  { flush: 'sync' },
)

watch(
  [() => props.movies, () => props.moviesLoading, () => props.moviesError],
  ([movies, moviesLoading, moviesError]) => {
    // Trang đặt vé quản lý phim qua URL.
    // Không xóa phim trong lúc tải dữ liệu hoặc đổi rạp.
    if (moviesLoading || moviesError || props.selectedMovieId !== undefined) {
      return
    }

    if (selection.movie && !movies.some((movie) => movie.id === selection.movie)) {
      selection.movie = ''
    }
  },
)

watch(
  () => selection.movie,
  (movieId) => {
    if (movieId && props.locationChanged) {
      emit('dismiss-location-notice')
    }
  },
)

watch([dates, times], () => {
  if (selection.date && !dates.value.includes(selection.date)) {
    selection.date = ''
  }
  if (selection.showtime && !times.value.some((showtime) => showtime.id === selection.showtime)) {
    selection.showtime = ''
  }
})

function retryLoading() {
  if (checking.value) return

  navigationError.value = ''

  if (props.moviesError) emit('retry-movies')
  if (cinemasQuery.isError.value) void cinemasQuery.refetch()
  if (hasCinema.value && roomsQuery.isError.value) {
    void roomsQuery.refetch()
  }
  if (hasMovie.value && showtimesQuery.isError.value) {
    void showtimesQuery.refetch()
  }

  if (selection.date && bookableQuery.isError.value) {
    void bookableQuery.refetch()
  }
}

async function continueBooking() {
  updateClock()
  if (!canContinue.value) return

  const chosen = { ...selection }
  checking.value = true
  navigationError.value = ''

  try {
    const result = await bookableQuery.refetch()
    if (disposed) return

    updateClock()

    if (result.isError) {
      navigationError.value = 'Không thể kiểm tra suất chiếu. Vui lòng thử lại.'
      return
    }

    const stillAvailable = times.value.some(
      (showtime) => showtime.id === chosen.showtime && localDate(showtime.startsAt) === chosen.date,
    )

    if (
      !stillAvailable ||
      !canChooseDate.value ||
      selection.cinema !== chosen.cinema ||
      selection.movie !== chosen.movie ||
      selection.date !== chosen.date
    ) {
      selection.showtime = ''
      navigationError.value = 'Lựa chọn không còn hợp lệ. Vui lòng chọn lại ngày hoặc suất.'
      return
    }

    const failure = await router.push({
      name: ROUTE_NAMES.BOOKING,
      params: { showtimeId: chosen.showtime },
    })

    if (!disposed && failure) {
      navigationError.value = 'Chưa thể chuyển trang. Vui lòng nhấn Tiếp tục lại.'
    }
  } catch {
    if (!disposed) {
      navigationError.value = 'Chưa thể tiếp tục. Vui lòng thử lại.'
    }
  } finally {
    if (!disposed) checking.value = false
  }
}

onMounted(() => {
  updateClock()
  clockTimer = window.setInterval(updateClock, 30_000)
  document.addEventListener('visibilitychange', updateClock)
})

onBeforeUnmount(() => {
  disposed = true
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', updateClock)
})
</script>

<template>
  <section
    id="quick-booking"
    class="home-container home-booking"
    aria-labelledby="quick-booking-title"
  >
    <h2 id="quick-booking-title">Đặt vé nhanh</h2>
    <template v-for="(field, index) in fields" :key="field.key">
      <div class="home-booking__step">
        <label :for="`home-${field.key}`">
          <span class="home-booking__number">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
          <span class="home-booking__label">{{ field.label }}</span>
        </label>

        <div
          class="home-booking__control"
          :class="{
            'home-booking__control--selected': Boolean(selection[field.key]),
          }"
        >
          <component :is="field.icon" aria-hidden="true" />

          <span class="home-booking__mobile-label">
            {{ field.mobileLabel }}
          </span>
          <button
            v-if="field.key === 'cinema'"
            :id="`home-${field.key}`"
            class="home-booking__location"
            type="button"
            data-location-trigger
            aria-haspopup="dialog"
            aria-controls="cinema-location-dialog"
            :aria-expanded="locationDialogOpen"
            :aria-label="locationDescription"
            aria-describedby="quick-booking-feedback"
            :title="locationDescription"
            :disabled="field.disabled"
            @click="openBookingLocation"
          >
            <span class="home-booking__location-copy">
              <span class="home-booking__location-name">
                {{ selectedCinema?.name ?? 'Chọn thành phố và rạp' }}
              </span>

              <span v-if="selectedCity" class="home-booking__location-city">
                {{ selectedCity.name }}
              </span>
            </span>

            <ChevronDown aria-hidden="true" />
          </button>

          <SelectRoot
            v-else
            :model-value="selection[field.key]"
            :open="openField === field.key"
            :disabled="field.disabled"
            @update:model-value="handleSelectChange(field.key, $event)"
            @update:open="handleDropdownOpen(field.key, $event)"
          >
            <SelectTrigger
              :id="`home-${field.key}`"
              class="home-booking__select-trigger"
              :aria-label="field.label"
              aria-describedby="quick-booking-feedback"
            >
              <span class="home-booking__select-value">
                <SelectValue :placeholder="field.placeholder" />
              </span>
              <ChevronDown aria-hidden="true" />
            </SelectTrigger>

            <SelectPortal>
              <SelectContent
                class="home-booking__select-content"
                position="popper"
                side="bottom"
                align="start"
                @close-auto-focus="handleDropdownCloseFocus"
              >
                <SelectViewport class="home-booking__select-viewport">
                  <SelectItem
                    v-for="option in field.options"
                    :key="option.value"
                    :value="option.value"
                    class="home-booking__select-item"
                  >
                    <SelectItemText>{{ option.label }}</SelectItemText>
                  </SelectItem>
                </SelectViewport>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
        </div>
      </div>

      <span v-if="index < fields.length - 1" class="home-booking__chevron" aria-hidden="true">
        ›
      </span>
    </template>

    <button
      class="home-button home-button--primary home-booking__continue"
      type="button"
      :disabled="!canContinue"
      :aria-busy="checking"
      @click="continueBooking"
    >
      {{ checking ? 'Đang kiểm tra…' : 'Tiếp tục →' }}
    </button>

    <div class="home-booking__feedback-row">
      <p
        id="quick-booking-feedback"
        class="home-booking__feedback"
        :class="{ 'home-booking__feedback--error': Boolean(errorMessage) }"
        :role="errorMessage ? 'alert' : 'status'"
        aria-atomic="true"
      >
        {{ feedbackMessage }}
      </p>

      <div v-if="canRetry || canChangeCinema" class="home-booking__feedback-actions">
        <button
          v-if="canRetry"
          class="home-booking__retry"
          type="button"
          :disabled="
            checking ||
            cinemasQuery.isFetching.value ||
            roomsQuery.isFetching.value ||
            moviesLoading ||
            showtimesQuery.isFetching.value ||
            bookableQuery.isFetching.value
          "
          @click="retryLoading"
        >
          Thử lại
        </button>

        <button
          v-if="canChangeCinema"
          id="home-change-cinema"
          class="home-booking__retry"
          type="button"
          data-location-trigger
          aria-haspopup="dialog"
          aria-controls="cinema-location-dialog"
          :aria-expanded="locationDialogOpen"
          :disabled="checking"
          @click="openBookingLocation"
        >
          Đổi rạp
        </button>
      </div>
    </div>
  </section>
</template>
