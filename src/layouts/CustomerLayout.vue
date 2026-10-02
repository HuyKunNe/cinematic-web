<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import CustomerHeader from '@/components/navigation/CustomerHeader.vue'
import CustomerMobileHeader from '@/components/navigation/CustomerMobileHeader.vue'
import MobileBottomNav from '@/components/navigation/MobileBottomNav.vue'
import { CinemaLocationDialog, useCinemaLocation } from '@/features/cinemas'
import '@/styles/customer-navigation.css'

const emit = defineEmits<{
  searchRequest: []
}>()

const route = useRoute()
const locationOpen = ref(false)
const locationTrigger = shallowRef<HTMLButtonElement | null>(null)

const { locationLabel, locationDescription } = useCinemaLocation()

function openLocation(trigger: HTMLButtonElement) {
  locationTrigger.value = trigger
  locationOpen.value = true
}

watch(
  () => route.fullPath,
  () => {
    locationOpen.value = false
  },
)
</script>

<template>
  <div class="customer-layout">
    <CustomerHeader
      :location-label="locationLabel"
      :location-description="locationDescription"
      :location-open="locationOpen"
      @search-request="emit('searchRequest')"
      @location-request="openLocation"
    />

    <CustomerMobileHeader
      :location-label="locationLabel"
      :location-description="locationDescription"
      :location-open="locationOpen"
      @search-request="emit('searchRequest')"
      @location-request="openLocation"
    />

    <main class="customer-layout__main">
      <RouterView />
    </main>

    <MobileBottomNav />

    <CinemaLocationDialog v-model:open="locationOpen" :return-focus-to="locationTrigger" />
  </div>
</template>
