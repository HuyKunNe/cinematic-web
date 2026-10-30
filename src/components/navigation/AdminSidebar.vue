<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ADMIN_NAVIGATION_GROUPS,
  getVisibleAdminNavigation,
  type AdminRouteName,
} from '../../config/admin-navigation'
import { APP_ROLES } from '../../config/authorization'
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

const accountLabel = computed(() => {
  if (auth.hasRole(APP_ROLES.ADMIN)) return 'Quản trị viên'
  if (auth.hasRole(APP_ROLES.STAFF)) return 'Nhân viên'
  return 'Tài khoản'
})

const accountCaption = computed(() => auth.username || accountLabel.value)

/*
 * SVG paths from:
 * docs/design/reference/cinema-admin/assets/js/app.js
 *
 * The shared navigation icon tokens remain compatible with the dashboard.
 * Sidebar icons follow the reference for each destination.
 */
const iconPaths: Record<AdminRouteName, string> = {
  [ROUTE_NAMES.ADMIN]: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  [ROUTE_NAMES.ADMIN_MOVIES]:
    'M4 3h16v18H4z M8 3v18 M16 3v18 M4 7h4 M4 12h4 M4 17h4 M16 7h4 M16 12h4 M16 17h4',
  [ROUTE_NAMES.ADMIN_CINEMAS]:
    'M3 21h18 M5 21V6l7-3 7 3v15 M9 8h1 M14 8h1 M9 12h1 M14 12h1 M10 21v-5h4v5',
  [ROUTE_NAMES.ADMIN_ROOMS]:
    'M6 13V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8 M4 11v7h16v-7 M3 11h4v6 M17 17v-6h4 M6 18v3 M18 18v3',
  [ROUTE_NAMES.ADMIN_SHOWTIMES]: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',
  [ROUTE_NAMES.ADMIN_PRICING_POLICY]:
    'M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 7v3 M15 13v2 M15 18v1',
  [ROUTE_NAMES.ADMIN_BOOKINGS]: 'M2 3h3l3 13h11l3-9H6 M9 21h.01 M18 21h.01',
  [ROUTE_NAMES.ADMIN_PROMOTIONS]: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
  [ROUTE_NAMES.ADMIN_USERS]:
    'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 3a4 4 0 0 1 0 7 M22 21v-3a4 4 0 0 0-3-4',
}

function isActive(routeName: AdminRouteName): boolean {
  if (
    routeName === ROUTE_NAMES.ADMIN_ROOMS &&
    (route.name === ROUTE_NAMES.ADMIN_ROOM_SEATS || route.name === ROUTE_NAMES.ADMIN_ROOM_LAYOUT)
  ) {
    return true
  }

  if (
    routeName === ROUTE_NAMES.ADMIN_SHOWTIMES &&
    route.name === ROUTE_NAMES.ADMIN_SHOWTIME_CREATE
  ) {
    return true
  }

  if (routeName === ROUTE_NAMES.ADMIN_BOOKINGS && route.name === ROUTE_NAMES.ADMIN_BOOKING_DETAIL) {
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
          <strong>Cinematic</strong>
          <span>QUẢN TRỊ RẠP CHIẾU</span>
        </span>
      </RouterLink>

      <slot name="header-action" />
    </div>

    <nav class="admin-sidebar__nav" aria-label="Điều hướng quản trị">
      <div v-for="group in groups" :key="group.id" class="admin-sidebar__group">
        <p class="admin-sidebar__group-label" :aria-hidden="collapsed">
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
          <svg class="admin-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path :d="iconPaths[item.routeName]" />
          </svg>
          <span class="admin-sidebar__label">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <footer class="admin-sidebar__footer" :aria-hidden="collapsed">
      <div class="admin-sidebar__identity">
        <p class="admin-sidebar__access">Không gian quản trị</p>
        <p class="admin-sidebar__account" :title="accountCaption">
          {{ accountCaption }}
        </p>
      </div>
    </footer>
  </div>
</template>
