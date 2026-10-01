<script setup lang="ts">
import { ref, watch } from 'vue'
import { Play } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { fallbackArtwork, formatReleaseDate, movieArtwork } from '../presentation/artwork'
import { unavailableAgeRating } from '../presentation/movie-metadata'

const props = defineProps<{ movie: HomeMovie }>()

const image = ref(movieArtwork(props.movie))

watch(
  () => props.movie,
  (movie) => {
    image.value = movieArtwork(movie)
  },
)
</script>

<template>
  <article class="home-movie-card">
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

      <span class="home-badge home-movie-card__badge">ĐANG CHIẾU</span>
    </div>

    <h3>
      <RouterLink
        :to="{ name: ROUTE_NAMES.MOVIE_DETAIL, params: { movieId: movie.id } }"
        :title="movie.title"
      >
        {{ movie.title }}
      </RouterLink>
    </h3>

    <p>{{ movie.genres.join(' · ') || 'Phim điện ảnh' }}</p>

    <div class="home-movie-card__meta">
      <span
        class="home-age-mark"
        role="img"
        :aria-label="unavailableAgeRating.description"
        :title="unavailableAgeRating.description"
      >
        {{ unavailableAgeRating.label }}
      </span>

      <span v-if="movie.durationMinutes"> {{ movie.durationMinutes }} phút </span>

      <span v-if="movie.releaseDate">
        {{ formatReleaseDate(movie.releaseDate) }}
      </span>
    </div>
  </article>
</template>
