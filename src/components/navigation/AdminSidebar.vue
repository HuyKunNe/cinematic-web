<script setup lang="ts">
import { computed } from 'vue'
import { Building2, CalendarClock, DoorOpen, Film, Users, X } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { ADMIN_NAVIGATION } from '../../config/admin-navigation'
import type { AdminNavigationIcon } from '../../config/admin-navigation'
import { ROUTE_NAMES } from '../../router/route-constants'
defineProps<{
  collapsed: boolean
  mobile: boolean
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  toggleCollapsed: []
  closeMobile: []
}>()

const route = useRoute()
const auth = useAuthStore()

const visibleItems = computed(() =>
  ADMIN_NAVIGATION.filter(
    (item) =>
      item.roles.some((role) => auth.roles.includes(role)) &&
      auth.permissions.includes(item.permission),
  ),
)

const icons: Record<AdminNavigationIcon, typeof Film> = {
  movies: Film,
  cinemas: Building2,
  rooms: DoorOpen,
  showtimes: CalendarClock,
  users: Users,
}

function isActive(routeName: string) {
  return route.name === routeName
}
</script>

<template>
  <button
    v-if="mobile && mobileOpen"
    class="admin-sidebar__overlay"
    type="button"
    aria-label="Đóng menu quản trị"
    @click="emit('closeMobile')"
  />

  <aside
    class="admin-sidebar"
    :class="{
      'is-collapsed': collapsed,
      'is-mobile': mobile,
      'is-open': mobileOpen,
    }"
    :aria-hidden="mobile && !mobileOpen"
    :inert="mobile && !mobileOpen"
  >
    <div class="admin-sidebar__top">
      <RouterLink
        class="admin-sidebar__brand"
        :to="{ name: ROUTE_NAMES.ADMIN }"
        aria-label="Cinematic Admin"
        @click="emit('closeMobile')"
      >
        <span class="admin-sidebar__brand-mark" aria-hidden="true">C</span>
        <span class="admin-sidebar__brand-name">CINEMATIC</span>
      </RouterLink>

      <button
        v-if="mobile"
        class="admin-sidebar__close"
        type="button"
        aria-label="Đóng menu quản trị"
        @click="emit('closeMobile')"
      >
        <X aria-hidden="true" />
      </button>
    </div>

    <nav class="admin-sidebar__nav" aria-label="Điều hướng quản trị">
      <RouterLink
        v-for="item in visibleItems"
        :key="item.routeName"
        class="admin-sidebar__link"
        :class="{ 'is-active': isActive(item.routeName) }"
        :to="{ name: item.routeName }"
        :aria-label="item.label"
        :aria-current="isActive(item.routeName) ? 'page' : undefined"
        :title="collapsed ? item.label : undefined"
        @click="emit('closeMobile')"
      >
        <component :is="icons[item.icon]" class="admin-sidebar__icon" aria-hidden="true" />
        <span class="admin-sidebar__label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <span v-if="!visibleItems.length" class="admin-sidebar__empty" role="status">
      Không có module được cấp quyền.
    </span>
  </aside>
</template>
