<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { CUSTOMER_PRIMARY_NAVIGATION } from './customer-navigation'

withDefaults(
  defineProps<{
    locationLabel?: string
    locationDescription?: string
    locationOpen?: boolean
  }>(),
  {
    locationLabel: 'Chọn thành phố',
    locationDescription: 'Chọn thành phố và rạp',
    locationOpen: false,
  },
)

const emit = defineEmits<{
  searchRequest: []
  locationRequest: [trigger: HTMLButtonElement]
}>()

function requestLocation(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLButtonElement) {
    emit('locationRequest', event.currentTarget)
  }
}

const route = useRoute()
const auth = useAuthStore()
const navigation = CUSTOMER_PRIMARY_NAVIGATION

function isActive(routeName: string) {
  return route.matched.some((record) => record.name === routeName)
}
</script>

<template>
  <header class="customer-header">
    <div class="customer-header__inner">
      <RouterLink
        :to="{ name: ROUTE_NAMES.HOME }"
        class="cinematic-wordmark"
        aria-label="Cinematic — Trang chủ"
      >
        CINEMATIC
      </RouterLink>

      <nav class="customer-header__nav" aria-label="Điều hướng chính">
        <RouterLink
          v-for="item in navigation"
          :key="item.routeName"
          :to="{ name: item.routeName }"
          class="customer-header__link"
          :class="{ 'is-active': isActive(item.routeName) }"
          :aria-current="isActive(item.routeName) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="customer-header__actions">
        <button
          class="customer-header__icon-button"
          type="button"
          aria-label="Tìm kiếm"
          @click="emit('searchRequest')"
        >
          <Search aria-hidden="true" class="customer-navigation__icon" />
        </button>

        <button
          class="customer-header__location"
          type="button"
          data-location-trigger
          aria-haspopup="dialog"
          aria-controls="cinema-location-dialog"
          :aria-expanded="locationOpen"
          :aria-label="locationDescription"
          :title="locationDescription"
          @click="requestLocation"
        >
          <MapPin aria-hidden="true" class="customer-navigation__icon" />
          <span>{{ locationLabel }}</span>
          <ChevronDown aria-hidden="true" class="customer-navigation__icon" />
        </button>

        <RouterLink class="customer-header__account" :to="{ name: ROUTE_NAMES.ACCOUNT }">
          <UserRound aria-hidden="true" class="customer-navigation__icon" />
          <span>{{ auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập' }}</span>
          <ChevronDown aria-hidden="true" class="customer-navigation__icon" />
        </RouterLink>

        <RouterLink class="customer-header__booking" :to="{ name: ROUTE_NAMES.BOOKING_START }">
          Đặt vé
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { ChevronDown, MapPin, Search, UserRound } from 'lucide-vue-next'

export { ChevronDown, MapPin, Search, UserRound }
</script>
