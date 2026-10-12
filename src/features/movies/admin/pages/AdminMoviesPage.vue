<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Film } from 'lucide-vue-next'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type {
  GetMovieCatalogParams,
  MovieResponse,
} from '@/services/api/generated/movie-service/model'
import { useAdminMovieCatalogQuery, useAdminMovieGenresQuery } from '../api/admin-movie-queries'
import {
  adminMovieErrorMessage,
  isMovieStatus,
  movieStatusOptions,
} from '../schemas/admin-movie.schema'
import AdminMovieEditorDialog from '../components/AdminMovieEditorDialog.vue'
import AdminGenreManagerDialog from '../components/AdminGenreManagerDialog.vue'

const auth = useAuthStore()
const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.MOVIE_MANAGE),
)

const pageSize = 10
const page = ref(0)
const statusFilter = ref('all')
const genreFilter = ref('all')
const genreManagerOpen = ref(false)
const editorOpen = ref(false)
const editorMovieId = ref<string | null>(null)
const editorSession = ref(0)
const successMessage = ref('')
const failedPosters = ref(new Set<string>())

const params = computed<GetMovieCatalogParams>(() => ({
  page: page.value,
  size: pageSize,
  status: isMovieStatus(statusFilter.value) ? statusFilter.value : undefined,
  genre: genreFilter.value === 'all' ? undefined : genreFilter.value,
}))

const catalog = useAdminMovieCatalogQuery(params, canManage)
const genresQuery = useAdminMovieGenresQuery(canManage)
const rows = computed(() => catalog.data.value?.content ?? [])
const pageInfo = computed(() => catalog.data.value?.page)
const totalPages = computed(() => pageInfo.value?.totalPages ?? 0)

const summaryDefinitions: {
  label: string
  hint: string
  status?: GetMovieCatalogParams['status']
}[] = [
  { label: 'Tổng số phim', hint: 'Trong danh mục' },
  { label: 'Đang chiếu', hint: 'Trạng thái đang chiếu', status: 'NOW_SHOWING' },
  { label: 'Sắp chiếu', hint: 'Trạng thái sắp chiếu', status: 'UPCOMING' },
  { label: 'Tạm ẩn', hint: 'Ngừng hiển thị', status: 'INACTIVE' },
]

const summaries = summaryDefinitions.map((definition) => ({
  ...definition,
  query: useAdminMovieCatalogQuery({ page: 0, size: 1, status: definition.status }, canManage),
}))

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...movieStatusOptions.map((item) => ({
    ...item,
    label: item.value === 'INACTIVE' ? 'Tạm ẩn' : item.label,
  })),
]

const genreOptions = computed(() =>
  (genresQuery.data.value ?? []).flatMap((genre) =>
    genre.id && genre.name ? [{ value: genre.id, label: genre.name }] : [],
  ),
)

const countFormatter = new Intl.NumberFormat('vi-VN')
function formatCount(value?: number) {
  return value == null ? '—' : countFormatter.format(value)
}

const rangeLabel = computed(() => {
  const total = pageInfo.value?.totalElements
  if (total == null) return 'Chưa có thông tin phân trang'
  if (!rows.value.length) return `Hiển thị 0 trong ${formatCount(total)} phim`

  const first = page.value * pageSize + 1
  const last = Math.min(total, page.value * pageSize + rows.value.length)
  return `Hiển thị ${first}–${last} trong ${formatCount(total)} phim`
})

const paginationItems = computed<(number | string)[]>(() => {
  const total = totalPages.value
  if (!total) return []

  const current = page.value + 1
  const candidates = new Set([1, total, current - 1, current, current + 1])
  const numbers = [...candidates]
    .filter((number) => number >= 1 && number <= total)
    .sort((a, b) => a - b)

  const items: (number | string)[] = []
  numbers.forEach((number, index) => {
    const previous = numbers[index - 1]
    if (previous != null && number - previous > 1) {
      items.push(`gap-${previous}`)
    }
    items.push(number)
  })
  return items
})

watch(
  [statusFilter, genreFilter],
  () => {
    page.value = 0
  },
  { flush: 'sync' },
)

watch([catalog.data, catalog.isFetching, catalog.isSuccess], ([response, fetching, success]) => {
  if (!success || fetching || response?.page?.totalPages == null) return
  page.value = Math.min(page.value, Math.max(0, response.page.totalPages - 1))
})

function resetFilters() {
  statusFilter.value = 'all'
  genreFilter.value = 'all'
}

function openEditor(movieId: string | null) {
  if (!canManage.value) return
  successMessage.value = ''
  editorMovieId.value = movieId
  editorSession.value += 1
  editorOpen.value = true
}

function onSaved() {
  const created = editorMovieId.value === null
  editorOpen.value = false
  failedPosters.value = new Set()
  successMessage.value = created ? 'Đã thêm phim.' : 'Đã lưu thay đổi.'
  if (created) page.value = 0
}

function genreLabel(movie: MovieResponse) {
  return (
    (movie.genres ?? [])
      .map((genre) => genre.name)
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function movieMeta(movie: MovieResponse) {
  const duration = movie.durationMinutes == null ? '—' : `${movie.durationMinutes} phút`
  return `${genreLabel(movie)} · ${duration}`
}

function statusLabel(status: unknown) {
  switch (status) {
    case 'NOW_SHOWING':
      return 'Đang chiếu'
    case 'UPCOMING':
      return 'Sắp chiếu'
    case 'INACTIVE':
      return 'Tạm ẩn'
    case 'ENDED':
      return 'Đã kết thúc'
    default:
      return 'Chưa xác định'
  }
}

function statusTone(status: unknown) {
  if (status === 'NOW_SHOWING') return 'success'
  if (status === 'UPCOMING') return 'warning'
  return 'muted'
}

function ageTone(age: unknown) {
  if (age === 'P' || age === 'K') return 'success'
  if (age === 'T13') return 'warning'
  if (age === 'T16') return 'primary'
  if (age === 'T18') return 'error'
  return 'muted'
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(date)
}

function posterAvailable(movie: MovieResponse) {
  return Boolean(movie.posterUrl && !failedPosters.value.has(movie.posterUrl))
}

function posterFailed(url?: string) {
  if (url) failedPosters.value = new Set([...failedPosters.value, url])
}

const emptyMessage = computed(() =>
  catalog.isFetching.value
    ? 'Đang tải danh sách phim…'
    : catalog.isError.value
      ? 'Chưa tải được danh sách phim.'
      : 'Không có phim phù hợp với bộ lọc.',
)
</script>

<template>
  <section class="movie-admin" aria-labelledby="admin-movies-title">
    <header class="movie-admin__heading">
      <div>
        <p class="movie-admin__eyebrow">Danh mục nội dung</p>
        <h1 id="admin-movies-title" tabindex="-1">Quản lý phim</h1>
        <p class="movie-admin__description">
          Quản lý thông tin, phân loại độ tuổi và trạng thái phát hành.
        </p>
      </div>
      <div class="movie-admin__heading-actions">
        <button
          class="movie-admin__button"
          type="button"
          :disabled="!canManage"
          @click="genreManagerOpen = true"
        >
          Thể loại
        </button>
        <button
          class="movie-admin__button is-primary"
          type="button"
          :disabled="!canManage"
          @click="openEditor(null)"
        >
          <span aria-hidden="true">＋</span> Thêm phim
        </button>
      </div>
    </header>

    <p v-if="successMessage" class="movie-admin__success" role="status">
      {{ successMessage }}
    </p>
    <p v-if="!canManage" class="movie-admin__error" role="alert">
      Tài khoản không có quyền quản lý phim.
    </p>

    <template v-else>
      <aside class="movie-admin__note">
        <span aria-hidden="true">ⓘ</span>
        <span>Tìm theo tên và lọc độ tuổi hiện chưa khả dụng.</span>
      </aside>

      <section class="movie-admin__stats" aria-label="Tổng quan danh mục phim">
        <article
          v-for="summary in summaries"
          :key="summary.label"
          class="movie-admin__stat"
          :aria-busy="summary.query.isFetching.value"
        >
          <span>{{ summary.label }}</span>
          <strong>{{ formatCount(summary.query.data.value?.page?.totalElements) }}</strong>
          <small>{{ summary.hint }}</small>
          <small v-if="summary.query.isFetching.value" role="status">Đang cập nhật…</small>
          <template v-else-if="summary.query.isError.value">
            <small class="movie-admin__error" role="alert">
              {{ adminMovieErrorMessage(summary.query.error.value) }}
            </small>
            <button class="movie-admin__text-button" type="button" @click="summary.query.refetch()">
              Thử lại
            </button>
          </template>
        </article>
      </section>

      <section class="movie-admin__toolbar" aria-label="Tìm kiếm và lọc phim">
        <label class="movie-admin__field">
          <span>Tìm phim</span>
          <input type="search" placeholder="Nhập tên phim…" disabled />
        </label>
        <label class="movie-admin__field">
          <span>Trạng thái</span>
          <select v-model="statusFilter">
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label class="movie-admin__field">
          <span>Thể loại</span>
          <select
            v-model="genreFilter"
            :disabled="genresQuery.isError.value && !genresQuery.data.value"
            :aria-busy="genresQuery.isFetching.value"
          >
            <option value="all">Tất cả thể loại</option>
            <option v-for="item in genreOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label class="movie-admin__field">
          <span>Độ tuổi</span>
          <select disabled>
            <option>Tất cả phân loại</option>
          </select>
        </label>
        <button class="movie-admin__button" type="button" @click="resetFilters">Đặt lại</button>
      </section>

      <div v-if="genresQuery.isError.value" class="movie-admin__feedback" role="alert">
        <p>{{ adminMovieErrorMessage(genresQuery.error.value, 'Không thể tải thể loại.') }}</p>
        <button
          class="movie-admin__text-button"
          type="button"
          :disabled="genresQuery.isFetching.value"
          @click="genresQuery.refetch()"
        >
          Tải lại thể loại
        </button>
      </div>

      <section
        class="movie-admin__list"
        aria-labelledby="admin-movie-list-title"
        :aria-busy="catalog.isFetching.value"
      >
        <header class="movie-admin__list-heading">
          <div>
            <h2 id="admin-movie-list-title">Danh sách phim</h2>
            <p>Thông tin phim và tình trạng phát hành</p>
          </div>
          <span>{{ formatCount(pageInfo?.totalElements) }} phim</span>
        </header>

        <p v-if="catalog.isFetching.value" class="movie-admin__feedback" role="status">
          Đang cập nhật danh sách…
        </p>
        <div v-if="catalog.isError.value" class="movie-admin__feedback" role="alert">
          <p>{{ adminMovieErrorMessage(catalog.error.value) }}</p>
          <button
            class="movie-admin__text-button"
            type="button"
            :disabled="catalog.isFetching.value"
            @click="catalog.refetch()"
          >
            Thử lại
          </button>
        </div>

        <div
          class="movie-admin__table-scroll"
          role="region"
          aria-label="Danh sách phim"
          tabindex="0"
        >
          <table class="movie-admin__table">
            <caption class="admin-visually-hidden">
              Danh sách phim theo bộ lọc hiện tại
            </caption>
            <thead>
              <tr>
                <th scope="col">Phim</th>
                <th scope="col">Độ tuổi</th>
                <th scope="col">Thể loại · Thời lượng</th>
                <th scope="col">Ngày phát hành</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span class="admin-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(movie, index) in rows" :key="movie.id ?? index">
                <td>
                  <div class="movie-admin__title-cell">
                    <span class="movie-admin__poster" aria-hidden="true">
                      <img
                        v-if="posterAvailable(movie)"
                        :src="movie.posterUrl"
                        alt=""
                        loading="lazy"
                        @error="posterFailed(movie.posterUrl)"
                      />
                      <Film v-else />
                    </span>
                    <span class="movie-admin__title-copy">
                      <strong>{{ movie.title || 'Chưa có tên phim' }}</strong>
                      <small v-if="movie.description">{{ movie.description }}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <span class="movie-admin__badge" :class="`is-${ageTone(movie.ageRating)}`">
                    {{ movie.ageRating ?? '—' }}
                  </span>
                </td>
                <td>{{ movieMeta(movie) }}</td>
                <td>{{ formatDate(movie.releaseDate) }}</td>
                <td>
                  <span class="movie-admin__badge" :class="`is-${statusTone(movie.status)}`">
                    {{ statusLabel(movie.status) }}
                  </span>
                </td>
                <td>
                  <button
                    class="movie-admin__row-action"
                    type="button"
                    :disabled="!movie.id"
                    :aria-label="`Chỉnh sửa phim ${movie.title || ''}`"
                    @click="movie.id && openEditor(movie.id)"
                  >
                    <span aria-hidden="true">•••</span>
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="6" class="movie-admin__empty">{{ emptyMessage }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="movie-admin__mobile-list" aria-label="Danh sách phim dạng thẻ">
          <article
            v-for="(movie, index) in rows"
            :key="movie.id ?? index"
            class="movie-admin__mobile-card"
          >
            <span class="movie-admin__poster" aria-hidden="true">
              <img
                v-if="posterAvailable(movie)"
                :src="movie.posterUrl"
                alt=""
                loading="lazy"
                @error="posterFailed(movie.posterUrl)"
              />
              <Film v-else />
            </span>
            <div class="movie-admin__mobile-content">
              <div class="movie-admin__mobile-title">
                <strong>{{ movie.title || 'Chưa có tên phim' }}</strong>
                <span class="movie-admin__badge" :class="`is-${statusTone(movie.status)}`">
                  {{ statusLabel(movie.status) }}
                </span>
              </div>
              <span>{{ movieMeta(movie) }}</span>
              <div class="movie-admin__mobile-meta">
                <span class="movie-admin__badge" :class="`is-${ageTone(movie.ageRating)}`">
                  {{ movie.ageRating ?? '—' }}
                </span>
                <span>Phát hành: {{ formatDate(movie.releaseDate) }}</span>
              </div>
            </div>
            <button
              class="movie-admin__row-action"
              type="button"
              :disabled="!movie.id"
              :aria-label="`Chỉnh sửa phim ${movie.title || ''}`"
              @click="movie.id && openEditor(movie.id)"
            >
              <span aria-hidden="true">•••</span>
            </button>
          </article>
          <p v-if="!rows.length" class="movie-admin__empty">{{ emptyMessage }}</p>
        </div>

        <footer v-if="catalog.data.value" class="movie-admin__pagination">
          <span>{{ rangeLabel }}</span>
          <nav aria-label="Phân trang danh sách phim">
            <button
              type="button"
              aria-label="Trang trước"
              :disabled="catalog.isFetching.value || page === 0"
              @click="page--"
            >
              ‹
            </button>
            <template v-for="item in paginationItems" :key="item">
              <button
                v-if="typeof item === 'number'"
                type="button"
                :class="{ 'is-current': page + 1 === item }"
                :aria-current="page + 1 === item ? 'page' : undefined"
                :aria-label="`Trang ${item}`"
                :disabled="catalog.isFetching.value"
                @click="page = item - 1"
              >
                {{ item }}
              </button>
              <span v-else aria-hidden="true">…</span>
            </template>
            <button
              type="button"
              aria-label="Trang tiếp theo"
              :disabled="catalog.isFetching.value || page + 1 >= totalPages"
              @click="page++"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
    </template>

    <AdminMovieEditorDialog
      v-if="editorOpen"
      :key="editorSession"
      :movie-id="editorMovieId"
      @close="editorOpen = false"
      @saved="onSaved"
    />
    <AdminGenreManagerDialog v-if="genreManagerOpen" @close="genreManagerOpen = false" />
  </section>
</template>
