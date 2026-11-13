<script setup lang="ts">
import { computed } from 'vue'
import type { CustomerBooking } from '../api/customer-bookings'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
const props = defineProps<{ booking?: CustomerBooking; quote?: BookingSeatQuote }>()
const source = computed(() => props.booking ?? props.quote)
const types: Record<string, string> = {
  STANDARD: 'Tiêu chuẩn',
  VIP: 'VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Hỗ trợ tiếp cận',
}
function money(value: number | null, currency: string | null) {
  return value === null || !currency
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value)
}
</script>
<template>
  <ul class="booking-journey__seat-lines">
    <li v-for="seat in source?.seats ?? []" :key="seat.seatNumber">
      <div>
        <span
          >Ghế {{ seat.seatNumber
          }}<template v-if="seat.seatType">
            · {{ types[seat.seatType] ?? seat.seatType }}</template
          ></span
        ><small
          ><template v-if="seat.ticketGroupName">{{ seat.ticketGroupName }} · </template
          >{{ seat.capacity ?? '—' }} khách/{{
            seat.unit === 'PAIR' ? 'cặp' : seat.unit === 'SEAT' ? 'ghế' : 'đơn vị'
          }}</small
        >
      </div>
      <strong>{{ money(seat.price, source?.currency ?? null) }}</strong>
    </li>
  </ul>
</template>
