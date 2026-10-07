<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useIntervalFn, useNow } from '@vueuse/core'
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  DoorOpen,
  Film,
  RefreshCw,
  Users,
} from 'lucide-vue-next'
import { getVisibleAdminNavigation, type AdminNavigationIcon } from '@/config/admin-navigation'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError } from '@/services/http/api-error'
import { useAdminDashboardQueries } from '../api/admin-dashboard-queries'

const auth = useAuthStore()
const now = useNow({
  scheduler: (update) => useIntervalFn(update, 30_000),
})
const numberFormatter = new Intl.NumberFormat('vi-VN')

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function vietnamDay(date: Date) {
  const parts = dayFormatter.formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const today = computed(() => vietnamDay(now.value))
const selectedDate = ref(vietnamDay(now.value))
const draftCinemaId = ref('')
const draftMovieId = ref('')
const appliedScope = ref({ cinemaId: '', movieId: '' })
const dashboard = useAdminDashboardQueries(selectedDate, now, appliedScope)

const scopeSummary = computed(() => {
  const { cinemaId, movieId } = appliedScope.value
  const cinema = cinemaId
    ? dashboard.cinemaOptions.value.find((item) => item.value === cinemaId)?.label || 'Rạp đã chọn'
    : ''
  const movie = movieId
    ? dashboard.movieOptions.value.find((item) => item.value === movieId)?.label || 'Phim đã chọn'
    : ''

  return [movie, cinema].filter(Boolean).join(' · ') || 'Toàn hệ thống'
})

const hasDraftChanges = computed(
  () =>
    draftCinemaId.value !== appliedScope.value.cinemaId ||
    draftMovieId.value !== appliedScope.value.movieId,
)

function applyScope() {
  appliedScope.value = {
    cinemaId: draftCinemaId.value,
    movieId: draftMovieId.value,
  }
}

function resetScope() {
  draftCinemaId.value = ''
  draftMovieId.value = ''
  appliedScope.value = { cinemaId: '', movieId: '' }
}

const modules = computed(() =>
  getVisibleAdminNavigation(auth).filter((item) => item.routeName !== ROUTE_NAMES.ADMIN),
)

const icons: Partial<Record<AdminNavigationIcon, typeof Film>> = {
  movies: Film,
  cinemas: Building2,
  rooms: DoorOpen,
  showtimes: CalendarClock,
  users: Users,
}

const metricDefinitions = [
  {
    id: 'total-movies',
    label: 'Tổng phim',
    hint: 'Toàn hệ thống · tất cả trạng thái',
    tone: 'primary',
    icon: Film,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
    query: dashboard.totalMovies,
  },
  {
    id: 'now-showing',
    label: 'Đang chiếu',
    hint: 'Toàn hệ thống · trạng thái hiện tại',
    tone: 'success',
    icon: Clapperboard,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
    query: dashboard.nowShowingMovies,
  },
  {
    id: 'showtimes',
    label: 'Suất chiếu trong ngày',
    hint: 'Toàn bộ trạng thái',
    tone: 'warning',
    icon: CalendarClock,
    permission: APP_PERMISSIONS.SHOWTIME_MANAGE,
    query: dashboard.showtimes,
  },
  {
    id: 'active-cinemas',
    label: 'Rạp hoạt động',
    hint: 'Toàn hệ thống · đang vận hành',
    tone: 'neutral',
    icon: Building2,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
    query: dashboard.activeCinemas,
  },
]

const metrics = computed(() =>
  metricDefinitions
    .filter((metric) => modules.value.some((item) => item.permission === metric.permission))
    .map((metric) => {
      const data = metric.query.data.value

      return {
        ...metric,
        label:
          metric.id === 'showtimes' && selectedDate.value === today.value
            ? 'Suất chiếu hôm nay'
            : metric.label,
        hint: metric.id === 'showtimes' ? `${scopeSummary.value} · tất cả trạng thái` : metric.hint,
        value:
          metric.id === 'showtimes'
            ? data == null
              ? null
              : dashboard.scopedShowtimes.value.length
            : Array.isArray(data)
              ? data.length
              : data,
        loading: metric.query.isFetching.value,
        error: metric.query.isError.value ? errorMessage(metric.query.error.value) : null,
      }
    }),
)

const upcoming = dashboard.upcomingShowtimes
const showtimes = dashboard.showtimes

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Đã lên lịch',
  OPEN_FOR_BOOKING: 'Đang mở bán',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
}

function statusTone(status?: string) {
  if (status === 'OPEN_FOR_BOOKING') return 'success'
  if (status === 'SCHEDULED') return 'warning'
  if (status === 'CANCELLED') return 'error'
  return 'neutral'
}

function formatCount(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value)
}

function errorMessage(error: ApiError | null) {
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn.'
  if (error?.status === 403) return 'Không đủ quyền tải dữ liệu.'
  if (error?.status === null) return 'Không thể kết nối dịch vụ.'
  return error?.message || 'Không thể tải dữ liệu.'
}

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function formatTime(value?: string) {
  const time = Date.parse(value ?? '')
  return Number.isFinite(time) ? timeFormatter.format(time) : '—'
}

function changeDate(event: Event) {
  const value = (event.target as HTMLInputElement).value
  selectedDate.value = value || today.value
}
</script>

<template>
  <section class="admin-dashboard" aria-labelledby="admin-dashboard-title">
    <header class="admin-dashboard__heading">
      <div>
        <p class="admin-dashboard__eyebrow">CINEMATIC ADMIN</p>
        <h1 id="admin-dashboard-title">Tổng quan</h1>
        <p class="admin-dashboard__subtitle">Theo dõi hoạt động quản trị trong ngày.</p>
      </div>

      <div class="admin-dashboard__controls">
        <label class="admin-dashboard__date">
          <CalendarDays aria-hidden="true" />
          <span class="admin-visually-hidden">Ngày xem lịch chiếu</span>
          <input type="date" :value="selectedDate" @change="changeDate" />
        </label>

        <button
          v-if="metrics.length"
          class="admin-dashboard__refresh"
          type="button"
          aria-label="Cập nhật số liệu"
          title="Cập nhật số liệu"
          :disabled="dashboard.isRefreshing.value"
          @click="dashboard.refresh()"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </div>
    </header>
    <form
      v-if="dashboard.canManageShowtimes.value"
      class="admin-dashboard__scope"
      aria-label="Lọc dữ liệu dashboard"
      @submit.prevent="applyScope"
      @reset.prevent="resetScope"
    >
      <label class="admin-dashboard__scope-field" for="dashboard-cinema">
        <span>Rạp</span>
        <select
          id="dashboard-cinema"
          v-model="draftCinemaId"
          :disabled="
            dashboard.activeCinemas.isPending.value || dashboard.activeCinemas.isError.value
          "
        >
          <option value="">
            {{ dashboard.activeCinemas.isPending.value ? 'Đang tải rạp…' : 'Tất cả rạp' }}
          </option>
          <option
            v-for="item in dashboard.cinemaOptions.value"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="admin-dashboard__scope-field" for="dashboard-movie">
        <span>Phim</span>
        <select
          id="dashboard-movie"
          v-model="draftMovieId"
          :disabled="dashboard.movieCatalog.isPending.value || dashboard.movieCatalog.isError.value"
        >
          <option value="">
            {{ dashboard.movieCatalog.isPending.value ? 'Đang tải phim…' : 'Tất cả phim' }}
          </option>
          <option
            v-for="item in dashboard.movieOptions.value"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
      </label>

      <button class="admin-dashboard__scope-button" type="reset">Xóa lọc</button>
      <button
        class="admin-dashboard__scope-button is-primary"
        type="submit"
        :disabled="!hasDraftChanges"
      >
        Áp dụng
      </button>

      <p class="admin-dashboard__scope-description" aria-live="polite">
        Phạm vi đã áp dụng: {{ scopeSummary }}
        <span v-if="hasDraftChanges"> · Có thay đổi chưa áp dụng</span>
      </p>
      <p class="admin-dashboard__scope-description">
        Bộ lọc áp dụng cho lịch chiếu. Chỉ số phim/rạp hiển thị toàn hệ thống. Danh sách chọn gồm
        rạp đang hoạt động.
      </p>

      <div
        v-if="dashboard.activeCinemas.isError.value"
        class="admin-dashboard__scope-error"
        role="alert"
      >
        <p>Danh sách rạp: {{ errorMessage(dashboard.activeCinemas.error.value) }}</p>
        <button
          class="admin-dashboard__text-button"
          type="button"
          :disabled="dashboard.activeCinemas.isFetching.value"
          @click="dashboard.activeCinemas.refetch()"
        >
          Thử lại
        </button>
      </div>

      <div
        v-if="dashboard.movieCatalog.isError.value"
        class="admin-dashboard__scope-error"
        role="alert"
      >
        <p>Danh sách phim: {{ errorMessage(dashboard.movieCatalog.error.value) }}</p>
        <button
          class="admin-dashboard__text-button"
          type="button"
          :disabled="dashboard.movieCatalog.isFetching.value"
          @click="dashboard.movieCatalog.refetch()"
        >
          Thử lại
        </button>
      </div>
    </form>
    <div v-if="metrics.length" class="admin-dashboard__metrics" aria-label="Số liệu tổng quan">
      <article
        v-for="metric in metrics"
        :key="metric.id"
        class="admin-dashboard__metric"
        :class="`is-${metric.tone}`"
        :aria-busy="metric.loading"
        :aria-labelledby="`${metric.id}-label`"
      >
        <span class="admin-dashboard__metric-icon" aria-hidden="true">
          <component :is="metric.icon" />
        </span>

        <div class="admin-dashboard__metric-copy">
          <h2 :id="`${metric.id}-label`">{{ metric.label }}</h2>
          <strong>{{ formatCount(metric.value) }}</strong>
          <p>{{ metric.hint }}</p>

          <p v-if="metric.loading" role="status">Đang cập nhật…</p>
          <template v-else-if="metric.error">
            <p class="admin-dashboard__error" role="alert">{{ metric.error }}</p>
            <button
              class="admin-dashboard__text-button"
              type="button"
              @click="metric.query.refetch()"
            >
              Thử lại
            </button>
          </template>
        </div>
      </article>
    </div>

    <div class="admin-dashboard__analytics">
      <article class="admin-dashboard__panel admin-dashboard__revenue">
        <header class="admin-dashboard__panel-heading">
          <div>
            <h2>Doanh thu &amp; lượt đặt vé</h2>
            <p>Thống kê doanh thu và hoạt động đặt vé</p>
          </div>
          <label class="admin-dashboard__period">
            <span class="admin-visually-hidden">Kỳ thống kê</span>
            <select
              class="admin-dashboard__panel-select"
              disabled
              aria-describedby="dashboard-revenue-message"
            >
              <option value="today">
                {{ selectedDate === today ? 'Hôm nay' : 'Ngày đã chọn' }}
              </option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
            </select>
          </label>
        </header>

        <div class="admin-dashboard__legend" aria-hidden="true">
          <span><i class="is-primary" />Doanh thu</span>
          <span><i class="is-success" />Lượt đặt vé</span>
        </div>

        <div class="admin-dashboard__chart-empty">
          <BarChart3 aria-hidden="true" />
          <strong>Chưa có số liệu</strong>
          <p id="dashboard-revenue-message">Số liệu doanh thu và lượt đặt vé chưa khả dụng.</p>
        </div>
      </article>

      <article class="admin-dashboard__panel">
        <header class="admin-dashboard__panel-heading">
          <div>
            <h2>Trạng thái booking</h2>
            <p>Tỷ lệ theo trạng thái</p>
          </div>
        </header>

        <div class="admin-dashboard__booking-empty">
          <div class="admin-dashboard__donut" aria-hidden="true">
            <div>
              <span>Tổng booking</span>
              <strong>—</strong>
            </div>
          </div>
          <p>Chưa có dữ liệu booking toàn hệ thống.</p>
        </div>
      </article>

      <article class="admin-dashboard__panel">
        <header class="admin-dashboard__panel-heading">
          <div>
            <h2>Chức năng quản trị</h2>
            <p>Lối tắt đến các khu vực</p>
          </div>
        </header>

        <nav
          v-if="modules.length"
          class="admin-dashboard__quick-links"
          aria-label="Lối tắt quản trị"
        >
          <RouterLink v-for="item in modules" :key="item.routeName" :to="{ name: item.routeName }">
            <component :is="icons[item.icon]" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <ChevronRight aria-hidden="true" />
          </RouterLink>
        </nav>

        <p v-else class="admin-dashboard__message">
          Tài khoản chưa được cấp quyền truy cập các chức năng quản trị.
        </p>
      </article>
    </div>

    <div class="admin-dashboard__data">
      <article
        v-if="dashboard.canManageShowtimes.value"
        class="admin-dashboard__panel"
        :aria-busy="showtimes.isFetching.value"
      >
        <header class="admin-dashboard__panel-heading">
          <div>
            <h2>Suất chiếu sắp tới</h2>
            <p>Các suất chiếu còn lại trong ngày · {{ scopeSummary }}</p><p>Các suất chiếu còn lại trong ngày đã chọn</p>
          </div>
          <RouterLink
            class="admin-dashboard__text-link"
            :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
          >
            Xem tất cả <ChevronRight aria-hidden="true" />
          </RouterLink>
        </header>

        <p v-if="showtimes.isFetching.value" class="admin-dashboard__message" role="status">
          Đang cập nhật lịch chiếu…
        </p>

        <div v-if="showtimes.isError.value" class="admin-dashboard__message" role="alert">
          <p>{{ errorMessage(showtimes.error.value) }}</p>
          <button class="admin-dashboard__text-button" type="button" @click="showtimes.refetch()">
            Thử lại
          </button>
        </div>

        <div
          class="admin-dashboard__table-scroll"
          role="region"
          aria-label="Suất chiếu sắp tới"
          tabindex="0"
        >
          <table>
            <caption class="admin-visually-hidden">
              Suất chiếu trong ngày đã chọn
            </caption>
            <thead>
              <tr>
                <th scope="col">Phim</th>
                <th scope="col">Rạp / Phòng</th>
                <th scope="col">Giờ chiếu</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in upcoming" :key="item.id">
                <td>
                  <span class="admin-dashboard__movie-cell">
                    <span class="admin-dashboard__thumb" aria-hidden="true"><Film /></span>
                    <span>
                      {{
                        dashboard.movieLabels.value.get(item.movieId ?? '') ??
                        'Chưa có thông tin phim'
                      }}
                    </span>
                  </span>
                </td>
                <td>{{ item.cinemaName || '—' }} / {{ item.roomName || '—' }}</td>
                <td>{{ formatTime(item.startsAt) }}</td>
                <td>
                  <span class="admin-dashboard__status" :class="`is-${statusTone(item.status)}`">
                    {{ statusLabels[item.status ?? ''] || 'Chưa xác định' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!upcoming.length">
                <td colspan="4" class="admin-dashboard__table-empty">
                  {{
                    showtimes.isFetching.value
                      ? 'Đang tải lịch chiếu…'
                      : showtimes.isError.value
                        ? 'Chưa tải được lịch chiếu.'
                        : 'Không có suất chiếu sắp tới trong ngày đã chọn.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="admin-dashboard__panel">
        <header class="admin-dashboard__panel-heading">
          <div>
            <h2>Booking gần đây</h2>
            <p>Hoạt động đặt vé mới nhất</p>
          </div>
        </header>

        <div
          class="admin-dashboard__table-scroll"
          role="region"
          aria-label="Booking gần đây"
          tabindex="0"
        >
          <table>
            <caption class="admin-visually-hidden">
              Booking gần đây trên toàn hệ thống
            </caption>
            <thead>
              <tr>
                <th scope="col">Mã booking</th>
                <th scope="col">Khách hàng</th>
                <th scope="col">Số vé</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="admin-dashboard__table-empty">
                  Chưa có dữ liệu booking toàn hệ thống.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
