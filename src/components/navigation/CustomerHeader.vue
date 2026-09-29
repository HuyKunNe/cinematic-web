<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'

const emit = defineEmits<{
  searchRequest: []
  locationRequest: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navigation = [
  { label: 'Lịch chiếu', name: ROUTE_NAMES.SHOWTIMES },
  { label: 'Phim', name: ROUTE_NAMES.MOVIES },
  { label: 'Rạp', name: ROUTE_NAMES.CINEMAS },
  { label: 'Ưu đãi', name: ROUTE_NAMES.PROMOTIONS },
]

function isActive(name: string) {
  return route.matched.some((record) => record.name === name)
}

function openBooking() {
  // Chưa có showtimeId; CTA dẫn đến lịch chiếu để khách chọn suất.
  void router.push({ name: ROUTE_NAMES.SHOWTIMES })
}

function openAccount() {
  void router.push({
    name: auth.isAuthenticated ? ROUTE_NAMES.ACCOUNT : ROUTE_NAMES.AUTH_REQUIRED,
  })
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
          :key="item.name"
          :to="{ name: item.name }"
          class="customer-header__link"
          :class="{ 'is-active': isActive(item.name) }"
          :aria-current="isActive(item.name) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="customer-header__actions">
        <button
          class="customer-header__utility"
          type="button"
          aria-label="Tìm phim"
          @click="emit('searchRequest')"
        >
          Tìm kiếm
        </button>

        <button
          class="customer-header__utility customer-header__location"
          type="button"
          aria-label="Chọn rạp hoặc khu vực"
          @click="emit('locationRequest')"
        >
          Chọn rạp
        </button>

        <button
          class="customer-header__utility customer-header__account"
          type="button"
          @click="openAccount"
        >
          {{ auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập' }}
        </button>

        <button class="customer-header__booking" type="button" @click="openBooking">Đặt vé</button>
      </div>
    </div>
  </header>
</template>
