<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Clapperboard, Clock3, MapPin } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { useCinemaLocation } from '@/features/cinemas'
import {
  getCinemaDateKey,
  formatCinemaDateKey,
  formatCinemaTime,
  getCinemaDayRange,
} from '@/utils/cinema-time'
import { useHomeShowtimes, useHomeBookableShowtimes } from '../api/home-queries'
import type { ShowtimeResponse } from '@/services/api/generated/inventory-service/model/showtimeResponse'

const props = defineProps<{
  movies: HomeMovie[]
  moviesLoading: boolean
  moviesError: boolean
}>()

const emit = defineEmits<{
  'retry-movies': []
}>()

const router = useRouter()

const {
  query: cinemasQuery,
  location,
  cinemas: locationCinemas,
  selectedCinema,
  selectCinemaById,
} = useCinemaLocation()

const cinemas = computed(() => {
  const cityKey = location.selectedCityKey

  return cityKey
    ? locationCinemas.value.filter((cinema) => cinema.cityKey === cityKey)
    : locationCinemas.value
})

const cinemaSelection = computed({
  get: () => selectedCinema.value?.id ?? '',
  set: (cinemaId: string) => {
    if (!cinemaId) {
      location.clearCinema()
      return
    }

    const cinema = cinemas.value.find((item) => item.id === cinemaId)

    if (cinema) {
      selectCinemaById(cinema.id, cinema.cityKey)
    }
  },
})

const selection = reactive({
  cinema: cinemaSelection,
  movie: '',
  date: '',
  showtime: '',
})

const checking = ref(false)
const navigationError = ref('')
const now = ref(Date.now())
let clockTimer: number | undefined
let disposed = false

const showtimesQuery = useHomeShowtimes(() => selection.movie)

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
          startsAtMs,
          roomName: showtime.roomName,
        },
      ]
    })
    .sort((a, b) => a.startsAtMs - b.startsAtMs)
}

const available = computed(() => toAvailableShowtimes(showtimesQuery.data.value ?? []))

const dates = computed(() => [
  ...new Set(available.value.map((showtime) => localDate(showtime.startsAt))),
])

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
    label: 'Chọn rạp',
    mobileLabel: 'Rạp',
    icon: MapPin,
    placeholder: cinemasQuery.isFetching.value ? 'Đang tải rạp…' : 'Chọn rạp',
    disabled:
      checking.value ||
      cinemasQuery.isPending.value ||
      cinemasQuery.isFetching.value ||
      cinemasQuery.isError.value ||
      !cinemas.value.length,
    options: cinemas.value.map((cinema) => ({
      value: cinema.id,
      label: cinema.name,
    })),
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
      label: [labelTime(showtime.startsAt), showtime.roomName].filter(Boolean).join(' · '),
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

  return ''
})

const helperMessage = computed(() => {
  if (checking.value) return 'Đang kiểm tra lại suất chiếu…'
  if (cinemasQuery.isPending.value) return 'Đang tải danh sách rạp…'
  if (!cinemas.value.length) return 'Chưa có rạp đang hoạt động.'
  if (!hasCinema.value) return 'Chọn rạp để bắt đầu đặt vé nhanh.'
  if (props.moviesLoading) return 'Đang tải danh sách phim…'
  if (!props.movies.length) return 'Chưa có phim đang chiếu.'
  if (!hasMovie.value) return 'Chọn phim để xem lịch mở bán tại rạp đã chọn.'
  if (showtimesQuery.isFetching.value) return 'Đang cập nhật lịch chiếu…'

  if (!available.value.length) {
    return 'Phim này chưa có suất mở bán trong thời gian tới tại rạp đã chọn.'
  }

  if (!selection.date) return 'Chọn ngày có suất mở bán.'

  if (bookableQuery.isFetching.value || !bookableQuery.isSuccess.value) {
    return 'Đang tải suất mở bán của ngày đã chọn…'
  }

  if (!times.value.length) {
    return 'Ngày đã chọn hiện không có suất đủ điều kiện mở bán. Vui lòng chọn ngày khác.'
  }

  if (!selection.showtime) return 'Chọn giờ chiếu và phòng chiếu phù hợp.'
  return 'Đã chọn suất chiếu. Nhấn Tiếp tục để sang bước tiếp theo.'
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

function labelDate(date: string) {
  return formatCinemaDateKey(date)
}

function labelTime(iso: string) {
  return formatCinemaTime(iso)
}

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
  () => props.movies,
  (movies) => {
    if (selection.movie && !movies.some((movie) => movie.id === selection.movie)) {
      selection.movie = ''
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

          <select
            :id="`home-${field.key}`"
            v-model="selection[field.key]"
            :disabled="field.disabled"
            aria-describedby="quick-booking-feedback"
          >
            <option value="">{{ field.placeholder }}</option>
            <option v-for="option in field.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
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
      >
        {{ errorMessage || helperMessage }}
      </p>

      <button
        v-if="canRetry"
        class="home-booking__retry"
        type="button"
        :disabled="
          checking ||
          cinemasQuery.isFetching.value ||
          moviesLoading ||
          showtimesQuery.isFetching.value ||
          bookableQuery.isFetching.value
        "
        @click="retryLoading"
      >
        Thử lại
      </button>
    </div>
  </section>
</template>
