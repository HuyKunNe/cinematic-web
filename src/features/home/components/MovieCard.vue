<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Play } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { fallbackArtwork, formatReleaseDate, movieArtwork } from '../presentation/artwork'
import { formatAgeRating } from '@/utils/movie-age-rating'

const props = defineProps<{ movie: HomeMovie }>()
const ageRating = computed(() => formatAgeRating(props.movie.ageRating))
const image = ref(movieArtwork(props.movie))
const detailLocation = computed(() => ({
  name: ROUTE_NAMES.MOVIE_DETAIL,
  params: { movieId: props.movie.id },
}))

const actionLabel = computed(() =>
  props.movie.status === 'NOW_SHOWING' ? 'Đặt vé' : 'Xem chi tiết',
)

watch(
  () => props.movie,
  (movie) => {
    image.value = movieArtwork(movie)
  },
)
</script>

<template>
  <article class="home-movie-card">
    <RouterLink
      class="home-movie-card__detail-link"
      :to="detailLocation"
      :aria-label="`Xem chi tiết phim ${movie.title}`"
    />
    <div class="home-movie-card__poster">
      <img
        :src="image"
        :alt="`Poster ${movie.title}`"
        loading="lazy"
        @error="image = fallbackArtwork(movie.id)"
      />

      <a
        v-if="movie.trailerUrl"
        class="home-movie-card__play"
        :href="movie.trailerUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Xem trailer ${movie.title} (mở tab mới)`"
        title="Xem trailer"
      >
        <Play aria-hidden="true" />
      </a>

      <button
        v-else
        class="home-movie-card__play"
        type="button"
        disabled
        title="Trailer chưa được cập nhật"
        :aria-label="`Trailer ${movie.title} chưa được cập nhật`"
      >
        <Play aria-hidden="true" />
      </button>

      <span class="home-badge home-movie-card__badge">
        {{ movie.status === 'UPCOMING' ? 'SẮP CHIẾU' : 'ĐANG CHIẾU' }}
      </span>
    </div>

    <h3 :title="movie.title">
      {{ movie.title }}
    </h3>

    <p>{{ movie.genres.join(' · ') || 'Phim điện ảnh' }}</p>

    <div class="home-movie-card__meta">
      <span
        class="home-age-mark"
        role="img"
        :aria-label="ageRating.description"
        :title="ageRating.description"
      >
        {{ ageRating.label }}
      </span>

      <span v-if="movie.durationMinutes"> {{ movie.durationMinutes }} phút </span>

      <span v-if="movie.releaseDate">
        {{ formatReleaseDate(movie.releaseDate) }}
      </span>
    </div>
    <RouterLink
      class="home-button home-button--primary home-movie-card__cta"
      :to="detailLocation"
      :aria-label="`${actionLabel}: ${movie.title}`"
    >
      {{ actionLabel }}
    </RouterLink>
  </article>
</template>
