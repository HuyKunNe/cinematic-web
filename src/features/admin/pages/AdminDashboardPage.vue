<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUpRight, Building2, CalendarDays, Clapperboard, Film } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import { ADMIN_NAVIGATION_GROUPS, getVisibleAdminNavigation } from '@/config/admin-navigation'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError } from '@/services/http/api-error'
import { useAdminDashboardQueries } from '../api/admin-dashboard-queries'

const auth = useAuthStore()
const dashboard = useAdminDashboardQueries()

const modules = computed(() =>
  getVisibleAdminNavigation(auth).filter((item) => item.routeName !== ROUTE_NAMES.ADMIN),
)

const metricDefinitions = [
  {
    id: 'total-movies',
    label: 'Tổng phim',
    hint: 'Bao gồm tất cả trạng thái',
    icon: Film,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
    query: dashboard.totalMovies,
  },
  {
    id: 'now-showing',
    label: 'Đang chiếu',
    hint: 'Phim có trạng thái đang chiếu',
    icon: Clapperboard,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
    query: dashboard.nowShowingMovies,
  },
  {
    id: 'upcoming',
    label: 'Sắp chiếu',
    hint: 'Phim có trạng thái sắp chiếu',
    icon: CalendarDays,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
    query: dashboard.upcomingMovies,
  },
  {
    id: 'active-cinemas',
    label: 'Rạp hoạt động',
    hint: 'Chỉ bao gồm rạp đang hoạt động',
    icon: Building2,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
    query: dashboard.activeCinemas,
  },
]

const metrics = computed(() =>
  metricDefinitions
    .filter((metric) => modules.value.some((item) => item.permission === metric.permission))
    .map((metric) => ({
      ...metric,
      value: metric.query.data.value,
      loading: metric.query.isFetching.value,
      failed: metric.query.isError.value,
      error: metric.query.error.value,
    })),
)

const canViewMovieMetrics = computed(() =>
  modules.value.some((item) => item.permission === APP_PERMISSIONS.MOVIE_MANAGE),
)

const movieSummaryQueries = [
  dashboard.totalMovies,
  dashboard.nowShowingMovies,
  dashboard.upcomingMovies,
]

const movieSummaryLoading = computed(() =>
  movieSummaryQueries.some((query) => query.isFetching.value),
)

const movieSummaryError = computed(() => {
  const error =
    dashboard.totalMovies.error.value ??
    dashboard.nowShowingMovies.error.value ??
    dashboard.upcomingMovies.error.value

  return error ? errorMessage(error) : null
})

const movieComposition = computed(() => {
  const total = dashboard.totalMovies.data.value
  const nowShowing = dashboard.nowShowingMovies.data.value
  const upcoming = dashboard.upcomingMovies.data.value

  if (total == null || nowShowing == null || upcoming == null) return null
  if (nowShowing + upcoming > total) return null

  const other = total - nowShowing - upcoming
  const percent = (value: number) => (total === 0 ? 0 : (value / total) * 100)

  const nowShowingEnd = percent(nowShowing)
  const upcomingEnd = nowShowingEnd + percent(upcoming)

  const background =
    total === 0
      ? 'conic-gradient(var(--color-surface-raised) 0% 100%)'
      : `conic-gradient(
          var(--color-primary) 0% ${nowShowingEnd}%,
          var(--color-success) ${nowShowingEnd}% ${upcomingEnd}%,
          var(--color-text-muted) ${upcomingEnd}% 100%
        )`

  return {
    total,
    nowShowing,
    upcoming,
    other,
    background,
  }
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

function formatCount(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value)
}

function errorMessage(error: ApiError | null) {
  if (error?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn.'
  }

  if (error?.status === 403) {
    return 'Không đủ quyền tải dữ liệu.'
  }

  if (error?.status === null) {
    return 'Không thể kết nối dịch vụ.'
  }

  return error?.message || 'Không thể tải số liệu.'
}

function groupLabel(group: string) {
  return ADMIN_NAVIGATION_GROUPS.find((item) => item.id === group)?.label ?? ''
}
</script>

<template>
  <section class="admin-dashboard" aria-labelledby="admin-dashboard-title">
    <header class="admin-page-heading">
      <div class="admin-page-heading__copy">
        <p class="admin-page-heading__eyebrow">CINEMATIC ADMIN</p>
        <h1 id="admin-dashboard-title">Tổng quan</h1>
        <p class="admin-page-heading__description">
          Theo dõi dữ liệu hiện tại và truy cập các chức năng quản trị.
        </p>
      </div>

      <AppButton
        v-if="metrics.length"
        variant="secondary"
        :loading="dashboard.isRefreshing.value"
        @click="dashboard.refresh()"
      >
        Cập nhật số liệu
      </AppButton>
    </header>

    <div v-if="metrics.length" class="admin-dashboard__metrics" aria-label="Số liệu tổng quan">
      <article
        v-for="metric in metrics"
        :key="metric.id"
        class="admin-metric"
        :aria-busy="metric.loading"
        :aria-labelledby="`${metric.id}-label`"
      >
        <div class="admin-metric__heading">
          <h2 :id="`${metric.id}-label`">{{ metric.label }}</h2>
          <component :is="metric.icon" aria-hidden="true" />
        </div>

        <p class="admin-metric__value">{{ formatCount(metric.value) }}</p>
        <p class="admin-metric__hint">{{ metric.hint }}</p>

        <p v-if="metric.loading" class="admin-metric__state" role="status">Đang cập nhật…</p>

        <template v-else-if="metric.failed">
          <p class="admin-metric__error" role="alert">
            {{ errorMessage(metric.error) }}
          </p>

          <p v-if="metric.value != null" class="admin-metric__state">
            Đang hiển thị số liệu từ lần tải trước.
          </p>

          <AppButton variant="ghost" size="sm" @click="metric.query.refetch()"> Thử lại </AppButton>
        </template>

        <p v-else-if="metric.value == null" class="admin-metric__state">Chưa nhận được số liệu.</p>
      </article>
    </div>

    <div class="admin-dashboard__overview">
      <article
        v-if="canViewMovieMetrics"
        class="admin-dashboard__panel"
        aria-labelledby="admin-movie-summary-title"
        :aria-busy="movieSummaryLoading"
      >
        <header class="admin-dashboard__section-heading">
          <div>
            <h2 id="admin-movie-summary-title">Cơ cấu phim</h2>
            <p>Phân bố theo trạng thái hiện tại</p>
          </div>
        </header>

        <div v-if="movieComposition" class="admin-dashboard__movie-summary">
          <div
            class="admin-dashboard__movie-donut"
            role="img"
            :style="{ background: movieComposition.background }"
            :aria-label="`Tổng ${formatCount(movieComposition.total)} phim`"
          >
            <div class="admin-dashboard__movie-donut-center">
              <span>Tổng phim</span>
              <strong>{{ formatCount(movieComposition.total) }}</strong>
            </div>
          </div>

          <ul class="admin-dashboard__movie-legend">
            <li>
              <span class="admin-dashboard__movie-dot is-now-showing" aria-hidden="true" />
              <span>Đang chiếu</span>
              <strong>{{ formatCount(movieComposition.nowShowing) }}</strong>
            </li>
            <li>
              <span class="admin-dashboard__movie-dot is-upcoming" aria-hidden="true" />
              <span>Sắp chiếu</span>
              <strong>{{ formatCount(movieComposition.upcoming) }}</strong>
            </li>
            <li>
              <span class="admin-dashboard__movie-dot is-other" aria-hidden="true" />
              <span>Trạng thái khác</span>
              <strong>{{ formatCount(movieComposition.other) }}</strong>
            </li>
          </ul>
        </div>

        <p v-else-if="movieSummaryLoading" class="admin-dashboard__empty-message" role="status">
          Đang tải dữ liệu phim…
        </p>

        <p v-else-if="movieSummaryError" class="admin-dashboard__empty-message" role="alert">
          {{ movieSummaryError }}
        </p>

        <p v-else class="admin-dashboard__empty-message">
          Chưa đủ dữ liệu để tổng hợp trạng thái phim.
        </p>
      </article>

      <section class="admin-dashboard__panel" aria-labelledby="admin-quick-links-title">
        <header class="admin-dashboard__section-heading">
          <div>
            <h2 id="admin-quick-links-title">Truy cập nhanh</h2>
            <p>{{ modules.length }} chức năng được cấp quyền</p>
          </div>
        </header>

        <nav
          v-if="modules.length"
          class="admin-dashboard__quick-links"
          aria-label="Chức năng quản trị"
        >
          <RouterLink
            v-for="item in modules"
            :key="item.routeName"
            class="admin-dashboard__quick-link"
            :to="{ name: item.routeName }"
          >
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ groupLabel(item.group) }}</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </RouterLink>
        </nav>

        <div v-else class="admin-dashboard__empty-message" role="status">
          <h3>Chưa có chức năng được cấp quyền</h3>
          <p>Tài khoản này chưa được cấp quyền truy cập các chức năng quản trị.</p>
          <RouterLink :to="{ name: ROUTE_NAMES.HOME }">Về trang khách hàng</RouterLink>
        </div>
      </section>
    </div>
  </section>
</template>
