<script setup lang="ts">
import { formatBookingDate } from '../mappers/booking-date.mapper'
import { formatBookingReference } from '../mappers/booking-reference.mapper'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import { customerBookingLabels, type CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'

const props = defineProps<{ booking: CustomerBooking; now: number }>()
const query = useBookingContextQuery(() => props.booking.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const imageFailed = ref(false)
const poster = computed(() =>
  imageFailed.value || !context.value?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const startsAt = computed(() => context.value?.showtime.startsAt)
const screeningPhase = computed(() => {
  if (props.booking.status !== 'CONFIRMED') return null
  const start = Date.parse(startsAt.value ?? '')
  const end = Date.parse(props.booking.showtimeEndsAt ?? context.value?.showtime.endsAt ?? '')
  if (!Number.isFinite(end)) return null
  if (props.now >= end) return { state: 'ended', label: 'Đã kết thúc' }
  if (!Number.isFinite(start) || start >= end) return null
  return props.now >= start
    ? { state: 'ongoing', label: 'Đang chiếu' }
    : { state: 'upcoming', label: 'Sắp chiếu' }
})
const amount = computed(() =>
  props.booking.totalAmount === null || !props.booking.currency
    ? 'Chưa xác nhận giá'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: props.booking.currency,
      }).format(props.booking.totalAmount),
)
</script>

<template>
  <article class="customer-bookings__order-card">
    <img
      class="customer-bookings__order-art"
      :src="poster"
      alt=""
      loading="lazy"
      @error="imageFailed = true"
    />
    <div class="customer-bookings__order-main">
      <span class="customer-bookings__id">Đơn {{ formatBookingReference(booking.id) }}</span>
      <h2>
        {{
          context?.movie.title ||
          (query.isPending.value ? 'Đang tải thông tin phim…' : 'Đơn đặt vé')
        }}
      </h2>
      <p v-if="context" class="booking-note">
        {{ context.cinema.name }}<br />
        <template v-if="startsAt"
          ><strong>{{ formatCinemaTime(startsAt) }}</strong> ·
          {{ formatBookingDate(getCinemaDateKey(startsAt)) }} ·
        </template>
        Ghế {{ booking.seats?.map((seat) => seat.seatNumber).join(', ') || 'đang xử lý' }}
      </p>
      <p v-else class="booking-note">
        Ghế {{ booking.seats?.map((seat) => seat.seatNumber).join(', ') || 'đang xử lý' }}
      </p>
      <div
        v-if="query.isError.value || (query.isSuccess.value && !context)"
        class="customer-bookings__metadata-error"
      >
        <span>Chưa tải được thông tin suất chiếu.</span>
        <AppButton
          variant="ghost"
          size="sm"
          :loading="query.isFetching.value"
          @click="query.refetch()"
          >Thử lại</AppButton
        >
      </div>
      <div class="customer-bookings__order-statuses">
        <span
          v-if="screeningPhase"
          class="customer-bookings__badge customer-bookings__screening-phase"
          :data-phase="screeningPhase.state"
          title="Trạng thái theo giờ chiếu; không phải xác nhận check-in"
          >{{ screeningPhase.label }}</span
        >
        <span v-else class="customer-bookings__badge" :data-status="booking.status">{{
          customerBookingLabels[booking.status]
        }}</span>
      </div>
    </div>
    <div class="customer-bookings__order-actions">
      <strong>{{ amount }}</strong>
      <RouterLink
        class="customer-bookings__order-link"
        :aria-label="`${booking.status === 'CONFIRMED' ? 'Xem vé' : 'Chi tiết đơn'} ${formatBookingReference(booking.id)}${context?.movie.title ? ` · ${context.movie.title}` : ''}`"
        :data-confirmed="booking.status === 'CONFIRMED'"
        :to="
          booking.status === 'CONFIRMED'
            ? { name: ROUTE_NAMES.BOOKING_TICKET, params: { bookingId: booking.id } }
            : { name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: booking.id } }
        "
        >{{ booking.status === 'CONFIRMED' ? 'Xem vé →' : 'Chi tiết đơn →' }}</RouterLink
      >
    </div>
  </article>
</template>
