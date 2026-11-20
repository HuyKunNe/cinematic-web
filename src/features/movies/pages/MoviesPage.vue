<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useRoute,
  useRouter,
  isNavigationFailure,
  NavigationFailureType,
  type LocationQueryRaw,
} from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-constants'
import AppPagination from '@/components/ui/AppPagination.vue'
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
const navigationError = ref('')
let filterRevision = 0
let plannedQuery: LocationQueryRaw | null = null

async function updateFilters(patch: LocationQueryRaw, replace = false) {
  if (route.name !== ROUTE_NAMES.MOVIES) return

  const query = { ...(plannedQuery ?? route.query), ...patch }
  const target = { path: route.path, query, hash: route.hash }
  if (router.resolve(target).fullPath === route.fullPath && !plannedQuery) return
  const revision = ++filterRevision
  plannedQuery = query
  try {
    const failure = await (replace ? router.replace(target) : router.push(target))
    if (revision !== filterRevision) return
    if (
      failure &&
      !isNavigationFailure(
        failure,
        NavigationFailureType.cancelled | NavigationFailureType.duplicated,
      )
    )
      navigationError.value = 'Chưa thể cập nhật bộ lọc phim. Vui lòng thử lại.'
    else navigationError.value = ''
  } catch {
    if (revision === filterRevision) {
      navigationError.value = 'Chưa thể cập nhật bộ lọc phim. Vui lòng thử lại.'
    }
  } finally {
    if (revision === filterRevision) plannedQuery = null
  }
}

const selectedStatus = computed<CatalogMovieStatus>({
  get: () => (route.query.status === 'UPCOMING' ? 'UPCOMING' : 'NOW_SHOWING'),
  set: (status) => {
    if (status === selectedStatus.value) return

    void updateFilters({ status, genre: undefined, page: undefined })
  },
})

const searchInput = ref<HTMLInputElement | null>(null)
const searchText = computed({
  get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
  set: (q: string) => {
    void updateFilters({ q: q || undefined, page: undefined }, true)
  },
})
const selectedGenre = computed({
  get: () => (typeof route.query.genre === 'string' ? route.query.genre : ''),
  set: (genre: string) => {
    void updateFilters({ genre: genre || undefined, page: undefined })
  },
})
const selectedSort = computed<MovieSort>({
  get: () =>
    route.query.sort === 'release-asc' || route.query.sort === 'title-asc'
      ? route.query.sort
      : 'release-desc',
  set: (sort) => {
    void updateFilters({ sort: sort === 'release-desc' ? undefined : sort, page: undefined })
  },
})

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

function normalizeMovieSearch(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

const searchLabel = computed(() => searchText.value.trim().replace(/\s+/g, ' '))
const searchTerm = computed(() => normalizeMovieSearch(searchText.value))
const hasActiveFilters = computed(() => Boolean(searchTerm.value || selectedGenre.value))

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
      (!selectedGenre.value || movie.genres.some((genre) => genre.id === selectedGenre.value)) &&
      (!searchTerm.value || normalizeMovieSearch(movie.title).includes(searchTerm.value)),
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

const pageCount = computed(() => Math.max(1, Math.ceil(filteredMovies.value.length / PAGE_SIZE)))
const page = computed({
  get: () => {
    const raw = route.query.page
    const requested = typeof raw === 'string' && /^[1-9]\d*$/.test(raw) ? Number(raw) : 1
    return Number.isSafeInteger(requested) ? Math.min(requested, pageCount.value) : 1
  },
  set: (page: number) => {
    void updateFilters({ page: page > 1 ? String(page) : undefined })
  },
})
const visibleMovies = computed(() =>
  filteredMovies.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

const statusDescription = computed(() =>
  selectedStatus.value === 'NOW_SHOWING' ? 'đang chiếu' : 'sắp chiếu',
)

const emptyTitle = computed(() =>
  hasActiveFilters.value ? 'Không có phim phù hợp' : `Chưa có phim ${statusDescription.value}`,
)

const emptyDescription = computed(() => {
  if (searchTerm.value) {
    return 'Thử từ khóa khác, xóa từ khóa hoặc thay đổi thể loại, trạng thái phim và rạp đã chọn.'
  }

  if (selectedGenre.value) {
    return 'Hãy thử chọn thể loại khác hoặc tất cả thể loại.'
  }

  return 'Danh sách phim sẽ được cập nhật trong thời gian tới.'
})

watch(scopeKey, () => {
  void updateFilters({ genre: undefined, page: undefined }, true)
})

function clearSearch() {
  searchText.value = ''
  searchInput.value?.focus()
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
        <p class="movies-intro__copy">Một bộ phim hay có thể bắt đầu một ngày thật khác.</p>
      </AppContainer>
    </section>

    <AppContainer>
      <section class="movies-browser" aria-label="Danh sách phim" :aria-busy="isFetching">
        <form
          class="movies-search"
          role="search"
          aria-label="Tìm phim trong danh sách"
          @submit.prevent
        >
          <label class="movies-search__label" for="movies-search-input"> Tìm theo tên phim </label>

          <div class="movies-search__controls">
            <input
              id="movies-search-input"
              ref="searchInput"
              v-model="searchText"
              class="movies-search__input"
              name="movie-search"
              type="search"
              autocomplete="off"
              placeholder="Nhập tên phim có dấu hoặc không dấu"
              aria-describedby="movies-search-help"
            />

            <button
              v-if="searchText"
              class="movies-search__clear"
              type="button"
              @click="clearSearch"
            >
              Xóa
            </button>
          </div>
        </form>

        <p v-if="navigationError" class="movies-refresh-error" role="alert">
          {{ navigationError }}
        </p>

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
              <span class="movies-sr-only">Lọc theo thể loại</span>

              <select id="movies-genre-filter" v-model="selectedGenre" :disabled="isPending">
                <option value="">Tất cả thể loại</option>
                <option v-for="genre in genreOptions" :key="genre.id" :value="genre.id">
                  {{ genre.name }}
                </option>
                <option
                  v-if="selectedGenre && !genreOptions.some((genre) => genre.id === selectedGenre)"
                  :value="selectedGenre"
                >
                  Thể loại đang lọc chưa có trong danh mục
                </option>
              </select>
            </label>

            <label class="movies-filter-control" for="movies-sort-filter">
              <span class="movies-sr-only">Sắp xếp phim</span>

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

          <span v-if="searchTerm" class="movies-results__query">
            khớp với “{{ searchLabel }}”.
          </span>

          <span v-if="filteredMovies.length" class="movies-results__shown">
            Đang hiển thị {{ (page - 1) * PAGE_SIZE + 1 }}–{{
              Math.min(page * PAGE_SIZE, filteredMovies.length)
            }}
            / {{ filteredMovies.length }} phim.
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
            :title="emptyTitle"
            :description="emptyDescription"
          />

          <template v-else>
            <div id="movies-catalog-grid" class="movies-grid">
              <CatalogMovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
            </div>

            <AppPagination
              v-model:page="page"
              :total="filteredMovies.length"
              :page-size="PAGE_SIZE"
              :disabled="isFetching"
              controls="movies-catalog-grid"
            />
          </template>
        </template>
      </section>
    </AppContainer>
  </div>
</template>
