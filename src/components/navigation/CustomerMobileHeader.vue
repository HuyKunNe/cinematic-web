<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { MapPin, Menu, Search, UserRound, X } from 'lucide-vue-next'
import { DialogRoot, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import { CUSTOMER_MEDIA_QUERIES } from '@/config/customer-responsive'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { CUSTOMER_PRIMARY_NAVIGATION } from './customer-navigation'
import CustomerBrand from './CustomerBrand.vue'
import CustomerCitySelect from './CustomerCitySelect.vue'

withDefaults(
  defineProps<{
    locationLabel?: string
    locationDescription?: string
    locationOpen?: boolean
    cityKey?: string
    cityOptions?: readonly { key: string; name: string }[]
    citiesDisabled?: boolean
  }>(),
  {
    locationLabel: 'Chọn thành phố',
    locationDescription: 'Chọn thành phố và rạp',
    locationOpen: false,
    cityKey: '',
    cityOptions: () => [],
    citiesDisabled: false,
  },
)

const emit = defineEmits<{
  searchRequest: []
  locationRequest: [trigger: HTMLButtonElement]
  'city-change': [key: string]
}>()

const route = useRoute()
const auth = useAuthStore()
const navigation = CUSTOMER_PRIMARY_NAVIGATION

const menuOpen = ref(false)
const restoreFocusOnClose = ref(true)
const isDesktop = useMediaQuery(CUSTOMER_MEDIA_QUERIES.desktopHeader)

function isActive(routeName: string) {
  if (routeName === ROUTE_NAMES.MOVIES && route.name === ROUTE_NAMES.MOVIE_DETAIL) return true
  return route.matched.some((record) => record.name === routeName)
}

function closeMenu(restoreFocus = true) {
  restoreFocusOnClose.value = restoreFocus
  menuOpen.value = false
}

async function requestSearch() {
  closeMenu(false)
  await nextTick()
  emit('searchRequest')
}

async function requestLocation(event: MouseEvent) {
  const trigger = event.currentTarget

  if (menuOpen.value) {
    closeMenu(false)
    await nextTick()

    const cityTrigger = document.getElementById('customer-mobile-city')
    if (cityTrigger instanceof HTMLButtonElement) emit('locationRequest', cityTrigger)
    else if (trigger instanceof HTMLButtonElement) emit('locationRequest', trigger)

    return
  }

  if (trigger instanceof HTMLButtonElement) {
    emit('locationRequest', trigger)
  }
}

watch(menuOpen, (open) => {
  if (open) restoreFocusOnClose.value = true
})

watch(isDesktop, (desktop) => {
  if (desktop && menuOpen.value) closeMenu(false)
})

watch(
  () => route.fullPath,
  () => {
    if (menuOpen.value) closeMenu(false)
  },
)

</script>

<template>
  <DialogRoot v-model:open="menuOpen">
    <header class="customer-mobile-header">
      <div class="customer-mobile-header__bar">
        <RouterLink :to="{ name: ROUTE_NAMES.HOME }" class="cinematic-wordmark" aria-label="Lumière Cinema — Trang chủ"><CustomerBrand /></RouterLink>
        <button class="customer-mobile-header__icon-button" type="button" aria-label="Tìm phim" @click="requestSearch"><Search aria-hidden="true" class="customer-navigation__icon" /></button>
        <DialogTrigger as-child>
          <button class="customer-mobile-header__icon-button" type="button" aria-label="Mở menu điều hướng"><Menu aria-hidden="true" class="customer-navigation__icon" /></button>
        </DialogTrigger>
      </div>
      <div class="customer-mobile-header__location-row">
        <CustomerCitySelect id="customer-mobile-city" :model-value="cityKey" :options="cityOptions" :disabled="citiesDisabled" @update:model-value="emit('city-change', $event)" />
        <button class="customer-mobile-header__cinema" type="button" aria-haspopup="dialog" :aria-expanded="locationOpen" :aria-label="locationDescription" @click="requestLocation">
          <MapPin aria-hidden="true" class="customer-navigation__icon" /><span>{{ locationLabel }}</span>
        </button>
      </div>
    </header>
    <DialogPortal>
      <DialogOverlay class="customer-mobile-drawer__backdrop customer-mobile-drawer__overlay" />
      <DialogContent class="customer-mobile-drawer__panel customer-mobile-drawer__content" @close-auto-focus="(!restoreFocusOnClose || isDesktop) && $event.preventDefault()">
        <div class="customer-mobile-drawer__heading">
          <div><DialogTitle class="customer-mobile-drawer__title">Khám phá Lumière</DialogTitle><DialogDescription class="customer-mobile-drawer__description">Phim hay, rạp gần bạn và những cuộc hẹn điện ảnh.</DialogDescription></div>
          <DialogClose as-child><button class="customer-mobile-drawer__close" type="button" aria-label="Đóng menu"><X aria-hidden="true" class="customer-navigation__icon" /></button></DialogClose>
        </div>
        <div class="customer-mobile-drawer__auth">
          <RouterLink v-if="auth.isAuthenticated" class="customer-header__account" :to="{ name: ROUTE_NAMES.ACCOUNT }" @click="closeMenu(false)"><UserRound aria-hidden="true" class="customer-navigation__icon" />Tài khoản của bạn</RouterLink>
          <template v-else>
            <RouterLink class="customer-header__sign-in" :to="{ name: ROUTE_NAMES.LOGIN, query: { returnTo: route.fullPath } }" @click="closeMenu(false)">Đăng nhập</RouterLink>
            <RouterLink class="customer-header__register" :to="{ name: ROUTE_NAMES.REGISTER }" @click="closeMenu(false)">Đăng ký</RouterLink>
          </template>
        </div>
        <nav class="customer-mobile-drawer__nav" aria-label="Điều hướng chính">
          <RouterLink v-for="item in navigation" :key="item.routeName" :to="{ name: item.routeName }" class="customer-mobile-drawer__link" :class="{ 'is-active': isActive(item.routeName) }" :aria-current="isActive(item.routeName) ? 'page' : undefined" @click="closeMenu(false)">{{ item.label }}</RouterLink>
        </nav>
        <div class="customer-mobile-drawer__actions">
          <button class="customer-mobile-drawer__link" type="button" :aria-label="locationDescription" @click="requestLocation"><MapPin aria-hidden="true" class="customer-navigation__icon" /><span>{{ locationLabel }}</span></button>
          <button class="customer-mobile-drawer__link" type="button" @click="requestSearch"><Search aria-hidden="true" class="customer-navigation__icon" />Tìm phim</button>
          <RouterLink class="customer-mobile-drawer__booking" :to="{ name: ROUTE_NAMES.BOOKING_START }" @click="closeMenu(false)">Đặt vé ngay</RouterLink>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
