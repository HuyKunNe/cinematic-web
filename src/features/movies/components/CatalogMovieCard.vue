<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clapperboard, Play } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { CatalogMovie } from '../models/movie.model'

const props = defineProps<{ movie: CatalogMovie }>()

const imageFailed = ref(false)

watch(
  () => [props.movie.id, props.movie.posterUrl],
  () => {
    imageFailed.value = false
  },
)

const statusLabel = computed(() =>
  props.movie.status === 'NOW_SHOWING' ? 'ĐANG CHIẾU' : 'SẮP CHIẾU',
)

const genreLabel = computed(
  () => props.movie.genres.map((genre) => genre.name).join(' · ') || 'Thể loại chưa cập nhật',
)

const releaseDateLabel = computed(() => {
  if (!props.movie.releaseDate) return ''

  const [year, month, day] = props.movie.releaseDate.split('-')
  return year && month && day ? `${day}.${month}.${year}` : props.movie.releaseDate
})

const detailLocation = computed(() => ({
  name: ROUTE_NAMES.MOVIE_DETAIL,
  params: { movieId: props.movie.id },
}))
</script>

<template>
  <article class="movies-card">
    <div class="movies-card__poster">
      <img
        v-if="movie.posterUrl && !imageFailed"
        :src="movie.posterUrl"
        :alt="`Poster ${movie.title}`"
        loading="lazy"
        @error="imageFailed = true"
      />

      <div
        v-else
        class="movies-card__placeholder"
        role="img"
        :aria-label="`Chưa có poster cho ${movie.title}`"
      >
        <Clapperboard aria-hidden="true" />
        <span>Chưa có poster</span>
      </div>

      <span class="movies-card__status">{{ statusLabel }}</span>

      <span
        class="movies-card__age"
        role="img"
        aria-label="Chưa có thông tin phân loại độ tuổi"
        title="Chưa có thông tin phân loại độ tuổi"
      >
        —
      </span>

      <a
        v-if="movie.trailerUrl"
        class="movies-card__play"
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
        class="movies-card__play"
        type="button"
        disabled
        :aria-label="`Trailer ${movie.title} chưa được cập nhật`"
        title="Trailer chưa được cập nhật"
      >
        <Play aria-hidden="true" />
      </button>
    </div>

    <h2 class="movies-card__title">
      <RouterLink :to="detailLocation" :title="movie.title">
        {{ movie.title }}
      </RouterLink>
    </h2>

    <p class="movies-card__genres" :title="genreLabel">
      {{ genreLabel }}
    </p>

    <div class="movies-card__meta">
      <span v-if="movie.durationMinutes"> {{ movie.durationMinutes }} phút </span>
      <span v-if="releaseDateLabel">{{ releaseDateLabel }}</span>
    </div>

    <RouterLink class="movies-card__cta" :to="detailLocation">
      Xem chi tiết
      <span class="movies-sr-only"> {{ movie.title }}</span>
    </RouterLink>
  </article>
</template>
