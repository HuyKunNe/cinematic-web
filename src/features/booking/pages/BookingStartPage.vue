<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { useCinemaLocation } from '@/features/cinemas'
import { QuickBooking, useHomeProgramme } from '@/features/home'
import { ROUTE_NAMES } from '@/router/route-constants'

const route = useRoute()
const router = useRouter()

const { scopeKey, catalogMovies, nowShowing, loading, error, errorMessage, retrying, retry } =
  useHomeProgramme()

const { location, selectedCity, selectedCinema } = useCinemaLocation()

const locationChanged = ref(false)
const navigationError = ref('')
let movieChangeVersion = 0

const selectedMovieId = computed(() => {
  const value = route.query.movieId

  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    return ''
  }

  return value.toLowerCase()
})

const invalidMovieId = computed(() => route.query.movieId !== undefined && !selectedMovieId.value)

const selectedMovie = computed(() =>
  catalogMovies.value.find((movie) => movie.id === selectedMovieId.value),
)

// Giữ phim từ URL ngay cả khi rạp hiện tại không có suất.
// Lịch chiếu vẫn quyết định ngày/suất có thể chọn.
const bookingMovies = computed(() => {
  const movie = selectedMovie.value

  if (!movie) return nowShowing.value

  return [movie, ...nowShowing.value.filter((item) => item.id !== movie.id)]
})

const movieUnavailable = computed(
  () =>
    Boolean(selectedMovieId.value) &&
    !loading.value &&
    !retrying.value &&
    !error.value &&
    !selectedMovie.value,
)

watch(
  () => location.selectedCinemaId,
  (cinemaId, previousCinemaId) => {
    locationChanged.value = Boolean(cinemaId && previousCinemaId && cinemaId !== previousCinemaId)
  },
)

function dismissLocationNotice() {
  locationChanged.value = false
}

async function updateSelectedMovie(movieId: string) {
  if (movieId === selectedMovieId.value) return

  const version = ++movieChangeVersion
  navigationError.value = ''

  try {
    const failure = await router.replace({
      name: ROUTE_NAMES.BOOKING_START,
      query: {
        ...route.query,
        movieId: movieId || undefined,
      },
    })

    if (version === movieChangeVersion && failure) {
      navigationError.value = 'Chưa thể lưu phim vào đường dẫn. Vui lòng chọn phim lại.'
    }
  } catch {
    if (version === movieChangeVersion) {
      navigationError.value = 'Chưa thể lưu phim vào đường dẫn. Vui lòng chọn phim lại.'
    }
  }
}
</script>

<template>
  <div class="booking-start-page">
    <AppContainer width="narrow">
      <div class="booking-start__intro">
        <nav class="booking-start__breadcrumb" aria-label="Đường dẫn trang">
          <AppLink :to="{ name: ROUTE_NAMES.HOME }" variant="muted"> Trang chủ </AppLink>

          <span aria-hidden="true">/</span>
          <span aria-current="page">Đặt vé</span>
        </nav>

        <h1 class="booking-start__title">Đặt vé</h1>

        <p class="booking-start__description">
          {{
            selectedCinema && selectedMovie
              ? 'Chọn ngày và suất chiếu để tiếp tục.'
              : 'Hoàn tất thông tin còn thiếu để xem các suất chiếu phù hợp.'
          }}
        </p>

        <p v-if="selectedMovie" class="booking-start__description">
          Phim đã chọn:
          <strong>{{ selectedMovie.title }}</strong>
        </p>

        <p v-if="selectedCinema" class="booking-start__description">
          Rạp đã chọn:
          <strong>{{ selectedCinema.name }}</strong>
          <span v-if="selectedCity"> · {{ selectedCity.name }}</span>
        </p>
      </div>

      <p v-if="invalidMovieId" class="booking-start__error" role="alert">
        Thông tin phim trong đường dẫn không hợp lệ. Vui lòng chọn phim.
      </p>

      <p v-else-if="movieUnavailable" class="booking-start__error" role="alert">
        Phim trong đường dẫn không còn nằm trong danh mục đặt vé. Vui lòng chọn phim khác.
      </p>

      <p v-if="error" class="booking-start__error" role="alert">
        {{ errorMessage }} Vui lòng nhấn Thử lại trong bộ chọn bên dưới.
      </p>

      <p v-if="navigationError" class="booking-start__error" role="alert">
        {{ navigationError }}
      </p>

      <QuickBooking
        :key="`booking-start-${scopeKey}`"
        class="booking-start__selector"
        :movies="bookingMovies"
        :movies-loading="loading || retrying"
        :movies-error="error"
        :selected-movie-id="selectedMovieId"
        :location-changed="locationChanged"
        @movie-change="updateSelectedMovie"
        @retry-movies="retry"
        @dismiss-location-notice="dismissLocationNotice"
      />
    </AppContainer>
  </div>
</template>
