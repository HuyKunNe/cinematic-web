<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
defineProps<{ current: 'showtime' | 'seats' | 'order' }>()
</script>
<template>
  <ol class="lumiere-booking-progress" aria-label="Tiến trình đặt vé">
    <li
      :aria-current="current === 'showtime' ? 'step' : undefined"
      :data-active="current === 'showtime'"
    >
      <span>1</span
      ><RouterLink v-if="current !== 'showtime'" :to="{ name: ROUTE_NAMES.BOOKING_START }"
        >Chọn suất</RouterLink
      ><strong v-else>Chọn suất</strong>
    </li>
    <li :aria-current="current === 'seats' ? 'step' : undefined" :data-active="current === 'seats'">
      <span>2</span><strong>Chọn ghế &amp; báo giá</strong>
    </li>
    <li :aria-current="current === 'order' ? 'step' : undefined" :data-active="current === 'order'">
      <span>3</span><strong>Xác nhận đơn</strong>
    </li>
  </ol>
</template>
