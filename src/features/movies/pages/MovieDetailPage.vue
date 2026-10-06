<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Clapperboard, Clock, Play } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppLink from '@/components/ui/AppLink.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatAgeRating } from '@/utils/movie-age-rating'
import { useMovieDetailQuery } from '../api/movie-queries'
import type { MovieDetail } from '../models/movie.model'
import MovieShowtimes from '../components/MovieShowtimes.vue'

const route = useRoute()

const movieId = computed(() => {
  const value = route.params.movieId

  return typeof value === 'string' ? value.toLowerCase() : ''
})

const invalidMovieId = computed(
  () => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(movieId.value),
)

const {
  data: movie,
  error,
  isPending,
  isError,
  isFetching,
  refetch,
} = useMovieDetailQuery(() => (invalidMovieId.value ? '' : movieId.value))

const posterFailed = ref(false)

watch(
  [movieId, () => movie.value?.posterUrl],
  () => {
    posterFailed.value = false
  },
  { flush: 'sync' },
)

const statusLabels: Record<MovieDetail['status'], string> = {
  NOW_SHOWING: 'Đang chiếu',
  UPCOMING: 'Sắp chiếu',
  ENDED: 'Đã kết thúc chiếu',
  INACTIVE: 'Không hoạt động',
}

const statusLabel = computed(() => (movie.value ? statusLabels[movie.value.status] : ''))

const ageRating = computed(() => formatAgeRating(movie.value?.ageRating))

const genreLabel = computed(() => movie.value?.genres.map((genre) => genre.name).join(' · ') || '')

const releaseDateLabel = computed(() => {
  const value = movie.value?.releaseDate

  if (!value) return 'Chưa cập nhật'

  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : 'Chưa cập nhật'
})

const catalogLink = computed(() => ({
  name: ROUTE_NAMES.MOVIES,
  query: {
    status: movie.value?.status === 'UPCOMING' ? 'UPCOMING' : 'NOW_SHOWING',
  },
}))

function retry() {
  void refetch()
}
</script>

<template>
  <div class="movie-detail-page">
    <AppContainer>
      <nav class="movie-detail__breadcrumb" aria-label="Đường dẫn trang">
        <AppLink :to="{ name: ROUTE_NAMES.HOME }" variant="muted"> Trang chủ </AppLink>

        <span aria-hidden="true">/</span>

        <AppLink :to="catalogLink" variant="muted"> Phim </AppLink>

        <span aria-hidden="true">/</span>
        <span aria-current="page">Chi tiết phim</span>
      </nav>

      <AppEmptyState
        v-if="invalidMovieId || error?.status === 404"
        title="Không tìm thấy phim"
        description="Đường dẫn không hợp lệ hoặc phim không còn tồn tại."
      >
        <template #action>
          <AppLink :to="{ name: ROUTE_NAMES.MOVIES }"> Xem danh sách phim </AppLink>
        </template>
      </AppEmptyState>

      <template v-else-if="isPending">
        <p class="movie-detail__notice" role="status">Đang tải thông tin phim…</p>

        <div class="movie-detail__overview" aria-hidden="true">
          <AppSkeleton variant="poster" />

          <div class="movie-detail__loading-info">
            <AppSkeleton variant="title" />
            <AppSkeleton />
            <AppSkeleton />
            <AppSkeleton variant="card" />
          </div>
        </div>
      </template>

      <AppErrorState
        v-else-if="isError && !movie"
        title="Không thể tải thông tin phim"
        description="Vui lòng kiểm tra kết nối và thử lại."
        show-retry
        :retrying="isFetching"
        @retry="retry"
      />

      <template v-else-if="movie">
        <AppErrorState
          v-if="isError"
          title="Chưa thể cập nhật thông tin phim"
          description="Đang hiển thị thông tin đã tải. Bạn có thể thử cập nhật lại."
          show-retry
          :retrying="isFetching"
          @retry="retry"
        />

        <section class="movie-detail__overview" aria-labelledby="movie-detail-title">
          <div class="movie-detail__poster">
            <img
              v-if="movie.posterUrl && !posterFailed"
              :key="movie.posterUrl"
              :src="movie.posterUrl"
              :alt="`Poster phim ${movie.title}`"
              decoding="async"
              @error="posterFailed = true"
            />

            <div
              v-else
              class="movie-detail__poster-fallback"
              role="img"
              :aria-label="`Chưa có poster phim ${movie.title}`"
            >
              <Clapperboard aria-hidden="true" />
              <span>Chưa có poster</span>
            </div>

            <span
              v-if="movie.ageRating"
              class="movie-detail__age movie-detail__age--poster"
              :aria-label="ageRating.description"
            >
              {{ ageRating.label }}
            </span>
          </div>

          <div class="movie-detail__info">
            <p class="movie-detail__eyebrow">{{ statusLabel }}</p>

            <div class="movie-detail__title-row">
              <h1 id="movie-detail-title">{{ movie.title }}</h1>

              <span
                v-if="movie.ageRating"
                class="movie-detail__age movie-detail__age--inline"
                :aria-label="ageRating.description"
              >
                {{ ageRating.label }}
              </span>
            </div>

            <p v-if="genreLabel" class="movie-detail__genres">
              {{ genreLabel }}
            </p>

            <div v-if="movie.durationMinutes !== null" class="movie-detail__facts">
              <span>
                <Clock aria-hidden="true" />
                {{ movie.durationMinutes }} phút
              </span>
            </div>

            <p class="movie-detail__rating-note">
              {{ ageRating.description }}
            </p>

            <dl class="movie-detail__credits">
              <div>
                <dt>Khởi chiếu</dt>
                <dd>{{ releaseDateLabel }}</dd>
              </div>
            </dl>

            <div class="movie-detail__actions">
              <a class="movie-detail__booking" href="#movie-showtimes"> Đặt vé </a>
              <a
                v-if="movie.trailerUrl"
                class="movie-detail__trailer"
                :href="movie.trailerUrl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Xem trailer, mở trong tab mới"
              >
                <Play aria-hidden="true" />
                Xem trailer
              </a>

              <p v-else class="movie-detail__notice">Trailer chưa được cập nhật.</p>
            </div>
          </div>
        </section>

        <section class="movie-detail__synopsis" aria-labelledby="movie-detail-synopsis-title">
          <h2 id="movie-detail-synopsis-title">Nội dung phim</h2>
          <p>
            {{ movie.description.trim() || 'Nội dung phim chưa được cập nhật.' }}
          </p>
        </section>
        <MovieShowtimes :key="movie.id" :movie-id="movie.id" />
      </template>

      <AppErrorState
        v-else
        title="Thông tin phim chưa hợp lệ"
        description="Chưa thể hiển thị dữ liệu phim. Vui lòng thử lại."
        show-retry
        :retrying="isFetching"
        @retry="retry"
      />
    </AppContainer>
  </div>
</template>
