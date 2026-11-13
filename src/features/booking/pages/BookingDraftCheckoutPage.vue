<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppContainer from '@/components/ui/AppContainer.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { isBookingUuid } from '../api/booking-queries'
import BookingProgress from '../components/BookingProgress.vue'
import BookingDraftCheckout from '../components/BookingDraftCheckout.vue'

const route = useRoute()
const showtimeId = computed(() =>
  isBookingUuid(route.query.showtimeId) ? route.query.showtimeId.toLowerCase() : '',
)
</script>
<template>
  <div class="booking-journey booking-journey--checkout customer-bookings">
    <AppContainer>
      <BookingProgress current="checkout" />
      <BookingDraftCheckout v-if="showtimeId" :key="showtimeId" :showtime-id="showtimeId" />
      <div v-else class="booking-panel">
        <p class="booking-error" role="alert">Chưa có suất chiếu hợp lệ để thanh toán.</p>
        <RouterLink :to="{ name: ROUTE_NAMES.BOOKING_START }" class="customer-bookings__link"
          >Chọn suất chiếu →</RouterLink
        >
      </div>
    </AppContainer>
  </div>
</template>
<style src="../../../styles/customer-bookings.css"></style>
<style src="../../../styles/booking-journey.css"></style>
