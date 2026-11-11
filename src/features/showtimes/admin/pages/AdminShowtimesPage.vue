<script setup lang="ts">
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
import { computed, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { RouterLink, useRoute } from 'vue-router'
import { useAdminShowtimeMoviesQuery, useAdminShowtimesQuery } from '../api/admin-showtime-queries'
import AdminShowtimePricingDialog from '../components/AdminShowtimePricingDialog.vue'
import AdminShowtimeOpenDialog from '../components/AdminShowtimeOpenDialog.vue'
import AdminShowtimeMovieSelect from '../components/AdminShowtimeMovieSelect.vue'
import {
  showtimeErrorMessage,
  showtimePresentationLabels,
  showtimeProjectionTechnologyLabels,
  showtimeStatusLabels,
  showtimeStatusOptions,
  type AdminShowtime,
} from '../schemas/admin-showtime.schema'

const PAGE_SIZE = 20
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000

const auth = useAuthStore()
const now = useNow()

function actionHint(item: AdminShowtime): string {
  switch (item.status) {
    case 'SCHEDULED':
      if (Date.parse(item.startsAt) <= now.value.getTime())
        return 'Đã qua giờ bắt đầu. Tải lại để kiểm tra trạng thái hiện tại.'
      if (!item.screeningVersion)
        return 'Thiếu phiên bản chiếu. Kiểm tra thông tin trước khi mở bán.'
      return 'Kiểm tra bảng giá và điều kiện trước khi xác nhận mở bán.'
    case 'OPEN_FOR_BOOKING':
      return 'Suất đã mở bán.'
    case 'CLOSED':
      return 'Suất đã đóng bán.'
    case 'CANCELLED':
      return 'Suất đã hủy.'
    case 'COMPLETED':
      return 'Suất đã hoàn tất.'
  }
}

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE),
)
const canEditPricing = computed(
  () => canManage.value && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const pricingShowtimeId = ref('')
const pricingMovieTitle = ref('')
const openingShowtimeId = ref('')
const openingMovieTitle = ref('')

function today() {
  return getCinemaDateKey(new Date().toISOString())
}

const route = useRoute()

const linkedDate =
  typeof route.query.date === 'string' && getCinemaDayRange(route.query.date) !== null
    ? route.query.date
    : today()

const date = ref(linkedDate)
const movieFilterId = ref('')
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

const scopedRows = computed(() => {
  return rows.value.filter(
    (item) =>
      (!movieFilterId.value || item.movieId === movieFilterId.value) &&
      (!cinemaId.value || item.cinemaId === cinemaId.value) &&
      (!roomId.value || item.roomId === roomId.value),
  )
})
const filteredRows = computed(() =>
  scopedRows.value.filter((item) => !status.value || item.status === status.value),
)
const statusSummaries = computed(() => [
  { value: '', label: 'Tất cả', count: scopedRows.value.length },
  ...showtimeStatusOptions.map((option) => ({
    ...option,
    count: scopedRows.value.filter((item) => item.status === option.value).length,
  })),
])

const activeFilters = computed(() =>
  [
    {
      value: movieFilterId.value,
      label: `Phim: ${movieTitle(movieFilterId.value)}`,
      clear: () => {
        movieFilterId.value = ''
      },
    },
    {
      value: cinemaId.value,
      label: `Rạp: ${cinemaOptions.value.find((item) => item.value === cinemaId.value)?.label ?? cinemaId.value}`,
      clear: () => {
        cinemaId.value = ''
      },
    },
    {
      value: roomId.value,
      label: `Phòng: ${roomOptions.value.find((item) => item.value === roomId.value)?.label ?? roomId.value}`,
      clear: () => {
        roomId.value = ''
      },
    },
    {
      value: status.value,
      label: `Trạng thái: ${showtimeStatusOptions.find((item) => item.value === status.value)?.label ?? status.value}`,
      clear: () => {
        status.value = ''
      },
    },
  ].filter((item) => item.value),
)

function clearFilters() {
  movieFilterId.value = ''
  cinemaId.value = ''
  roomId.value = ''
  status.value = ''
  page.value = 1
}

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))

const currentPage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))

const firstIndex = computed(() => (currentPage.value - 1) * PAGE_SIZE)

const pageRows = computed(() =>
  filteredRows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE),
)

watch([date, movieFilterId, cinemaId, roomId, status], () => {
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

function openPricing(item: AdminShowtime): void {
  if (
    !canEditPricing.value ||
    item.status !== 'SCHEDULED' ||
    pricingShowtimeId.value ||
    openingShowtimeId.value
  )
    return

  pricingMovieTitle.value = movieTitle(item.movieId)
  pricingShowtimeId.value = item.id
}

function openBooking(item: AdminShowtime): void {
  if (
    !canManage.value ||
    item.status !== 'SCHEDULED' ||
    pricingShowtimeId.value ||
    openingShowtimeId.value
  )
    return

  openingMovieTitle.value = movieTitle(item.movieId)
  openingShowtimeId.value = item.id
}

async function afterShowtimeChanged(): Promise<void> {
  if (canManage.value && validDate.value) await showtimes.refetch()
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
        :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIME_CREATE, query: validDate ? { date } : {} }"
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
        <AdminShowtimeMovieSelect
          v-model="movieFilterId"
          id="showtime-movie-filter"
          :options="movies.data.value ?? []"
          :required="false"
          allow-all
          :loading="movies.isFetching.value"
        />
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
      </section>

      <div
        class="admin-showtimes__statuses"
        role="group"
        aria-label="Lọc theo trạng thái suất chiếu"
        :aria-busy="showtimes.isFetching.value"
      >
        <button
          v-for="summary in statusSummaries"
          :key="summary.value"
          type="button"
          class="admin-showtimes__status-filter"
          :aria-pressed="status === summary.value"
          :disabled="!validDate || showtimes.isFetching.value"
          @click="status = summary.value"
        >
          <span>{{ summary.label }}</span
          ><strong>{{
            showtimes.isFetching.value || (showtimes.isError.value && !rows.length)
              ? '—'
              : summary.count
          }}</strong>
        </button>
      </div>

      <p v-if="showtimes.isError.value" class="admin-showtimes__error" role="alert">
        {{ showtimeErrorMessage(showtimes.error.value) }}
        <template v-if="rows.length"> Đang hiển thị dữ liệu từ lần tải trước. </template>
      </p>

      <div
        v-if="activeFilters.length"
        class="admin-showtimes__filter-summary"
        aria-label="Bộ lọc đang áp dụng"
      >
        <span class="admin-reference__muted" role="status"
          >{{ filteredRows.length }} / {{ rows.length }} suất</span
        >
        <button
          v-for="filter in activeFilters"
          :key="filter.label"
          type="button"
          class="admin-showtimes__filter-chip"
          :aria-label="`Bỏ bộ lọc ${filter.label}`"
          @click="filter.clear"
        >
          {{ filter.label }} <span aria-hidden="true">×</span>
        </button>
        <AppButton variant="ghost" size="sm" @click="clearFilters">Xóa bộ lọc</AppButton>
      </div>

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
                <th scope="col">Định dạng / phiên bản</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in pageRows" :key="item.id">
                <th scope="row">
                  <div>
                    <time :datetime="item.startsAt">
                      {{ formatCinemaTime(item.startsAt) }}
                    </time>
                    –
                    <time :datetime="item.endsAt">
                      {{ formatCinemaTime(item.endsAt) }}
                    </time>
                  </div>
                  <div
                    v-if="getCinemaDateKey(item.endsAt) !== getCinemaDateKey(item.startsAt)"
                    class="admin-reference__muted"
                  >
                    Kết thúc ngày {{ formatCinemaDateKey(getCinemaDateKey(item.endsAt)) }}
                  </div>
                  <div v-if="item.scheduling" class="admin-reference__muted">
                    Nghỉ {{ item.scheduling.breakMinutes }} phút
                  </div>
                  <div v-if="item.scheduling" class="admin-showtimes__ready-time">
                    Phòng sẵn sàng
                    <time :datetime="item.scheduling.readyAt">{{
                      formatCinemaTime(item.scheduling.readyAt)
                    }}</time>
                    <span
                      v-if="
                        getCinemaDateKey(item.scheduling.readyAt) !==
                        getCinemaDateKey(item.startsAt)
                      "
                    >
                      · {{ formatCinemaDateKey(getCinemaDateKey(item.scheduling.readyAt)) }}</span
                    >
                  </div>
                </th>
                <td>{{ movieTitle(item.movieId) }}</td>
                <td>
                  <div>{{ item.cinemaName }}</div>
                  <div>{{ item.roomName }}</div>
                </td>
                <td>
                  <template v-if="item.screeningVersion">
                    <div>
                      {{
                        showtimeProjectionTechnologyLabels[
                          item.screeningVersion.projectionTechnology
                        ]
                      }}
                      · {{ item.screeningVersion.contentFormat }} ·
                      {{ showtimePresentationLabels[item.screeningVersion.presentationType] }}
                    </div>
                    <div class="admin-reference__muted">
                      Âm thanh: {{ item.screeningVersion.audioLanguage }}
                    </div>
                    <div
                      v-if="item.screeningVersion.subtitleLanguage"
                      class="admin-reference__muted"
                    >
                      Ngôn ngữ phụ đề: {{ item.screeningVersion.subtitleLanguage }}
                    </div>
                  </template>
                  <span v-else class="admin-reference__muted"> Chưa có thông tin phiên bản </span>
                </td>
                <td>
                  <span class="admin-status" :data-status="item.status">
                    {{ showtimeStatusLabels[item.status] }}
                  </span>
                </td>
                <td>
                  <div v-if="item.status === 'SCHEDULED'" class="admin-showtimes__actions">
                    <AppButton
                      v-if="canEditPricing"
                      type="button"
                      variant="secondary"
                      :disabled="refreshing"
                      :aria-label="`Chọn bảng giá cho ${movieTitle(item.movieId)} lúc ${formatCinemaTime(item.startsAt)}`"
                      @click="openPricing(item)"
                    >
                      Bảng giá
                    </AppButton>
                    <AppButton
                      type="button"
                      :disabled="refreshing"
                      :aria-label="`Mở bán ${movieTitle(item.movieId)} lúc ${formatCinemaTime(item.startsAt)}`"
                      :aria-describedby="`showtime-action-hint-${item.id}`"
                      @click="openBooking(item)"
                    >
                      Mở bán
                    </AppButton>
                  </div>
                  <p :id="`showtime-action-hint-${item.id}`" class="admin-showtimes__action-hint">
                    {{ actionHint(item) }}
                  </p>
                </td>
              </tr>

              <tr v-if="pageRows.length === 0">
                <td colspan="6" class="admin-reference__empty">
                  {{
                    !validDate
                      ? 'Chọn ngày hợp lệ.'
                      : showtimes.isFetching.value
                        ? 'Đang tải lịch chiếu…'
                        : showtimes.isError.value
                          ? 'Chưa thể tải lịch chiếu. Chọn “Tải lại” để thử lại.'
                          : rows.length
                            ? 'Không có suất chiếu khớp bộ lọc đang chọn.'
                            : 'Chưa có suất chiếu trong ngày này.'
                  }}
                  <div
                    v-if="
                      validDate &&
                      !showtimes.isFetching.value &&
                      !showtimes.isError.value &&
                      rows.length &&
                      activeFilters.length
                    "
                  >
                    <AppButton variant="ghost" size="sm" @click="clearFilters"
                      >Xóa bộ lọc để xem tất cả suất trong ngày</AppButton
                    >
                  </div>
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

      <AdminShowtimePricingDialog
        v-if="pricingShowtimeId"
        :key="pricingShowtimeId"
        :showtime-id="pricingShowtimeId"
        :movie-title="pricingMovieTitle"
        :can-manage="canEditPricing"
        @saved="afterShowtimeChanged"
        @close="pricingShowtimeId = ''"
      />
      <AdminShowtimeOpenDialog
        v-if="openingShowtimeId"
        :key="openingShowtimeId"
        :showtime-id="openingShowtimeId"
        :movie-title="openingMovieTitle"
        :can-manage="canManage"
        @opened="afterShowtimeChanged"
        @close="openingShowtimeId = ''"
      />
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-showtimes']
  :is(.admin-showtimes__action-hint, .admin-showtimes__ready-time) {
  margin: var(--space-2) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
}

[data-reference='admin-showtimes'] .admin-showtimes__ready-time time {
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

[data-reference='admin-showtimes'] .admin-showtimes__statuses {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

[data-reference='admin-showtimes'] .admin-showtimes__status-filter {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

[data-reference='admin-showtimes'] .admin-showtimes__status-filter strong {
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

[data-reference='admin-showtimes']
  .admin-showtimes__status-filter:is(:hover, [aria-pressed='true']) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

[data-reference='admin-showtimes'] .admin-showtimes__status-filter[aria-pressed='true'] {
  background: var(--admin-reference-active-background);
  font-weight: var(--font-weight-semibold);
}

[data-reference='admin-showtimes'] .admin-showtimes__status-filter:disabled {
  opacity: var(--opacity-disabled);
  cursor: default;
}

[data-reference='admin-showtimes'] .admin-showtimes__filter-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

[data-reference='admin-showtimes'] .admin-showtimes__filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  overflow-wrap: anywhere;
  text-align: left;
  cursor: pointer;
}

[data-reference='admin-showtimes'] .admin-showtimes__filter-chip:hover {
  border-color: var(--color-primary);
}

[data-reference='admin-showtimes'] .admin-showtimes__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

[data-reference='admin-showtimes'] .admin-showtimes__error {
  color: var(--color-error);
}

[data-reference='admin-showtimes'] :is(input, select, button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
