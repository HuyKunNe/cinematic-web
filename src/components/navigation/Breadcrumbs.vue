<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ROUTE_NAMES } from '../../router/route-constants'

const route = useRoute()
const isAdminHome = computed(() => route.name === ROUTE_NAMES.ADMIN)

const labels: Record<string, string> = {
  [ROUTE_NAMES.ADMIN_MOVIES]: 'Phim',
  [ROUTE_NAMES.ADMIN_CINEMAS]: 'Rạp chiếu',
  [ROUTE_NAMES.ADMIN_ROOMS]: 'Phòng chiếu',
  [ROUTE_NAMES.ADMIN_SHOWTIMES]: 'Suất chiếu',
  [ROUTE_NAMES.ADMIN_SHOWTIME_CREATE]: 'Tạo mới',
  [ROUTE_NAMES.ADMIN_BOOKINGS]: 'Đặt vé',
  [ROUTE_NAMES.ADMIN_PROMOTIONS]: 'Khuyến mãi',
  [ROUTE_NAMES.ADMIN_USERS]: 'Người dùng',
}

const currentTitle = computed(
  () =>
    labels[String(route.name)] ??
    (typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị'),
)

const parents = computed(() => {
  if (route.name === ROUTE_NAMES.ADMIN_ROOMS) {
    return [{ label: 'Rạp chiếu', name: ROUTE_NAMES.ADMIN_CINEMAS }]
  }

  if (route.name === ROUTE_NAMES.ADMIN_SHOWTIME_CREATE) {
    return [{ label: 'Suất chiếu', name: ROUTE_NAMES.ADMIN_SHOWTIMES }]
  }

  return []
})
</script>

<template>
  <nav class="admin-breadcrumbs" aria-label="Breadcrumb">
    <ol class="admin-breadcrumbs__list">
      <li v-if="!isAdminHome" class="admin-breadcrumbs__item">
        <RouterLink :to="{ name: ROUTE_NAMES.ADMIN }">Quản trị</RouterLink>
      </li>
      <li v-for="parent in parents" :key="parent.name" class="admin-breadcrumbs__item">
        <RouterLink :to="{ name: parent.name }">{{ parent.label }}</RouterLink>
      </li>
      <li class="admin-breadcrumbs__item admin-breadcrumbs__item--current">
        <span aria-current="page">{{ isAdminHome ? 'Tổng quan' : currentTitle }}</span>
      </li>
    </ol>
  </nav>
</template>
