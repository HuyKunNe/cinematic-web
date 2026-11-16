<script setup lang="ts">
import { computed } from 'vue'
import BookingMobileRecap from './BookingMobileRecap.vue'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatBookingMoney } from '../mappers/booking-seat.mapper'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ quote: BookingSeatQuote }>()
const query = useBookingContextQuery(() => props.quote.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const location = computed(() => {
  if (!context.value) return ''
  const { cinema, showtime } = context.value
  return [
    cinema.name,
    showtime.startsAt ? formatCinemaTime(showtime.startsAt) : '',
    showtime.startsAt ? formatCinemaDateKey(getCinemaDateKey(showtime.startsAt)) : '',
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>
<template>
  <BookingMobileRecap
    class="booking-checkout-recap"
    :title="context?.movie.title || 'Thông tin đặt vé'"
    :location="location"
    :seat-numbers="quote.seats.map((seat) => seat.seatNumber)"
    :total="formatBookingMoney(quote.totalMinor)"
    summary-id="booking-checkout-summary"
  />
</template>
