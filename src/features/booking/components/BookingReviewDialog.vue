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
import { CreateBookingRequestPaymentProvider } from '@/services/api/generated/booking-service/model/createBookingRequestPaymentProvider'

defineProps<{
  open: boolean
  review: BookingReview | null
  disabled: boolean
  paymentProvider?: CreateBookingRequestPaymentProvider
}>()
const emit = defineEmits<{
  close: []
  confirm: []
  'update:paymentProvider': [value: CreateBookingRequestPaymentProvider]
}>()
</script>

<template>
  <DialogRoot :open="open" @update:open="!$event && emit('close')">
    <DialogPortal>
      <DialogOverlay class="booking-review__overlay" />
      <DialogContent class="booking-review">
        <DialogTitle class="booking-review__title">Kiểm tra đơn đặt vé</DialogTitle>

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

        <fieldset class="booking-review__providers" :disabled="disabled">
          <legend>Phương thức thanh toán</legend>
          <label
            v-for="provider in CreateBookingRequestPaymentProvider"
            :key="provider"
            :data-selected="paymentProvider === provider"
          >
            <input
              type="radio"
              name="booking-payment-provider"
              :value="provider"
              :checked="paymentProvider === provider"
              @change="emit('update:paymentProvider', provider)"
            />
            <span
              >{{ provider === 'MOMO' ? 'Ví MoMo' : 'VNPAY'
              }}<small>Tiếp tục tại cổng thanh toán sau khi giữ ghế</small></span
            >
          </label>
        </fieldset>
        <p v-if="disabled" class="booking-note" role="status">Đang kiểm tra lại ghế và báo giá…</p>
        <div class="booking-review__actions">
          <DialogClose as-child>
            <AppButton variant="secondary">Quay lại chọn ghế</AppButton>
          </DialogClose>
          <AppButton :disabled="disabled || !review || !paymentProvider" @click="emit('confirm')"
            >Xác nhận đặt vé</AppButton
          >
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.booking-review__providers {
  display: grid;
  gap: var(--space-3);
  border: 0;
  margin: 0;
  padding: 0;
}
.booking-review__providers legend {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-3);
}
.booking-review__providers label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.booking-review__providers label[data-selected='true'] {
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}
.booking-review__providers small {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.booking-review__providers input {
  accent-color: var(--color-primary);
}
.booking-review__providers input:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
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
