<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import CatalogMovieCard from '../components/CatalogMovieCard.vue'
import { useMoviesProgramme } from '../composables/use-movies-programme'
import type { CatalogMovieStatus, MovieGenre } from '../models/movie.model'

type MovieSort = 'release-desc' | 'release-asc' | 'title-asc'

const PAGE_SIZE = 8
const { data, isPending, isError, isFetching, refetch, scopeKey, catalogueLocationLabel } =
  useMoviesProgramme()

const route = useRoute()
const router = useRouter()

const selectedStatus = computed<CatalogMovieStatus>({
  get: () => (route.query.status === 'UPCOMING' ? 'UPCOMING' : 'NOW_SHOWING'),
  set: (status) => {
    if (status === selectedStatus.value) return

    void router.push({
      path: route.path,
      query: {
        ...route.query,
        status,
      },
      hash: route.hash,
    })
  },
})
const selectedGenre = ref('')
const selectedSort = ref<MovieSort>('release-desc')
const shownLimit = ref(PAGE_SIZE)

const collator = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true,
})

const statusOptions: {
  value: CatalogMovieStatus
  label: string
}[] = [
  { value: 'NOW_SHOWING', label: 'Phim đang chiếu' },
  { value: 'UPCOMING', label: 'Phim sắp chiếu' },
]

const sortOptions: {
  value: MovieSort
  label: string
}[] = [
  { value: 'release-desc', label: 'Khởi chiếu mới nhất' },
  { value: 'release-asc', label: 'Khởi chiếu sớm nhất' },
  { value: 'title-asc', label: 'Tên phim A–Z' },
]

const hasData = computed(() => data.value !== undefined)

const genreOptions = computed(() => {
  const genres = new Map<string, MovieGenre>()

  for (const movie of data.value ?? []) {
    for (const genre of movie.genres) {
      if (!genres.has(genre.id)) {
        genres.set(genre.id, genre)
      }
    }
  }

  return [...genres.values()].sort(
    (first, second) =>
      collator.compare(first.name, second.name) || first.id.localeCompare(second.id),
  )
})

const filteredMovies = computed(() => {
  const movies = (data.value ?? []).filter(
    (movie) =>
      movie.status === selectedStatus.value &&
      (!selectedGenre.value || movie.genres.some((genre) => genre.id === selectedGenre.value)),
  )

  return movies.sort((first, second) => {
    const titleOrder =
      collator.compare(first.title, second.title) || first.id.localeCompare(second.id)

    if (selectedSort.value === 'title-asc') {
      return titleOrder
    }

    // Phim chưa có ngày khởi chiếu luôn nằm cuối.
    if (!first.releaseDate && !second.releaseDate) {
      return titleOrder
    }

    if (!first.releaseDate) return 1
    if (!second.releaseDate) return -1

    const dateOrder = first.releaseDate.localeCompare(second.releaseDate)

    return (selectedSort.value === 'release-asc' ? dateOrder : -dateOrder) || titleOrder
  })
})

const visibleMovies = computed(() => filteredMovies.value.slice(0, shownLimit.value))

const hasMore = computed(() => visibleMovies.value.length < filteredMovies.value.length)

const statusDescription = computed(() =>
  selectedStatus.value === 'NOW_SHOWING' ? 'đang chiếu' : 'sắp chiếu',
)

watch([selectedStatus, selectedGenre, selectedSort, scopeKey], () => {
  shownLimit.value = PAGE_SIZE
})

watch([scopeKey, selectedStatus], () => {
  selectedGenre.value = ''
})

// Xóa bộ lọc nếu thể loại không còn trong catalog mới.
watch(genreOptions, (genres) => {
  if (selectedGenre.value && !genres.some((genre) => genre.id === selectedGenre.value)) {
    selectedGenre.value = ''
  }
})

function loadMore() {
  if (isFetching.value || !hasMore.value) return

  shownLimit.value += PAGE_SIZE
}

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
              :class="{
                'is-active': selectedStatus === option.value,
              }"
              type="button"
              :aria-pressed="selectedStatus === option.value"
              :disabled="isPending"
              @click="selectedStatus = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="movies-filter-group">
            <label class="movies-filter-control" for="movies-genre-filter">
              <span class="movies-sr-only"> Lọc theo thể loại </span>

              <select id="movies-genre-filter" v-model="selectedGenre" :disabled="isPending">
                <option value="">Tất cả thể loại</option>
                <option v-for="genre in genreOptions" :key="genre.id" :value="genre.id">
                  {{ genre.name }}
                </option>
              </select>
            </label>

            <label class="movies-filter-control" for="movies-sort-filter">
              <span class="movies-sr-only"> Sắp xếp phim </span>

              <select id="movies-sort-filter" v-model="selectedSort" :disabled="isPending">
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
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
          <strong>{{ filteredMovies.length }} phim</strong>
          {{ statusDescription }} tại {{ catalogueLocationLabel }}

          <span v-if="filteredMovies.length" class="movies-results__shown">
            Đang hiển thị {{ visibleMovies.length }} / {{ filteredMovies.length }} phim.
          </span>
        </p>

        <div v-if="isPending" class="movies-grid" aria-hidden="true">
          <div v-for="index in PAGE_SIZE" :key="index" class="movies-skeleton">
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
            :title="selectedGenre ? 'Không có phim phù hợp' : `Chưa có phim ${statusDescription}`"
            :description="
              selectedGenre
                ? 'Hãy thử chọn thể loại khác hoặc tất cả thể loại.'
                : 'Danh sách phim sẽ được cập nhật trong thời gian tới.'
            "
          />

          <template v-else>
            <div id="movies-catalog-grid" class="movies-grid">
              <CatalogMovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
            </div>

            <button
              v-if="hasMore"
              class="movies-load-more"
              type="button"
              aria-controls="movies-catalog-grid"
              :disabled="isFetching"
              @click="loadMore"
            >
              Xem thêm phim
              <ArrowDown aria-hidden="true" />
            </button>
          </template>
        </template>
      </section>
    </AppContainer>
  </div>
</template>
