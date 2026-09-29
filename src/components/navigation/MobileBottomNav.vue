<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-constants'

const route = useRoute()

const items = [
  { label: 'Lịch chiếu', name: ROUTE_NAMES.SHOWTIMES },
  { label: 'Phim', name: ROUTE_NAMES.MOVIES },
  { label: 'Rạp', name: ROUTE_NAMES.CINEMAS },
  { label: 'Tài khoản', name: ROUTE_NAMES.ACCOUNT },
]

function isActive(name: string) {
  return route.matched.some((record) => record.name === name)
}
</script>

<template>
  <nav class="mobile-bottom-nav" aria-label="Điều hướng nhanh">
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      class="mobile-bottom-nav__item"
      :class="{ 'is-active': isActive(item.name) }"
      :aria-current="isActive(item.name) ? 'page' : undefined"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>
