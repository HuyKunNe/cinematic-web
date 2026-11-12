<script setup lang="ts">
import type { CustomerBooking } from '../api/customer-bookings'
defineProps<{ booking: CustomerBooking }>()
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
    <li v-for="seat in booking.seats ?? []" :key="seat.id">
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
      <strong>{{ money(seat.price, booking.currency) }}</strong>
    </li>
  </ul>
</template>
