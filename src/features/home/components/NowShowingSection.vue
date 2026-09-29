<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import MovieCard from './MovieCard.vue'
defineProps<{ movies: HomeMovie[]; loading: boolean; error: boolean }>()
</script>

<template>
  <section id="showing" class="home-section home-container" aria-labelledby="showing-title">
    <div class="home-section__heading">
      <div>
        <h2 id="showing-title">Phim đang chiếu</h2>
        <p>Những bộ phim hấp dẫn đang ra rạp tại CINEMATIC</p>
      </div>
      <RouterLink :to="{ name: ROUTE_NAMES.MOVIES }">Xem tất cả →</RouterLink>
    </div>
    <p v-if="loading" role="status">Đang tải phim…</p>
    <p v-else-if="error" role="alert">Không thể tải danh sách phim. Vui lòng thử lại sau.</p>
    <p v-else-if="!movies.length">Chưa có phim đang chiếu.</p>
    <div v-else class="home-movie-scroller">
      <MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" />
    </div>
  </section>
</template>
