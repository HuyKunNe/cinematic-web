<script setup lang="ts">
import CustomerHeader from '@/components/navigation/CustomerHeader.vue'
import CustomerMobileHeader from '@/components/navigation/CustomerMobileHeader.vue'
import MobileBottomNav from '@/components/navigation/MobileBottomNav.vue'
import '@/styles/customer-navigation.css'

const emit = defineEmits<{
  searchRequest: []
  locationRequest: []
}>()
</script>

<template>
  <div class="customer-layout">
    <CustomerHeader
      @search-request="emit('searchRequest')"
      @location-request="emit('locationRequest')"
    />

    <CustomerMobileHeader
      @search-request="emit('searchRequest')"
      @location-request="emit('locationRequest')"
    />

    <main class="customer-layout__main">
      <RouterView />
    </main>

    <MobileBottomNav />
  </div>
</template>

<style scoped>
.customer-layout__main {
  min-height: 100vh;
  padding-top: var(--header-height-mobile);
  padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
  .customer-layout__main {
    padding-top: var(--header-height);
    padding-bottom: var(--space-8);
  }
}
</style>
