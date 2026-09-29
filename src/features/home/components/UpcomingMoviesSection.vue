<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { fallbackArtwork, formatReleaseDate, movieArtwork } from '../presentation/artwork'
defineProps<{ movies: HomeMovie[]; loading: boolean; error: boolean }>()
const failedImages = ref<Record<string, boolean>>({})
</script>

<template>
  <section class="home-section home-section--bordered" aria-labelledby="upcoming-title">
    <div class="home-container">
      <div class="home-section__heading">
        <div>
          <h2 id="upcoming-title">Sắp chiếu</h2>
          <p>Những bộ phim đặc sắc sẽ ra mắt trong thời gian tới</p>
        </div>
        <RouterLink :to="{ name: ROUTE_NAMES.MOVIES }">Xem tất cả →</RouterLink>
      </div>
      <p v-if="loading" role="status">Đang tải phim…</p>
      <p v-else-if="error" role="alert">Không thể tải danh sách phim sắp chiếu.</p>
      <p v-else-if="!movies.length">Chưa có phim sắp chiếu.</p>
      <div v-else class="home-upcoming-scroller">
        <article v-for="movie in movies" :key="movie.id" class="home-upcoming-card">
          <img
            :src="failedImages[movie.id] ? fallbackArtwork(movie.id) : movieArtwork(movie)"
            :alt="`Poster ${movie.title}`"
            loading="lazy"
            @error="failedImages[movie.id] = true"
          />
          <div>
            <h3>{{ movie.title }}</h3>
            <strong v-if="movie.releaseDate">{{ formatReleaseDate(movie.releaseDate) }}</strong>
            <p>{{ movie.genres.join(' · ') }}</p>
          </div>
          <RouterLink
            class="home-upcoming-card__link"
            :to="{ name: ROUTE_NAMES.MOVIE_DETAIL, params: { movieId: movie.id } }"
            :aria-label="`Xem phim ${movie.title}`"
            ><ChevronRight aria-hidden="true"
          /></RouterLink>
        </article>
      </div>
    </div>
  </section>
</template>
