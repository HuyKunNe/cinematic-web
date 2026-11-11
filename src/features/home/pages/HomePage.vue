<script setup lang="ts">
import { ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useCinemaLocation } from '@/features/cinemas'
import HeroBanner from '../components/HeroBanner.vue'
import QuickBooking from '../components/QuickBooking.vue'
import HomeProgramme from '../components/HomeProgramme.vue'
import HomeCinemaDiscovery from '../components/HomeCinemaDiscovery.vue'
import { useHomeProgramme } from '../composables/use-home-programme'
import { useHomeHero } from '../composables/use-home-hero'

const { scopeKey, nowShowing, upcoming, loading, error, errorMessage, retrying, retry } =
  useHomeProgramme()

const {
  movies: heroMovies,
  loading: heroLoading,
  error: heroError,
  errorMessage: heroErrorMessage,
  retrying: heroRetrying,
  retry: retryHero,
} = useHomeHero()

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
    <HeroBanner
      :movies="heroMovies"
      :loading="heroLoading"
      :error="heroError"
      :error-message="heroErrorMessage"
      :retrying="heroRetrying"
      empty-message="Phim nổi bật sẽ được cập nhật."
      @retry="retryHero"
    />

    <div v-if="error" class="home-container">
      <p class="home-page__error" role="alert">{{ errorMessage }} Vui lòng thử lại.</p>

      <AppButton variant="ghost" size="sm" :loading="retrying" @click="retry"> Thử lại </AppButton>
    </div>

    <QuickBooking
      :movies="nowShowing"
      :movies-loading="loading"
      :movies-error="error"
      :location-changed="locationChanged"
      @retry-movies="retry"
      @dismiss-location-notice="dismissLocationNotice"
    />

    <HomeProgramme
      :key="scopeKey"
      :now-showing="nowShowing"
      :upcoming="upcoming"
      :loading="loading"
      :error="error"
    />

    <HomeCinemaDiscovery />
  </div>
</template>
