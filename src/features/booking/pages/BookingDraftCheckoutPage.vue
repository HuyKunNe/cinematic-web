<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppContainer from '@/components/ui/AppContainer.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { isBookingUuid } from '../api/booking-queries'
import BookingProgress from '../components/BookingProgress.vue'
import BookingDraftCheckout from '../components/BookingDraftCheckout.vue'

const route = useRoute()
const processing = ref(false)
const locked = ref(false)
const showtimeId = computed(() =>
  isBookingUuid(route.query.showtimeId) ? route.query.showtimeId.toLowerCase() : '',
)
watch(showtimeId, () => {
  processing.value = false
  locked.value = false
})
</script>
<template>
  <div
    class="booking-journey customer-bookings"
    :class="{ 'booking-journey--checkout': !processing, 'booking-journey--result': processing }"
  >
    <AppContainer>
      <BookingProgress
        v-if="!processing"
        current="checkout"
        :navigation-locked="locked"
        :seats-to="showtimeId ? { name: ROUTE_NAMES.BOOKING, params: { showtimeId } } : undefined"
      />
      <BookingDraftCheckout
        v-if="showtimeId"
        :key="showtimeId"
        :showtime-id="showtimeId"
        @processing="processing = $event"
        @locked="locked = $event"
      />
      <div v-else class="booking-panel">
        <p class="booking-error" role="alert">Suất chiếu không hợp lệ.</p>
        <RouterLink :to="{ name: ROUTE_NAMES.BOOKING_START }" class="customer-bookings__link"
          >Chọn suất chiếu →</RouterLink
        >
      </div>
    </AppContainer>
  </div>
</template>
<style src="../../../styles/customer-bookings.css"></style>
<style src="../../../styles/booking-journey.css"></style>
