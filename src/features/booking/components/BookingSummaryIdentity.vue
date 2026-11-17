<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ticket } from 'lucide-vue-next'
import type { BookingContext } from '../api/booking-queries'
import { formatBookingScreeningVersion } from '../mappers/booking-screening.mapper'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ context?: BookingContext | null; loading?: boolean }>()
const screeningLabel = computed(() =>
  formatBookingScreeningVersion(props.context?.showtime.screeningVersion),
)
const imageFailed = ref(false)
watch(
  () => props.context?.movie.posterUrl,
  () => {
    imageFailed.value = false
  },
)
const poster = computed(() =>
  imageFailed.value || !props.context?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : props.context.movie.posterUrl,
)
</script>

<template>
  <div class="booking-journey__summary-title">
    <h2>CUỘC HẸN CỦA BẠN</h2>
    <Ticket aria-hidden="true" />
  </div>
  <div class="booking-journey__summary-film">
    <img :src="poster" alt="" @error="imageFailed = true" />
    <div>
      <span v-if="context?.movie.ageRating" class="booking-journey__age">{{
        context.movie.ageRating
      }}</span>
      <h3>{{ context?.movie.title || (loading ? 'Đang tải phim…' : 'Thông tin suất chiếu') }}</h3>
      <p v-if="context?.movie.durationMinutes">{{ context.movie.durationMinutes }} phút</p>
      <p v-if="screeningLabel">{{ screeningLabel }}</p>
    </div>
  </div>
  <div v-if="context" class="booking-journey__summary-location">
    <strong>{{ context.cinema.name }}</strong>
    <p>{{ context.room.name }}</p>
    <p v-if="context.showtime.startsAt">
      <strong>{{ formatCinemaTime(context.showtime.startsAt) }}</strong> ·
      {{ formatCinemaDateKey(getCinemaDateKey(context.showtime.startsAt)) }}
    </p>
  </div>
</template>
