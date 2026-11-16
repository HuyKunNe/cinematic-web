<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppLoadingState from '@/components/ui/AppLoadingState.vue'
import { useCinemaLocation } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
import CatalogMovieCard from '../components/CatalogMovieCard.vue'
import { useMoviesQuery } from '../api/movie-queries'

const route = useRoute()
const router = useRouter()
const pageSize = 8
const term = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim().replace(/\s+/g, ' ') : '',
)
const input = ref(term.value)
const navigationError = ref('')
const navigating = ref(false)
const movies = useMoviesQuery(() => Boolean(term.value))
const { query: cinemaQuery, cinemas } = useCinemaLocation()
watch(term, (value) => {
  input.value = value
  navigationError.value = ''
})

function normalize(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}
const keyword = computed(() => normalize(term.value))
const movieMatches = computed(() =>
  keyword.value
    ? (movies.data.value ?? []).filter((movie) => normalize(movie.title).includes(keyword.value))
    : [],
)
const cinemaMatches = computed(() =>
  keyword.value
    ? cinemas.value.filter((cinema) =>
        normalize([cinema.name, cinema.city, cinema.address].join(' ')).includes(keyword.value),
      )
    : [],
)
const failed = computed(() => movies.isError.value || cinemaQuery.isError.value)
const pending = computed(() => movies.isPending.value || cinemaQuery.isPending.value)
function requestedPage(key: 'page' | 'cinemaPage') {
  const value = route.query[key]
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}
const moviePage = computed(() =>
  Math.min(requestedPage('page'), Math.max(1, Math.ceil(movieMatches.value.length / pageSize))),
)
const cinemaPage = computed(() =>
  Math.min(
    requestedPage('cinemaPage'),
    Math.max(1, Math.ceil(cinemaMatches.value.length / pageSize)),
  ),
)
const visibleMovies = computed(() =>
  movieMatches.value.slice((moviePage.value - 1) * pageSize, moviePage.value * pageSize),
)
const visibleCinemas = computed(() =>
  cinemaMatches.value.slice((cinemaPage.value - 1) * pageSize, cinemaPage.value * pageSize),
)

async function navigate(query: Record<string, string | undefined>) {
  if (navigating.value) return
  navigating.value = true
  navigationError.value = ''
  try {
    const failure = await router.push({ name: ROUTE_NAMES.SEARCH, query })
    if (failure) navigationError.value = 'Chưa thể cập nhật tìm kiếm. Vui lòng thử lại.'
  } catch {
    navigationError.value = 'Chưa thể cập nhật tìm kiếm. Vui lòng thử lại.'
  } finally {
    navigating.value = false
  }
}
function submit() {
  const q = input.value.trim().replace(/\s+/g, ' ')
  if (q === term.value && requestedPage('page') === 1 && requestedPage('cinemaPage') === 1) return
  void navigate({ q: q || undefined })
}
function changePage(key: 'page' | 'cinemaPage', page: number) {
  void navigate({
    q: term.value,
    page: moviePage.value > 1 ? String(moviePage.value) : undefined,
    cinemaPage: cinemaPage.value > 1 ? String(cinemaPage.value) : undefined,
    [key]: page > 1 ? String(page) : undefined,
  })
}
</script>

<template>
  <div class="customer-search">
    <AppContainer>
      <header class="customer-search__heading">
        <p class="lumiere-eyebrow">BẠN ĐANG TÌM…</p>
        <h1>Một bộ phim hay, một rạp gần?</h1>
      </header>
      <form
        class="customer-search__form"
        role="search"
        aria-label="Tìm phim hoặc rạp"
        @submit.prevent="submit"
      >
        <label class="customer-search__field" for="customer-search-input"
          ><Search aria-hidden="true" /><span class="movies-sr-only"
            >Tên phim, rạp hoặc khu vực</span
          ><input
            id="customer-search-input"
            v-model="input"
            name="q"
            type="search"
            autocomplete="off"
            placeholder="Nhập tên phim, rạp hoặc khu vực"
            :disabled="navigating"
        /></label>
        <AppButton type="submit" :loading="navigating">Tìm kiếm</AppButton>
      </form>
      <p v-if="navigationError" class="booking-error" role="alert">{{ navigationError }}</p>
      <p v-if="!term" class="customer-search__hint">
        Tìm theo tên phim, tên rạp, địa chỉ hoặc thành phố. Bạn có thể nhập có dấu hoặc không dấu.
      </p>
      <template v-else>
        <p class="customer-search__count" role="status" aria-live="polite">
          {{ movieMatches.length + cinemaMatches.length }} kết quả{{
            pending || failed ? ' đã tải' : ''
          }}
          cho “{{ term }}”
        </p>
        <div
          v-if="movies.isError.value || cinemaQuery.isError.value"
          class="customer-search__feedback"
          role="alert"
        >
          <p>Chưa tải được đầy đủ kết quả. Bạn vẫn có thể xem nhóm dữ liệu đã tải.</p>
          <AppButton
            v-if="movies.isError.value"
            variant="secondary"
            :loading="movies.isFetching.value"
            @click="movies.refetch()"
            >Tải lại phim</AppButton
          ><AppButton
            v-if="cinemaQuery.isError.value"
            variant="secondary"
            :loading="cinemaQuery.isFetching.value"
            @click="cinemaQuery.refetch()"
            >Tải lại rạp</AppButton
          >
        </div>
        <AppLoadingState v-if="pending" title="Đang tìm phim và rạp" />
        <section
          v-if="visibleMovies.length"
          class="customer-search__section"
          aria-labelledby="search-movies-title"
        >
          <h2 id="search-movies-title">
            Phim <span>{{ movieMatches.length }}</span>
          </h2>
          <div id="search-movies-results" class="movies-grid">
            <CatalogMovieCard v-for="movie in visibleMovies" :key="movie.id" :movie="movie" />
          </div>
          <AppPagination
            :page="moviePage"
            :total="movieMatches.length"
            :page-size="pageSize"
            :disabled="navigating"
            controls="search-movies-results"
            @update:page="changePage('page', $event)"
          />
        </section>
        <section
          v-if="visibleCinemas.length"
          class="customer-search__section"
          aria-labelledby="search-cinemas-title"
        >
          <h2 id="search-cinemas-title">
            Rạp chiếu <span>{{ cinemaMatches.length }}</span>
          </h2>
          <div id="search-cinemas-results" class="customer-search__cinemas">
            <article
              v-for="cinema in visibleCinemas"
              :key="cinema.id"
              class="customer-search__cinema"
            >
              <RouterLink
                :to="{ name: ROUTE_NAMES.CINEMA_DETAIL, params: { cinemaId: cinema.id } }"
                :aria-label="`Xem rạp ${cinema.name}`"
                ><img
                  src="/customer/cinema-placeholder.svg"
                  alt="Không gian điện ảnh minh họa"
                  loading="lazy"
              /></RouterLink>
              <div>
                <p class="lumiere-eyebrow">{{ cinema.city }}</p>
                <h3>{{ cinema.name }}</h3>
                <p>{{ cinema.address || 'Địa chỉ đang được cập nhật.' }}</p>
                <RouterLink
                  :to="{ name: ROUTE_NAMES.CINEMA_DETAIL, params: { cinemaId: cinema.id } }"
                  >Khám phá rạp →</RouterLink
                >
              </div>
            </article>
          </div>
          <AppPagination
            :page="cinemaPage"
            :total="cinemaMatches.length"
            :page-size="pageSize"
            :disabled="navigating"
            controls="search-cinemas-results"
            @update:page="changePage('cinemaPage', $event)"
          />
        </section>
        <AppEmptyState
          v-if="!pending && !failed && !movieMatches.length && !cinemaMatches.length"
          title="Chưa tìm thấy kết quả"
          description="Thử từ khóa ngắn hơn hoặc khám phá lịch chiếu."
        />
      </template>
      <RouterLink class="customer-search__schedule" :to="{ name: ROUTE_NAMES.SHOWTIMES }"
        >Khám phá lịch chiếu →</RouterLink
      >
    </AppContainer>
  </div>
</template>

<style src="../../../styles/customer-search.css"></style>
