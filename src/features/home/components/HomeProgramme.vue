<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import MovieCard from './MovieCard.vue'

const props = defineProps<{ nowShowing: HomeMovie[]; upcoming: HomeMovie[]; loading: boolean; error: boolean }>()
const PAGE_SIZE = 8
const activeTab = ref('NOW_SHOWING')
const page = ref(1)
const movies = computed(() => activeTab.value === 'UPCOMING' ? props.upcoming : props.nowShowing)
const visibleMovies = computed(() => movies.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
watch([activeTab, () => movies.value.map((movie) => movie.id).join('|')], () => { page.value = 1 })
</script>

<template>
  <section class="home-container lumiere-programme" aria-label="Khám phá phim">
    <TabsRoot v-model="activeTab" default-value="NOW_SHOWING">
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
          ><div v-if="nowShowing.length" id="home-now-movies" class="lumiere-movie-grid">
            <MovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
          </div>
          <p v-else class="lumiere-empty">
            Chưa có phim đang chiếu phù hợp với rạp đã chọn.
          </p></TabsContent
        >
        <TabsContent value="UPCOMING"
          ><div v-if="upcoming.length" id="home-upcoming-movies" class="lumiere-movie-grid">
            <MovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
          </div>
          <p v-else class="lumiere-empty">Phim sắp chiếu sẽ được cập nhật.</p></TabsContent
        >
        <AppPagination
          v-model:page="page"
          :total="movies.length"
          :page-size="PAGE_SIZE"
          :controls="activeTab === 'UPCOMING' ? 'home-upcoming-movies' : 'home-now-movies'"
        />
      </template>
    </TabsRoot>
  </section>
</template>
