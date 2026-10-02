<script setup lang="ts">
import { computed, ref } from 'vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import CatalogMovieCard from '../components/CatalogMovieCard.vue'
import { useMoviesQuery } from '../api/movie-queries'
import type { CatalogMovieStatus } from '../models/movie.model'

const { data, isPending, isError, isFetching, refetch } = useMoviesQuery()

const selectedStatus = ref<CatalogMovieStatus>('NOW_SHOWING')

const statusOptions: { value: CatalogMovieStatus; label: string }[] = [
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'UPCOMING', label: 'Sắp chiếu' },
]

const hasData = computed(() => data.value !== undefined)

const visibleMovies = computed(() =>
  (data.value ?? []).filter((movie) => movie.status === selectedStatus.value),
)

const statusDescription = computed(() =>
  selectedStatus.value === 'NOW_SHOWING' ? 'đang chiếu' : 'sắp chiếu',
)

function retry() {
  void refetch()
}
</script>

<template>
  <div class="movies-page">
    <section class="movies-intro" aria-labelledby="movies-page-title">
      <AppContainer>
        <p class="movies-intro__eyebrow">Khám phá điện ảnh</p>
        <h1 id="movies-page-title">PHIM</h1>
        <p class="movies-intro__copy">Chọn bộ phim yêu thích và trải nghiệm tại CINEMATIC</p>
      </AppContainer>
    </section>

    <AppContainer>
      <section class="movies-browser" aria-label="Danh sách phim" :aria-busy="isFetching">
        <div class="movies-toolbar">
          <div class="movies-status-group" role="group" aria-label="Trạng thái phim">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              class="movies-status-button"
              :class="{ 'is-active': selectedStatus === option.value }"
              type="button"
              :aria-pressed="selectedStatus === option.value"
              @click="selectedStatus = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <p v-if="isPending" class="movies-results" role="status">Đang tải danh sách phim…</p>

        <p
          v-else-if="hasData"
          class="movies-results"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{{ visibleMovies.length }} phim</strong>
          {{ statusDescription }} tại CINEMATIC
        </p>

        <div v-if="isPending" class="movies-grid" aria-hidden="true">
          <div v-for="index in 8" :key="index" class="movies-skeleton">
            <AppSkeleton variant="poster" class="movies-skeleton__poster" />
            <AppSkeleton variant="title" />
            <AppSkeleton />
            <AppSkeleton />
            <AppSkeleton variant="card" class="movies-skeleton__cta" />
          </div>
        </div>

        <AppErrorState
          v-else-if="isError && !hasData"
          title="Không thể tải danh sách phim"
          description="Vui lòng kiểm tra kết nối và thử lại."
          show-retry
          :retrying="isFetching"
          @retry="retry"
        />

        <template v-else>
          <div v-if="isError" class="movies-refresh-error" role="alert">
            <p>Chưa thể cập nhật danh sách. Đang hiển thị dữ liệu đã tải.</p>
            <button type="button" :disabled="isFetching" @click="retry">
              {{ isFetching ? 'Đang thử lại…' : 'Thử lại' }}
            </button>
          </div>

          <AppEmptyState
            v-if="!visibleMovies.length"
            :title="`Chưa có phim ${statusDescription}`"
            description="Danh sách phim sẽ được cập nhật trong thời gian tới."
          />

          <div v-else class="movies-grid">
            <CatalogMovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
          </div>
        </template>
      </section>
    </AppContainer>
  </div>
</template>
