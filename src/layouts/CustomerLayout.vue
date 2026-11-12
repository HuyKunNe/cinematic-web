<script setup lang="ts">
import { nextTick, readonly, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { signOut, restoreAuthSession } from '@/features/auth'
import CustomerHeader from '@/components/navigation/CustomerHeader.vue'
import CustomerMobileHeader from '@/components/navigation/CustomerMobileHeader.vue'
import MobileBottomNav from '@/components/navigation/MobileBottomNav.vue'
import CustomerFooter from '@/components/navigation/CustomerFooter.vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import {
  CinemaLocationDialog,
  provideCinemaLocationDialog,
  useCinemaLocation,
} from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
import '@/styles/customer-navigation.css'
import '@/styles/customer-lumiere.css'

const route = useRoute()
const router = useRouter()
const queries = useQueryClient()
const signOutPending = ref(false)
const signOutError = ref('')

async function logout() {
  if (signOutPending.value) return
  signOutPending.value = true
  signOutError.value = ''
  try {
    await signOut()
    queries.clear()
  } catch {
    await restoreAuthSession()
    signOutError.value = 'Chưa thể đăng xuất. Vui lòng thử lại từ menu tài khoản.'
  } finally {
    signOutPending.value = false
  }
}

const locationOpen = ref(false)
const locationTrigger = shallowRef<HTMLButtonElement | null>(null)
const searchError = ref('')
let openingSearch = false

const {
  locationLabel,
  locationDescription,
  cities,
  location,
  query: locationQuery,
} = useCinemaLocation()
function changeCity(key: string) {
  if (
    locationQuery.isFetching.value ||
    locationQuery.isError.value ||
    !cities.value.some((city) => city.key === key)
  )
    return
  location.selectCity(key)
}

function openLocation(trigger: HTMLButtonElement) {
  locationTrigger.value = trigger
  locationOpen.value = true
}

async function openMovieSearch() {
  if (openingSearch) return

  openingSearch = true
  searchError.value = ''
  locationOpen.value = false

  try {
    if (route.name !== ROUTE_NAMES.MOVIES) {
      const failure = await router.push({
        name: ROUTE_NAMES.MOVIES,
      })

      if (failure) {
        searchError.value = 'Chưa thể mở trang tìm phim. Vui lòng thử lại.'
        return
      }
    }

    await nextTick()

    // Người dùng có thể chuyển trang trong lúc chờ điều hướng.
    if (route.name !== ROUTE_NAMES.MOVIES) return

    const input = document.getElementById('movies-search-input')

    if (!(input instanceof HTMLInputElement)) {
      searchError.value = 'Chưa thể mở ô tìm phim. Vui lòng tải lại trang và thử lại.'
      return
    }

    input.focus({ preventScroll: true })
    input.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'auto',
    })
  } catch {
    searchError.value = 'Chưa thể mở trang tìm phim. Vui lòng thử lại.'
  } finally {
    openingSearch = false
  }
}

provideCinemaLocationDialog({
  isOpen: readonly(locationOpen),
  open: openLocation,
})

watch(
  () => route.fullPath,
  () => {
    locationOpen.value = false
    searchError.value = ''
  },
)
</script>

<template>
  <div class="customer-layout">
    <div class="lumiere-topline">
      <span>ĐIỆN ẢNH BẮT ĐẦU TỪ MỘT CUỘC HẸN</span><span>Giờ Việt Nam · UTC+7</span>
    </div>
    <CustomerHeader
      :sign-out-pending="signOutPending"
      @sign-out="logout"
      :location-label="locationLabel"
      :location-description="locationDescription"
      :location-open="locationOpen"
      :city-key="location.selectedCityKey"
      :city-options="cities"
      :cities-disabled="
        locationQuery.isFetching.value || locationQuery.isError.value || !cities.length
      "
      @city-change="changeCity"
      @search-request="openMovieSearch"
      @location-request="openLocation"
    />

    <CustomerMobileHeader
      :sign-out-pending="signOutPending"
      @sign-out="logout"
      :location-label="locationLabel"
      :location-description="locationDescription"
      :location-open="locationOpen"
      :city-key="location.selectedCityKey"
      :city-options="cities"
      :cities-disabled="
        locationQuery.isFetching.value || locationQuery.isError.value || !cities.length
      "
      @city-change="changeCity"
      @search-request="openMovieSearch"
      @location-request="openLocation"
    />

    <main class="customer-layout__main">
      <AppContainer v-if="signOutError" class="customer-layout__search-feedback">
        <p class="customer-layout__search-error" role="alert">{{ signOutError }}</p>
      </AppContainer>
      <AppContainer v-if="searchError" class="customer-layout__search-feedback">
        <p class="customer-layout__search-error" role="alert">
          {{ searchError }}
        </p>
      </AppContainer>

      <RouterView />
    </main>

    <CustomerFooter />
    <MobileBottomNav />

    <CinemaLocationDialog v-model:open="locationOpen" :return-focus-to="locationTrigger" />
  </div>
</template>

<style scoped>
.customer-layout__search-feedback {
  padding-block: var(--space-3);
}

.customer-layout__search-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}
</style>
