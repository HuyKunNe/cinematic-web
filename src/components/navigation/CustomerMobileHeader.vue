<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { ChevronDown, MapPin, Menu, Search, UserRound, X } from 'lucide-vue-next'
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
const menuButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const drawerPanel = ref<HTMLElement | null>(null)
const restoreFocusOnClose = ref(true)
const bodyOverflowBeforeOpen = ref('')

const isDesktop = useMediaQuery('(min-width: 64rem)')

function isActive(routeName: string) {
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

function onDrawerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }

  if (event.key !== 'Tab') return

  const focusable = drawerPanel.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled])',
  )

  if (!focusable?.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(menuOpen, async (open) => {
  if (open) {
    bodyOverflowBeforeOpen.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    await nextTick()
    closeButton.value?.focus()
    return
  }

  document.body.style.overflow = bodyOverflowBeforeOpen.value

  await nextTick()
  if (restoreFocusOnClose.value) {
    menuButton.value?.focus()
  }
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

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeOpen.value
})
</script>

<template>
  <header class="customer-mobile-header">
    <div class="customer-mobile-header__bar">
      <RouterLink
        :to="{ name: ROUTE_NAMES.HOME }"
        class="cinematic-wordmark"
        aria-label="Lumière Cinema — Trang chủ"
      >
        <CustomerBrand />
      </RouterLink>

      <CustomerCitySelect
        id="customer-mobile-city"
        :model-value="cityKey"
        :options="cityOptions"
        :disabled="citiesDisabled"
        @update:model-value="emit('city-change', $event)"
      />

      <button
        class="customer-mobile-header__icon-button"
        type="button"
        aria-label="Tìm kiếm"
        data-lumiere-search
        @click="requestSearch"
      >
        <Search aria-hidden="true" class="customer-navigation__icon" />
      </button>

      <button
        ref="menuButton"
        class="customer-mobile-header__icon-button"
        type="button"
        aria-label="Mở menu điều hướng"
        aria-controls="customer-mobile-drawer"
        :aria-expanded="menuOpen"
        @click="menuOpen ? closeMenu() : (menuOpen = true)"
      >
        <Menu aria-hidden="true" class="customer-navigation__icon" />
      </button>
    </div>
  </header>

  <Teleport to="body">
    <div v-show="menuOpen" class="customer-mobile-drawer">
      <button
        class="customer-mobile-drawer__backdrop"
        type="button"
        aria-label="Đóng menu điều hướng"
        @click="closeMenu()"
      />

      <section
        id="customer-mobile-drawer"
        ref="drawerPanel"
        class="customer-mobile-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng Lumière Cinema"
        tabindex="-1"
        @keydown="onDrawerKeydown"
      >
        <div class="customer-mobile-drawer__heading">
          <span class="cinematic-wordmark"><CustomerBrand /></span>

          <button
            ref="closeButton"
            class="customer-mobile-drawer__close"
            type="button"
            aria-label="Đóng menu điều hướng"
            @click="closeMenu()"
          >
            <X aria-hidden="true" class="customer-navigation__icon" />
          </button>
        </div>

        <nav class="customer-mobile-drawer__nav" aria-label="Điều hướng chính">
          <RouterLink
            v-for="item in navigation"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="customer-mobile-drawer__link"
            :class="{ 'is-active': isActive(item.routeName) }"
            :aria-current="isActive(item.routeName) ? 'page' : undefined"
            @click="closeMenu()"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="customer-mobile-drawer__actions">
          <button
            class="customer-mobile-drawer__link"
            type="button"
            aria-haspopup="dialog"
            :aria-label="locationDescription"
            @click="requestLocation"
          >
            <MapPin aria-hidden="true" class="customer-navigation__icon" />
            <span>Địa điểm: {{ locationLabel }}</span>
          </button>

          <button class="customer-mobile-drawer__link" type="button" @click="requestSearch">
            <Search aria-hidden="true" class="customer-navigation__icon" />
            Tìm kiếm
          </button>

          <RouterLink
            class="customer-mobile-header__account"
            :to="{ name: ROUTE_NAMES.ACCOUNT }"
            :aria-label="auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập'"
          >
            <UserRound aria-hidden="true" class="customer-navigation__icon" />
            <span>{{ auth.isAuthenticated ? 'Tài khoản' : 'Đăng nhập' }}</span>
          </RouterLink>

          <RouterLink
            class="customer-mobile-drawer__booking"
            :to="{ name: ROUTE_NAMES.BOOKING_START }"
            @click="closeMenu()"
          >
            Đặt vé
          </RouterLink>
        </div>
      </section>
    </div>
  </Teleport>
</template>
