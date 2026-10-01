<script setup lang="ts">
import { computed } from 'vue'
import CustomerFooter from '@/components/navigation/CustomerFooter.vue'
import HeroBanner from '../components/HeroBanner.vue'
import QuickBooking from '../components/QuickBooking.vue'
import NowShowingSection from '../components/NowShowingSection.vue'
import UpcomingMoviesSection from '../components/UpcomingMoviesSection.vue'
import PromotionSection from '../components/PromotionSection.vue'
import MembershipSection from '../components/MembershipSection.vue'
import { useHomeMovies } from '../api/home-queries'

const moviesQuery = useHomeMovies()
const nowShowing = computed(() =>
  (moviesQuery.data.value ?? []).filter((movie) => movie.status === 'NOW_SHOWING'),
)
const upcoming = computed(() =>
  (moviesQuery.data.value ?? [])
    .filter((movie) => movie.status === 'UPCOMING')
    .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')),
)
</script>

<template>
  <div class="home-page">
    <HeroBanner :movies="nowShowing" :loading="moviesQuery.isPending.value" />
    <p v-if="moviesQuery.isError.value" class="home-container home-page__error" role="alert">
      Không thể tải dữ liệu phim. Vui lòng thử lại sau.
    </p>
    <QuickBooking
      :movies="nowShowing"
      :movies-loading="moviesQuery.isPending.value"
      :movies-error="moviesQuery.isError.value"
      @retry-movies="moviesQuery.refetch()"
    />
    <NowShowingSection
      :movies="nowShowing"
      :loading="moviesQuery.isPending.value"
      :error="moviesQuery.isError.value"
    />
    <UpcomingMoviesSection
      :movies="upcoming"
      :loading="moviesQuery.isPending.value"
      :error="moviesQuery.isError.value"
    />
    <PromotionSection />
    <MembershipSection />
    <CustomerFooter />
  </div>
</template>
