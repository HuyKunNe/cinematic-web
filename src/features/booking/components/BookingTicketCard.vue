<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'
import { customerBookingLabels, type CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'

const props = defineProps<{ booking: CustomerBooking }>()
const query = useBookingContextQuery(() => props.booking.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const imageFailed = ref(false)
const poster = computed(() =>
  imageFailed.value || !context.value?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const startsAt = computed(() => context.value?.showtime.startsAt)
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
          {{ formatCinemaDateKey(getCinemaDateKey(startsAt)) }} ·
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
        <span class="customer-bookings__badge" :data-status="booking.status">{{
          customerBookingLabels[booking.status]
        }}</span>
      </div>
    </div>
    <div class="customer-bookings__order-actions">
      <strong>{{ amount }}</strong>
      <RouterLink
        class="customer-bookings__order-link"
        :data-confirmed="booking.status === 'CONFIRMED'"
        :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: booking.id } }"
        >Chi tiết đơn →</RouterLink
      >
    </div>
  </article>
</template>
