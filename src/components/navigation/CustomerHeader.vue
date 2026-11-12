<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { CUSTOMER_PRIMARY_NAVIGATION } from './customer-navigation'
import CustomerBrand from './CustomerBrand.vue'
import CustomerCitySelect from './CustomerCitySelect.vue'
import CustomerAccountMenu from './CustomerAccountMenu.vue'

withDefaults(
  defineProps<{
    locationLabel?: string
    locationDescription?: string
    locationOpen?: boolean
    cityKey?: string
    cityOptions?: readonly { key: string; name: string }[]
    citiesDisabled?: boolean
    signOutPending?: boolean
  }>(),
  {
    locationLabel: 'Chọn thành phố',
    locationDescription: 'Chọn thành phố và rạp',
    locationOpen: false,
    cityKey: '',
    cityOptions: () => [],
    citiesDisabled: false,
    signOutPending: false,
  },
)

const emit = defineEmits<{
  searchRequest: []
  locationRequest: [trigger: HTMLButtonElement]
  'city-change': [key: string]
  signOut: []
}>()

const route = useRoute()
const auth = useAuthStore()
const navigation = CUSTOMER_PRIMARY_NAVIGATION

function isActive(routeName: string) {
  if (routeName === ROUTE_NAMES.MOVIES && route.name === ROUTE_NAMES.MOVIE_DETAIL) return true
  return route.matched.some((record) => record.name === routeName)
}
</script>

<template>
  <header class="customer-header">
    <div class="customer-header__inner">
      <RouterLink
        :to="{ name: ROUTE_NAMES.HOME }"
        class="cinematic-wordmark"
        aria-label="Lumière Cinema — Trang chủ"
      >
        <CustomerBrand />
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
        <CustomerCitySelect
          id="customer-desktop-city"
          :model-value="cityKey"
          :options="cityOptions"
          :disabled="citiesDisabled"
          @update:model-value="emit('city-change', $event)"
        />
        <button
          class="customer-header__icon-button"
          type="button"
          aria-label="Tìm kiếm"
          @click="emit('searchRequest')"
        >
          <Search aria-hidden="true" class="customer-navigation__icon" />
        </button>

        <CustomerAccountMenu
          v-if="auth.isAuthenticated || signOutPending"
          :username="auth.username"
          :pending="signOutPending"
          @sign-out="emit('signOut')"
        />

        <div v-else class="customer-header__auth" aria-label="Tài khoản">
          <RouterLink
            class="customer-header__sign-in"
            :to="{ name: ROUTE_NAMES.LOGIN, query: { returnTo: route.fullPath } }"
            >Đăng nhập</RouterLink
          >
          <RouterLink class="customer-header__register" :to="{ name: ROUTE_NAMES.REGISTER }"
            >Đăng ký</RouterLink
          >
        </div>
      </div>
    </div>
  </header>
</template>
