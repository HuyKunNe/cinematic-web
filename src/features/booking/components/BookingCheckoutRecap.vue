<script setup lang="ts">
import { formatBookingDate } from '../mappers/booking-date.mapper'
import { formatSavedBookingMoney } from '../mappers/booking-money.mapper'
import { computed } from 'vue'
import BookingMobileRecap from './BookingMobileRecap.vue'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
import type { CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{
  quote?: BookingSeatQuote
  booking?: CustomerBooking
}>()
const source = computed(() => props.booking ?? props.quote)
const query = useBookingContextQuery(() => source.value?.showtimeId ?? '', { poll: false })
const context = computed(() => query.data.value)
const total = computed(() => {
  if (props.booking)
    return formatSavedBookingMoney(
      props.booking.totalAmount,
      props.booking.currency,
      props.booking.status,
    )
  const value = source.value
  return value?.totalAmount == null || !value.currency
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: value.currency }).format(
        value.totalAmount,
      )
})
const location = computed(() => {
  if (!context.value) return ''
  const { cinema, showtime } = context.value
  return [
    cinema.name,
    showtime.startsAt ? formatCinemaTime(showtime.startsAt) : '',
    showtime.startsAt ? formatBookingDate(getCinemaDateKey(showtime.startsAt)) : '',
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>
<template>
  <BookingMobileRecap
    class="booking-checkout-recap"
    :title="context?.movie?.title || 'Thông tin đặt vé'"
    :location="location"
    :seat-numbers="source?.seats?.map((seat) => seat.seatNumber) ?? []"
    :total="total"
    :empty-seat-label="booking ? 'Đang xác nhận' : 'Chưa chọn'"
    summary-id="booking-checkout-summary"
  />
</template>
