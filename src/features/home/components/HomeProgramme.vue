<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import MovieCard from './MovieCard.vue'

defineProps<{ nowShowing: HomeMovie[]; upcoming: HomeMovie[]; loading: boolean; error: boolean }>()
</script>

<template>
  <section class="home-container lumiere-programme" aria-label="Khám phá phim">
    <TabsRoot default-value="NOW_SHOWING">
      <div class="lumiere-programme__heading">
        <TabsList class="lumiere-tabs" aria-label="Danh sách phim">
          <TabsTrigger value="NOW_SHOWING"
            >Đang chiếu <span>{{ nowShowing.length }}</span></TabsTrigger
          >
          <TabsTrigger value="UPCOMING"
            >Sắp chiếu <span>{{ upcoming.length }}</span></TabsTrigger
          >
        </TabsList>
        <RouterLink :to="{ name: ROUTE_NAMES.MOVIES }">Tất cả phim →</RouterLink>
      </div>
      <p v-if="loading" class="booking-note" role="status">Đang tải phim…</p>
      <p v-else-if="error" class="booking-error" role="alert">
        Không thể cập nhật danh sách phim. Vui lòng thử lại.
      </p>
      <template v-else>
        <TabsContent value="NOW_SHOWING"
          ><div v-if="nowShowing.length" class="lumiere-movie-grid">
            <MovieCard v-for="movie in nowShowing" :key="movie.id" :movie="movie" />
          </div>
          <p v-else class="lumiere-empty">
            Chưa có phim đang chiếu phù hợp với rạp đã chọn.
          </p></TabsContent
        >
        <TabsContent value="UPCOMING"
          ><div v-if="upcoming.length" class="lumiere-movie-grid">
            <MovieCard v-for="movie in upcoming" :key="movie.id" :movie="movie" />
          </div>
          <p v-else class="lumiere-empty">Phim sắp chiếu sẽ được cập nhật.</p></TabsContent
        >
      </template>
    </TabsRoot>
  </section>
</template>
