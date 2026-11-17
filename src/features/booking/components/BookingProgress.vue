<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
import type { RouteLocationRaw } from 'vue-router'
import { Check } from 'lucide-vue-next'
defineProps<{
  current: 'showtime' | 'seats' | 'checkout' | 'order'
  seatsTo?: RouteLocationRaw
  showtimeTo?: RouteLocationRaw
  navigationLocked?: boolean
}>()
</script>
<template>
  <ol class="lumiere-booking-progress" aria-label="Tiến trình đặt vé">
    <li
      :aria-current="current === 'showtime' ? 'step' : undefined"
      :data-active="current === 'showtime'"
      :data-complete="current !== 'showtime'"
    >
      <span
        ><Check v-if="current !== 'showtime'" aria-hidden="true" /><template v-else
          >1</template
        ></span
      ><RouterLink
        v-if="current !== 'showtime' && !navigationLocked"
        :to="showtimeTo ?? { name: ROUTE_NAMES.BOOKING_START }"
        >Chọn suất</RouterLink
      ><strong v-else>Chọn suất</strong>
    </li>
    <li
      :aria-current="current === 'seats' ? 'step' : undefined"
      :data-active="current === 'seats'"
      :data-complete="current === 'checkout' || current === 'order'"
    >
      <span
        ><Check v-if="current === 'checkout' || current === 'order'" aria-hidden="true" /><template
          v-else
          >2</template
        ></span
      ><RouterLink v-if="current === 'checkout' && seatsTo && !navigationLocked" :to="seatsTo"
        >Chọn ghế</RouterLink
      ><strong v-else>Chọn ghế</strong>
    </li>
    <li
      :aria-current="current === 'checkout' ? 'step' : undefined"
      :data-active="current === 'checkout'"
      :data-complete="current === 'order'"
    >
      <span
        ><Check v-if="current === 'order'" aria-hidden="true" /><template v-else>3</template></span
      ><strong>Thanh toán</strong>
    </li>
    <li :aria-current="current === 'order' ? 'step' : undefined" :data-active="current === 'order'">
      <span>4</span><strong>Nhận vé</strong>
    </li>
  </ol>
</template>
