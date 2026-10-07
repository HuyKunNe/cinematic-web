<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  DoorOpen,
  Film,
  LayoutDashboard,
  Tags,
  Ticket,
  Users,
} from 'lucide-vue-next'
import { ADMIN_NAVIGATION_GROUPS, getVisibleAdminNavigation } from '../../config/admin-navigation'
import type { AdminNavigationIcon } from '../../config/admin-navigation'
import { ROUTE_NAMES } from '../../router/route-constants'
import { useAuthStore } from '../../stores/auth.store'

withDefaults(
  defineProps<{
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

const emit = defineEmits<{
  navigate: []
}>()

const auth = useAuthStore()
const route = useRoute()

const visibleItems = computed(() => getVisibleAdminNavigation(auth))

const groups = computed(() =>
  ADMIN_NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: visibleItems.value.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0),
)

const moduleCount = computed(
  () => visibleItems.value.filter((item) => item.routeName !== ROUTE_NAMES.ADMIN).length,
)

const icons: Record<AdminNavigationIcon, typeof Film> = {
  overview: LayoutDashboard,
  movies: Film,
  cinemas: Building2,
  rooms: DoorOpen,
  showtimes: CalendarClock,
  bookings: Ticket,
  promotions: Tags,
  users: Users,
}

function isActive(routeName: string) {
  if (
    routeName === ROUTE_NAMES.ADMIN_SHOWTIMES &&
    route.name === ROUTE_NAMES.ADMIN_SHOWTIME_CREATE
  ) {
    return true
  }
  return route.name === routeName || route.matched.some((record) => record.name === routeName)
}
</script>

<template>
  <div class="admin-sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="admin-sidebar__top">
      <RouterLink
        class="admin-sidebar__brand"
        :to="{ name: ROUTE_NAMES.ADMIN }"
        aria-label="Cinematic — Tổng quan quản trị"
        @click="emit('navigate')"
      >
        <span class="admin-sidebar__brand-mark" aria-hidden="true">C</span>

        <span class="admin-sidebar__brand-copy">
          <strong>CINEMATIC</strong>
          <span>Quản trị</span>
        </span>
      </RouterLink>

      <slot name="header-action" />
    </div>

    <nav class="admin-sidebar__nav" aria-label="Điều hướng quản trị">
      <div v-for="group in groups" :key="group.id" class="admin-sidebar__group">
        <p class="admin-sidebar__group-label">
          {{ group.label }}
        </p>

        <RouterLink
          v-for="item in group.items"
          :key="item.routeName"
          class="admin-sidebar__link"
          :class="{ 'is-active': isActive(item.routeName) }"
          :to="{ name: item.routeName }"
          :aria-label="item.label"
          :aria-current="isActive(item.routeName) ? 'page' : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate')"
        >
          <component :is="icons[item.icon]" class="admin-sidebar__icon" aria-hidden="true" />
          <span class="admin-sidebar__label">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <footer class="admin-sidebar__footer">
      <p class="admin-sidebar__access" :aria-hidden="collapsed">
        <span class="admin-sidebar__status-dot" aria-hidden="true" />
        <span :title="`${moduleCount} chức năng được cấp quyền`"> Không gian quản trị </span>
      </p>

      <RouterLink
        class="admin-sidebar__link admin-sidebar__customer-link"
        :to="{ name: ROUTE_NAMES.HOME }"
        aria-label="Về trang khách hàng"
        :title="collapsed ? 'Về trang khách hàng' : undefined"
        @click="emit('navigate')"
      >
        <ArrowUpRight class="admin-sidebar__icon" aria-hidden="true" />
        <span class="admin-sidebar__label">Trang khách hàng</span>
      </RouterLink>
    </footer>
  </div>
</template>
