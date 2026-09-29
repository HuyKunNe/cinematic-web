<script setup lang="ts">
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays, House, Ticket, UserRound } from 'lucide-vue-next'
import { CUSTOMER_BOTTOM_NAVIGATION } from './customer-navigation'
import type { CustomerNavigationItem } from './customer-navigation'
const route = useRoute()
const items = CUSTOMER_BOTTOM_NAVIGATION

const icons: Record<string, Component> = {
  home: House,
  showtimes: CalendarDays,
  tickets: Ticket,
  account: UserRound,
}

function isActive(routeNames: readonly string[]) {
  return route.matched.some(
    (record) => record.name != null && routeNames.includes(String(record.name)),
  )
}

function activeNames(item: CustomerNavigationItem): readonly string[] {
  return item.activeRouteNames ?? [item.routeName]
}
</script>

<template>
  <nav class="mobile-bottom-nav" aria-label="Điều hướng di động">
    <RouterLink
      v-for="item in items"
      :key="item.routeName"
      :to="{ name: item.routeName }"
      class="mobile-bottom-nav__item"
      :class="{ 'is-active': isActive(activeNames(item)) }"
      :aria-current="isActive(activeNames(item)) ? 'page' : undefined"
    >
      <component
        :is="icons[item.icon]"
        aria-hidden="true"
        class="customer-navigation__icon mobile-bottom-nav__icon"
      />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
