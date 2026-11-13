<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatBookingMoney } from '../mappers/booking-seat.mapper'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ quote: BookingSeatQuote }>()
const query = useBookingContextQuery(() => props.quote.showtimeId, { poll: false })
const context = computed(() => query.data.value)
function showSummary() {
  document.getElementById('booking-checkout-summary')?.scrollIntoView({
    block: 'start',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
</script>
<template>
  <div class="booking-checkout-recap" aria-label="Tóm tắt thanh toán">
    <div>
      <strong>{{ context?.movie.title || 'Thông tin đặt vé' }}</strong
      ><span v-if="context"
        >{{ context.cinema.name
        }}<template v-if="context.showtime.startsAt">
          · {{ formatCinemaTime(context.showtime.startsAt) }},
          {{ formatCinemaDateKey(getCinemaDateKey(context.showtime.startsAt)) }}</template
        ></span
      ><span>Ghế: {{ quote.seats.map((seat) => seat.seatNumber).join(', ') }}</span
      ><button class="booking-checkout-recap__link" type="button" @click="showSummary">
        Xem tóm tắt
      </button>
    </div>
    <div>
      <strong>{{ formatBookingMoney(quote.totalMinor) }}</strong
      ><AppButton size="sm" @click="showSummary">Xem tổng tiền</AppButton>
    </div>
  </div>
</template>
<style scoped>
@reference '../../../styles/main.css';
.booking-checkout-recap {
  display: none;
}
@variant lumiere-mobile {
  .booking-checkout-recap {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: var(--z-header);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
    background: var(--color-surface);
    border-top: var(--border-width-thin) solid var(--color-border);
    box-shadow: var(--shadow-card);
  }
  .booking-checkout-recap > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: start;
  }
  .booking-checkout-recap > div:last-child {
    flex-shrink: 0;
    align-items: end;
    gap: var(--space-2);
  }
  .booking-checkout-recap strong {
    display: block;
    max-width: 100%;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .booking-checkout-recap > div:last-child > strong {
    font-size: var(--font-size-lg);
    color: var(--lumiere-orange-dark);
  }
  .booking-checkout-recap span {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: var(--lumiere-caption-size);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
  }
  .booking-checkout-recap__link {
    color: var(--lumiere-orange-dark);
    font-size: var(--lumiere-caption-size);
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .booking-checkout-recap__link:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-focus);
    outline-offset: var(--space-1);
  }
}
</style>
