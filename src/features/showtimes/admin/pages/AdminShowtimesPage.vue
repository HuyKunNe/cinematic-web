<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import {
  formatCinemaDateKey,
  formatCinemaTime,
  getCinemaDateKey,
  getCinemaDayRange,
} from '@/utils/cinema-time'
import { useAdminShowtimeMoviesQuery, useAdminShowtimesQuery } from '../api/admin-showtime-queries'
import {
  showtimeErrorMessage,
  showtimeStatusLabels,
  showtimeStatusOptions,
} from '../schemas/admin-showtime.schema'

const PAGE_SIZE = 20
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE),
)

function today() {
  return getCinemaDateKey(new Date().toISOString())
}

const date = ref(today())
const search = ref('')
const cinemaId = ref('')
const roomId = ref('')
const status = ref('')
const page = ref(1)

const validDate = computed(() => getCinemaDayRange(date.value) !== null)

const showtimes = useAdminShowtimesQuery(date, canManage)
const movies = useAdminShowtimeMoviesQuery(canManage)

const refreshing = computed(() => showtimes.isFetching.value || movies.isFetching.value)

const rows = computed(() => (canManage.value ? (showtimes.data.value ?? []) : []))

const movieTitles = computed(
  () => new Map((movies.data.value ?? []).map((movie) => [movie.id, movie.title])),
)

function movieTitle(movieId: string) {
  return movieTitles.value.get(movieId) ?? `Mã phim: ${movieId}`
}

const cinemaOptions = computed(() =>
  Array.from(
    new Map(rows.value.map((item) => [item.cinemaId, item.cinemaName])),
    ([value, label]) => ({ value, label }),
  ).sort((left, right) => left.label.localeCompare(right.label, 'vi')),
)

const roomOptions = computed(() =>
  Array.from(
    new Map(
      rows.value
        .filter((item) => !cinemaId.value || item.cinemaId === cinemaId.value)
        .map((item) => [item.roomId, `${item.cinemaName} · ${item.roomName}`]),
    ),
    ([value, label]) => ({ value, label }),
  ).sort((left, right) => left.label.localeCompare(right.label, 'vi')),
)

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('vi')

  return rows.value.filter(
    (item) =>
      (!keyword || movieTitle(item.movieId).toLocaleLowerCase('vi').includes(keyword)) &&
      (!cinemaId.value || item.cinemaId === cinemaId.value) &&
      (!roomId.value || item.roomId === roomId.value) &&
      (!status.value || item.status === status.value),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))

const currentPage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))

const firstIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)

const pageRows = computed(() =>
  filteredRows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE),
)

watch([date, search, cinemaId, roomId, status], () => {
  page.value = 1
})

watch(date, () => {
  cinemaId.value = ''
  roomId.value = ''
})

watch(cinemaId, () => {
  roomId.value = ''
})

function moveDay(direction: -1 | 1) {
  const range = getCinemaDayRange(date.value)
  if (!range) return

  date.value = getCinemaDateKey(
    new Date(Date.parse(range.from) + direction * DAY_MILLISECONDS).toISOString(),
  )
}

async function reload() {
  if (!canManage.value || !validDate.value || refreshing.value) return

  await Promise.allSettled([showtimes.refetch(), movies.refetch()])
}
</script>

<template>
  <section
    class="admin-reference is-showtimes"
    data-reference="admin-showtimes"
    aria-labelledby="admin-showtimes-title"
  >
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Lịch vận hành</p>
        <h1 id="admin-showtimes-title" tabindex="-1">Quản lý suất chiếu</h1>
        <p class="admin-reference__description">Theo dõi lịch chiếu tại các rạp.</p>
      </div>

      <RouterLink
        v-if="canManage"
        class="admin-reference__link-button is-primary"
        :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIME_CREATE }"
      >
        <span aria-hidden="true">＋</span>
        Tạo suất chiếu
      </RouterLink>
    </header>

    <p v-if="!canManage" class="admin-showtimes__error" role="alert">
      Bạn không có quyền quản lý suất chiếu.
    </p>

    <template v-else>
      <section
        class="admin-reference__panel admin-reference__datebar"
        aria-label="Chọn ngày xem lịch"
      >
        <div class="admin-reference__datebar-title">
          <strong>Lịch chiếu</strong>
          <span class="admin-reference__muted">
            {{ formatCinemaDateKey(date) || 'Chọn ngày hợp lệ' }}
            · Giờ Việt Nam
          </span>
        </div>

        <div class="admin-reference__datebar-controls">
          <AppButton
            variant="secondary"
            :disabled="!validDate"
            aria-label="Ngày trước"
            @click="moveDay(-1)"
          >
            ‹
          </AppButton>

          <AppButton variant="secondary" @click="date = today()"> Hôm nay </AppButton>

          <input
            v-model="date"
            class="admin-reference__input"
            type="date"
            min="0001-01-01"
            max="9999-12-30"
            aria-label="Ngày xem lịch"
            :aria-invalid="!validDate"
          />

          <AppButton
            variant="secondary"
            :disabled="!validDate"
            aria-label="Ngày tiếp theo"
            @click="moveDay(1)"
          >
            ›
          </AppButton>
        </div>
      </section>

      <p v-if="!validDate" class="admin-showtimes__error" role="alert">
        Chọn ngày hợp lệ để tải lịch chiếu.
      </p>

      <section class="admin-reference__filters" aria-label="Lọc suất chiếu">
        <label class="admin-reference__field">
          <span>Tìm phim</span>
          <input
            v-model="search"
            class="admin-reference__input"
            type="search"
            placeholder="Nhập tên hoặc mã phim"
          />
        </label>

        <label class="admin-reference__field">
          <span>Rạp</span>
          <select v-model="cinemaId" class="admin-reference__input">
            <option value="">Tất cả rạp trong ngày</option>
            <option v-for="option in cinemaOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Phòng</span>
          <select v-model="roomId" class="admin-reference__input">
            <option value="">Tất cả phòng trong ngày</option>
            <option v-for="option in roomOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Trạng thái</span>
          <select v-model="status" class="admin-reference__input">
            <option value="">Tất cả trạng thái</option>
            <option
              v-for="option in showtimeStatusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </section>

      <p v-if="showtimes.isError.value" class="admin-showtimes__error" role="alert">
        {{ showtimeErrorMessage(showtimes.error.value) }}
        <template v-if="rows.length"> Đang hiển thị dữ liệu từ lần tải trước. </template>
      </p>

      <p v-if="movies.isError.value" class="admin-reference__muted" role="status">
        Chưa cập nhật được tên phim. Phim chưa có tên được hiển thị bằng mã.
      </p>

      <section
        class="admin-reference__panel"
        aria-labelledby="admin-showtimes-list-title"
        :aria-busy="showtimes.isFetching.value"
      >
        <header class="admin-reference__list-heading">
          <div>
            <h2 id="admin-showtimes-list-title">Suất chiếu trong ngày</h2>
            <p>{{ formatCinemaDateKey(date) }} · Giờ Việt Nam</p>
          </div>

          <AppButton
            variant="secondary"
            :disabled="!validDate || refreshing"
            :loading="refreshing"
            @click="reload"
          >
            Tải lại
          </AppButton>
        </header>

        <p v-if="showtimes.isFetching.value" class="admin-reference__note" role="status">
          Đang tải lịch chiếu…
        </p>

        <div
          class="admin-reference__table-scroll"
          role="region"
          aria-label="Danh sách suất chiếu"
          tabindex="0"
        >
          <table class="admin-reference__table">
            <caption class="admin-visually-hidden">
              Suất chiếu trong ngày theo giờ Việt Nam
            </caption>
            <thead>
              <tr>
                <th scope="col">Giờ chiếu</th>
                <th scope="col">Phim</th>
                <th scope="col">Rạp / Phòng</th>
                <th scope="col">Định dạng</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in pageRows" :key="item.id">
                <th scope="row">
                  <time :datetime="item.startsAt">
                    {{ formatCinemaTime(item.startsAt) }}
                  </time>
                </th>
                <td>{{ movieTitle(item.movieId) }}</td>
                <td>
                  <div>{{ item.cinemaName }}</div>
                  <div>{{ item.roomName }}</div>
                </td>
                <td>—</td>
                <td>{{ showtimeStatusLabels[item.status] }}</td>
              </tr>

              <tr v-if="pageRows.length === 0">
                <td colspan="5" class="admin-reference__empty">
                  {{
                    !validDate
                      ? 'Chọn ngày hợp lệ.'
                      : showtimes.isFetching.value
                        ? 'Đang tải lịch chiếu…'
                        : showtimes.isError.value
                          ? 'Chưa thể tải lịch chiếu. Chọn “Tải lại” để thử lại.'
                          : 'Không có suất chiếu phù hợp.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-reference__table-footer">
          <span>
            {{
              filteredRows.length
                ? `Hiển thị ${firstIndex + 1}–${
                    firstIndex + pageRows.length
                  } trong ${filteredRows.length} suất chiếu`
                : 'Không có dữ liệu hiển thị'
            }}
          </span>

          <nav class="admin-reference__pagination" aria-label="Phân trang">
            <button
              type="button"
              :disabled="currentPage <= 1"
              aria-label="Trang trước"
              @click="page = currentPage - 1"
            >
              ‹
            </button>
            <span>Trang {{ currentPage }} / {{ totalPages }}</span>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              aria-label="Trang tiếp theo"
              @click="page = currentPage + 1"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-showtimes'] .admin-showtimes__error {
  color: var(--color-error);
}

[data-reference='admin-showtimes'] :is(input, select, button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
