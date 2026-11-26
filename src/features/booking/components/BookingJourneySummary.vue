<script setup lang="ts">
import { computed } from 'vue'
import { Clock3 } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import type { CustomerBooking } from '../api/customer-bookings'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
import { useBookingContextQuery } from '../api/booking-queries'
import BookingSummaryIdentity from './BookingSummaryIdentity.vue'
import { formatSavedBookingMoney } from '../mappers/booking-money.mapper'

const props = defineProps<{
  booking?: CustomerBooking
  quote?: BookingSeatQuote
  showtimeId?: string
  loading?: boolean
  remaining?: string
  expired?: boolean
}>()
const source = computed(() => props.booking ?? props.quote)
const query = useBookingContextQuery(() => source.value?.showtimeId ?? props.showtimeId ?? '', {
  poll: false,
})
const context = computed(() => query.data.value)
const amount = computed(() => {
  if (props.booking)
    return formatSavedBookingMoney(
      props.booking.totalAmount,
      props.booking.currency,
      props.booking.status,
    )
  return source.value?.totalAmount == null || !source.value.currency
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: source.value.currency,
      }).format(source.value.totalAmount)
})
</script>

<template>
  <aside
    class="booking-journey__summary booking-panel"
    aria-label="Tóm tắt đặt vé"
    :aria-busy="loading || query.isPending.value"
  >
    <BookingSummaryIdentity :context="context" :loading="query.isPending.value" />
    <div v-if="query.isError.value || (query.isSuccess.value && !context)" class="booking-note">
      <p>Chưa tải được thông tin suất.</p>
      <AppButton
        variant="ghost"
        size="sm"
        :loading="query.isFetching.value"
        @click="query.refetch()"
        >Thử lại</AppButton
      >
    </div>
    <div class="booking-journey__summary-seats">
      <span>Ghế đã chọn</span
      ><strong>{{
        source?.seats?.map((seat) => seat.seatNumber).join(', ') || 'Đang xác nhận'
      }}</strong
      ><small>{{ source?.seatCount ?? '—' }} đơn vị · {{ source?.capacity ?? '—' }} khách</small>
    </div>
    <dl class="booking-journey__price-breakdown">
      <div>
        <dt>Tiền vé</dt>
        <dd>{{ amount }}</dd>
      </div>
      <div class="booking-journey__total">
        <dt>Tổng thanh toán</dt>
        <dd>{{ amount }}</dd>
      </div>
    </dl>
    <p v-if="quote" class="booking-journey__summary-note">
      Tổng tiền theo báo giá hiện tại. Ghế chỉ được giữ khi hệ thống xác nhận yêu cầu đặt vé.
    </p>
    <div v-if="booking?.status === 'RESERVED'" class="booking-journey__clock">
      <Clock3 aria-hidden="true" /><span
        >{{ expired ? 'Đã đến hạn giữ ghế. Đang chờ cập nhật.' : 'Giữ chỗ còn' }}
        <strong v-if="!expired">{{ remaining }}</strong></span
      >
    </div>
  </aside>
</template>
