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

        <p class="admin-metric__value">
          {{ formatCount(metric.value) }}
        </p>

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

    <section class="admin-dashboard__modules" aria-labelledby="admin-modules-title">
      <div class="admin-dashboard__section-heading">
        <h2 id="admin-modules-title">Chức năng quản trị</h2>
        <p>{{ modules.length }} chức năng được cấp quyền</p>
      </div>

      <div v-if="modules.length" class="admin-dashboard__module-grid">
        <RouterLink
          v-for="item in modules"
          :key="item.routeName"
          class="admin-module-card"
          :to="{ name: item.routeName }"
        >
          <div class="admin-module-card__heading">
            <span class="admin-module-card__group">
              {{ groupLabel(item.group) }}
            </span>
            <ArrowUpRight aria-hidden="true" />
          </div>

          <h3>{{ item.label }}</h3>
          <p>{{ item.description }}</p>

          <span class="admin-module-card__action"> Đi đến {{ item.label }} </span>
        </RouterLink>
      </div>

      <div v-else class="admin-dashboard__empty" role="status">
        <h3>Chưa có chức năng được cấp quyền</h3>
        <p>
          Tài khoản có thể truy cập trang quản trị nhưng chưa được cấp quyền cho các chức năng bên
          trong.
        </p>

        <RouterLink :to="{ name: ROUTE_NAMES.HOME }"> Về trang khách hàng </RouterLink>
      </div>
    </section>
  </section>
</template>
