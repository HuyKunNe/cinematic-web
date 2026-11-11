<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import { formatBookingMoney } from '../mappers/booking-seat.mapper'
import type { BookingReview } from '../models/booking-review.model'

defineProps<{ open: boolean; review: BookingReview | null; disabled: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <DialogRoot :open="open" @update:open="!$event && emit('close')">
    <DialogPortal>
      <DialogOverlay class="booking-review__overlay" />
      <DialogContent class="booking-review">
        <DialogTitle class="booking-review__title">Kiểm tra đơn đặt vé</DialogTitle>
        <DialogDescription class="booking-review__description">
          Kiểm tra suất chiếu, ghế và giá trước khi gửi yêu cầu giữ ghế.
        </DialogDescription>
        <template v-if="review">
          <section class="booking-review__context" aria-label="Thông tin suất chiếu">
            <h3>{{ review.movieTitle }}</h3>
            <p>{{ review.cinemaName }} · {{ review.roomName }}</p>
            <p>{{ review.showtimeLabel }}</p>
          </section>
          <ul class="booking-review__seats" aria-label="Chi tiết báo giá vé">
            <li v-for="seat in review.seats" :key="seat.seatNumber">
              <div>
                <strong>Ghế {{ seat.seatNumber }}</strong>
                <span>{{ seat.typeLabel }} · {{ seat.ticketGroupName }}</span>
                <span>{{ seat.capacity }} khách / {{ seat.unit === 'PAIR' ? 'cặp' : 'ghế' }}</span>
              </div>
              <strong>{{ formatBookingMoney(seat.priceMinor) }}</strong>
            </li>
          </ul>
          <div class="booking-review__total">
            <span>Tổng tiền theo báo giá</span>
            <strong>{{ formatBookingMoney(review.totalMinor) }}</strong>
          </div>
        </template>
        <p class="booking-review__description">
          Sau khi gửi, hệ thống sẽ kiểm tra và giữ ghế. Chỉ khi nhận được trạng thái xác nhận từ hệ
          thống, yêu cầu mới được coi là thành công.
        </p>
        <p v-if="disabled" class="booking-note" role="status">Đang kiểm tra lại ghế và báo giá…</p>
        <div class="booking-review__actions">
          <DialogClose as-child>
            <AppButton variant="secondary">Quay lại chọn ghế</AppButton>
          </DialogClose>
          <AppButton :disabled="disabled || !review" @click="emit('confirm')"
            >Xác nhận đặt vé</AppButton
          >
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.booking-review__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-overlay);
}
.booking-review {
  --booking-review-width: 36rem;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: calc(var(--z-modal) + 1);
  display: grid;
  gap: var(--space-4);
  box-sizing: border-box;
  width: min(var(--booking-review-width), calc(100vw - var(--space-8)));
  max-height: calc(100dvh - var(--space-8));
  overflow-y: auto;
  padding: var(--space-6);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-raised);
}
.booking-review__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}
.booking-review__description {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.booking-review__context {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
.booking-review__context h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-lg);
}
.booking-review__context p {
  margin: var(--space-1) 0;
  font-size: var(--font-size-sm);
}
.booking-review__seats {
  list-style: none;
  padding: 0;
  margin: 0;
}
.booking-review__seats li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-bottom: var(--border-width-thin) solid var(--color-border);
}
.booking-review__seats li > div {
  display: grid;
  gap: var(--space-1);
}
.booking-review__seats span {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.booking-review__total {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-weight: var(--font-weight-bold);
}
.booking-review__total strong {
  color: var(--color-primary);
  font-size: var(--font-size-xl);
}
.booking-review__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
