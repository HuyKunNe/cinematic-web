<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type { GetMovieCatalogParams } from '@/services/api/generated/movie-service/model'
import AdminMovieEditorDialog from '../components/AdminMovieEditorDialog.vue'
import { useAdminMovieCatalogQuery, useAdminMovieGenresQuery } from '../api/admin-movie-queries'
import AdminGenreManagerDialog from '../components/AdminGenreManagerDialog.vue'
import {
  adminMovieErrorMessage,
  isMovieStatus,
  movieStatusLabels,
  movieStatusOptions,
} from '../schemas/admin-movie.schema'

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.MOVIE_MANAGE),
)

const statusFilter = ref('all')
const genreFilter = ref('all')
const genreManagerOpen = ref(false)
const page = ref(0)

const params = computed<GetMovieCatalogParams>(() => ({
  page: page.value,
  size: 20,
  status: isMovieStatus(statusFilter.value) ? statusFilter.value : undefined,
  genre: genreFilter.value === 'all' ? undefined : genreFilter.value,
}))

const catalog = useAdminMovieCatalogQuery(params, canManage)
const genresQuery = useAdminMovieGenresQuery(canManage)

const rows = computed(() => catalog.data.value?.content ?? [])
const pageInfo = computed(() => catalog.data.value?.page)
const totalPages = computed(() => pageInfo.value?.totalPages ?? 0)

const statusOptions = [{ value: 'all', label: 'Tất cả trạng thái' }, ...movieStatusOptions]

const genreOptions = computed(() => [
  { value: 'all', label: 'Tất cả thể loại' },
  ...(genresQuery.data.value ?? []).flatMap((genre) =>
    genre.id && genre.name ? [{ value: genre.id, label: genre.name }] : [],
  ),
])

watch(
  [statusFilter, genreFilter],
  () => {
    page.value = 0
  },
  { flush: 'sync' },
)

watch([catalog.data, catalog.isFetching, catalog.isSuccess], ([response, fetching, success]) => {
  if (!success || fetching) return

  const pages = response?.page?.totalPages

  if (pages == null) return

  const lastPage = Math.max(0, pages - 1)

  if (page.value > lastPage) page.value = lastPage
})

const editorOpen = ref(false)
const editorMovieId = ref<string | null>(null)
const editorSession = ref(0)
const successMessage = ref('')

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
  successMessage.value = created
    ? 'Đã thêm phim. Danh sách sẽ hiển thị theo bộ lọc hiện tại.'
    : 'Đã lưu thay đổi.'

  if (created) page.value = 0
}

function statusLabel(status: unknown) {
  return isMovieStatus(status) ? movieStatusLabels[status] : 'Chưa có trạng thái'
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00Z`)

  if (!Number.isFinite(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
  }).format(date)
}
</script>
<template>
  <section class="admin-movies" aria-labelledby="admin-movies-title">
    <header class="admin-movies__heading">
      <div>
        <p class="admin-movies__eyebrow">Nội dung</p>
        <h1 id="admin-movies-title" tabindex="-1">Quản lý phim</h1>
        <p class="admin-movies__muted">Quản lý thông tin phim, trạng thái và thể loại.</p>
      </div>

      <div class="admin-movies__heading-actions">
        <AppButton variant="secondary" :disabled="!canManage" @click="genreManagerOpen = true">
          Thể loại
        </AppButton>
        <AppButton :disabled="!canManage" @click="openEditor(null)">
          <span aria-hidden="true">＋</span>
          Thêm phim
        </AppButton>
      </div>
    </header>

    <p v-if="successMessage" class="admin-movies__success" role="status">
      {{ successMessage }}
    </p>
    <p v-if="!canManage" class="admin-movies__error" role="alert">
      Tài khoản không có quyền quản lý phim.
    </p>

    <template v-else>
      <section class="admin-movies__filters" aria-label="Lọc phim">
        <AppSelect
          id="admin-movies-status-filter"
          v-model="statusFilter"
          label="Trạng thái"
          :options="statusOptions"
        />
        <AppSelect
          id="admin-movies-genre-filter"
          v-model="genreFilter"
          label="Thể loại"
          :options="genreOptions"
          :loading="genresQuery.isFetching.value"
          :disabled="genresQuery.isError.value"
        />
        <AppButton
          variant="secondary"
          @click="
            () => {
              statusFilter = 'all'
              genreFilter = 'all'
            }
          "
        >
          Đặt lại
        </AppButton>
      </section>

      <div v-if="genresQuery.isError.value" class="admin-movies__feedback">
        <p class="admin-movies__error" role="alert">
          {{ adminMovieErrorMessage(genresQuery.error.value, 'Không thể tải bộ lọc thể loại.') }}
        </p>
        <AppButton
          variant="secondary"
          :loading="genresQuery.isFetching.value"
          @click="genresQuery.refetch()"
        >
          Tải lại thể loại
        </AppButton>
      </div>

      <section
        class="admin-movies__panel"
        aria-labelledby="admin-movie-list-title"
        :aria-busy="catalog.isFetching.value"
      >
        <header class="admin-movies__list-heading">
          <div>
            <h2 id="admin-movie-list-title">Danh sách phim</h2>
            <p>Thông tin phim theo bộ lọc hiện tại</p>
          </div>
          <span class="admin-movies__muted"> {{ pageInfo?.totalElements ?? '—' }} phim </span>
        </header>

        <p v-if="catalog.isFetching.value" class="admin-cinemas__feedback" role="status">
          Đang tải danh sách phim…
        </p>
        <div v-if="catalog.isError.value" class="admin-cinemas__feedback">
          <p class="admin-movies__error" role="alert">
            {{ adminMovieErrorMessage(catalog.error.value) }}
          </p>
          <AppButton
            variant="secondary"
            :loading="catalog.isFetching.value"
            @click="catalog.refetch()"
          >
            Thử lại
          </AppButton>
        </div>

        <div
          class="admin-movies__table-container"
          role="region"
          aria-label="Danh sách phim"
          tabindex="0"
        >
          <table class="admin-movies__table">
            <caption class="admin-visually-hidden">
              Danh sách phim theo bộ lọc hiện tại
            </caption>
            <thead>
              <tr>
                <th scope="col">Phim</th>
                <th scope="col">Thể loại</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thời lượng</th>
                <th scope="col">Phát hành</th>
                <th scope="col"><span class="admin-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(movie, index) in rows" :key="movie.id ?? `missing-id-${index}`">
                <th scope="row">
                  <span class="admin-movies__movie-title">
                    {{ movie.title || 'Chưa có tên phim' }}
                  </span>
                  <span class="admin-movies__movie-id">
                    {{ movie.id || 'Thiếu mã phim' }}
                  </span>
                </th>
                <td>
                  {{
                    (movie.genres ?? [])
                      .map((genre) => genre.name)
                      .filter(Boolean)
                      .join(', ') || '—'
                  }}
                </td>
                <td>
                  <span class="admin-movies__status">{{ statusLabel(movie.status) }}</span>
                </td>
                <td>
                  {{ movie.durationMinutes == null ? '—' : `${movie.durationMinutes} phút` }}
                </td>
                <td>{{ formatDate(movie.releaseDate) }}</td>
                <td>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    :disabled="!movie.id || !canManage"
                    :aria-label="`Sửa phim ${movie.title ?? ''}`"
                    @click="movie.id && openEditor(movie.id)"
                  >
                    Sửa
                  </AppButton>
                </td>
              </tr>

              <tr v-if="!rows.length">
                <td colspan="6" class="admin-movies__empty">
                  {{
                    catalog.isFetching.value
                      ? 'Đang tải danh sách phim…'
                      : catalog.isError.value
                        ? 'Chưa tải được danh sách phim.'
                        : 'Không có phim phù hợp với bộ lọc.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="catalog.data.value" class="admin-movies__pagination">
          <span>
            Tổng {{ pageInfo?.totalElements ?? '—' }} phim
            <template v-if="totalPages > 0"> · Trang {{ page + 1 }}/{{ totalPages }}</template>
          </span>
          <div class="admin-movies__pagination-actions">
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="catalog.isFetching.value || page === 0"
              @click="page -= 1"
            >
              Trước
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="catalog.isFetching.value || page + 1 >= totalPages"
              @click="page += 1"
            >
              Sau
            </AppButton>
          </div>
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
