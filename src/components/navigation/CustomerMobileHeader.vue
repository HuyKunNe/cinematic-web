<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
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
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)

const navigation = [
  { label: 'Lịch chiếu', name: ROUTE_NAMES.SHOWTIMES },
  { label: 'Phim', name: ROUTE_NAMES.MOVIES },
  { label: 'Rạp', name: ROUTE_NAMES.CINEMAS },
  { label: 'Ưu đãi', name: ROUTE_NAMES.PROMOTIONS },
]

function isActive(name: string) {
  return route.matched.some((record) => record.name === name)
}

function closeMenu() {
  menuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
    menuButton.value?.focus()
  }
}

function openBooking() {
  closeMenu()
  void router.push({ name: ROUTE_NAMES.SHOWTIMES })
}

function openAccount() {
  closeMenu()
  void router.push({
    name: auth.isAuthenticated ? ROUTE_NAMES.ACCOUNT : ROUTE_NAMES.AUTH_REQUIRED,
  })
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="customer-mobile-header">
    <div class="customer-mobile-header__bar">
      <button
        ref="menuButton"
        class="customer-mobile-header__menu-button"
        type="button"
        aria-label="Mở menu điều hướng"
        aria-controls="customer-mobile-menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <span aria-hidden="true">{{ menuOpen ? 'Đóng' : 'Menu' }}</span>
      </button>

      <RouterLink
        :to="{ name: ROUTE_NAMES.HOME }"
        class="cinematic-wordmark"
        aria-label="Cinematic — Trang chủ"
        @click="closeMenu"
      >
        CINEMATIC
      </RouterLink>

      <button
        class="customer-mobile-header__account"
        type="button"
        :aria-label="auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập'"
        @click="openAccount"
      >
        {{ auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập' }}
      </button>
    </div>

    <nav
      v-if="menuOpen"
      id="customer-mobile-menu"
      class="customer-mobile-menu"
      aria-label="Điều hướng chính"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.name"
        :to="{ name: item.name }"
        class="customer-mobile-menu__link"
        :class="{ 'is-active': isActive(item.name) }"
        :aria-current="isActive(item.name) ? 'page' : undefined"
        @click="closeMenu"
      >
        {{ item.label }}
      </RouterLink>

      <button
        class="customer-mobile-menu__link"
        type="button"
        @click="() => (emit('locationRequest'), closeMenu())"
      >
        Chọn rạp
      </button>

      <button
        class="customer-mobile-menu__link"
        type="button"
        @click="() => (emit('searchRequest'), closeMenu())"
      >
        Tìm kiếm
      </button>

      <button class="customer-mobile-menu__booking" type="button" @click="openBooking">
        Đặt vé
      </button>
    </nav>
  </header>
</template>
