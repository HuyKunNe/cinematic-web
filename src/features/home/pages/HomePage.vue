<script setup lang="ts">
import { ref, watch } from 'vue'
import { AppButton } from '@/components/ui'
import CustomerFooter from '@/components/navigation/CustomerFooter.vue'
import { useCinemaLocation } from '@/features/cinemas'
import HeroBanner from '../components/HeroBanner.vue'
import QuickBooking from '../components/QuickBooking.vue'
import NowShowingSection from '../components/NowShowingSection.vue'
import UpcomingMoviesSection from '../components/UpcomingMoviesSection.vue'
import PromotionSection from '../components/PromotionSection.vue'
import MembershipSection from '../components/MembershipSection.vue'
import { useHomeProgramme } from '../composables/use-home-programme'

const { scopeKey, nowShowing, upcoming, loading, error, errorMessage, retrying, retry } =
  useHomeProgramme()

const { location } = useCinemaLocation()
const locationChanged = ref(false)

watch(
  () => location.selectedCinemaId,
  (cinemaId, previousCinemaId) => {
    locationChanged.value = Boolean(cinemaId && previousCinemaId && cinemaId !== previousCinemaId)
  },
)

function dismissLocationNotice() {
  locationChanged.value = false
}
</script>

<template>
  <div class="home-page">
    <HeroBanner :key="`hero-${scopeKey}`" :movies="nowShowing" :loading="loading" />

    <div v-if="error" class="home-container">
      <p class="home-page__error" role="alert">{{ errorMessage }} Vui lòng thử lại.</p>

      <AppButton variant="ghost" size="sm" :loading="retrying" @click="retry"> Thử lại </AppButton>
    </div>

    <QuickBooking
      :key="`booking-${scopeKey}`"
      :movies="nowShowing"
      :movies-loading="loading"
      :movies-error="error"
      :location-changed="locationChanged"
      @retry-movies="retry"
      @dismiss-location-notice="dismissLocationNotice"
    />

    <NowShowingSection
      :key="`showing-${scopeKey}`"
      :movies="nowShowing"
      :loading="loading"
      :error="error"
    />

    <UpcomingMoviesSection
      :key="`upcoming-${scopeKey}`"
      :movies="upcoming"
      :loading="loading"
      :error="error"
    />

    <PromotionSection />
    <MembershipSection />
    <CustomerFooter />
  </div>
</template>
