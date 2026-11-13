<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useSessionStorage } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import { z } from 'zod'
import { CreateBookingRequestPaymentProvider } from '@/services/api/generated/booking-service/model/createBookingRequestPaymentProvider'
import { CreditCard, Wallet } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'
import { submitCustomerBooking, customerBookingError } from '../api/customer-bookings'
import { useBookingSelection } from '../composables/use-booking-selection'
import { useBookingFlowStore } from '../stores/booking-flow.store'
import type { BookingReview } from '../models/booking-review.model'
import { bookingSeatQuoteErrorMessage } from '../api/booking-seat-quote'
import { formatBookingMoney } from '../mappers/booking-seat.mapper'
import { appEnv } from '@/config/env'

const props = defineProps<{
  page?: boolean
  review?: BookingReview
  prepareReview?: () => Promise<BookingReview | undefined>
  selectionError?: string
  showtimeId: string
  seatNumbers: string[]
  totalAmount?: number
  disabled: boolean
}>()
const emit = defineEmits<{ locked: [value: boolean]; rejected: []; processing: [value: boolean] }>()
const auth = useAuthStore()
const owner = auth.subject ?? ''
const router = useRouter()
const queries = useQueryClient()
const selection = useBookingSelection(props.showtimeId)
const flow = useBookingFlowStore()
const storageKey = `cinematic:booking-request:${owner}:${props.showtimeId}`
// Save only the idempotent request so refresh/network retries cannot create another order.
const requestBaseSchema = z.object({
  paymentProvider: z.nativeEnum(CreateBookingRequestPaymentProvider).optional(),
  clientRequestId: z.string().uuid(),
  showtimeId: z.literal(props.showtimeId),
  expectedTotalAmount: z.number().finite().nonnegative(),
})
// Keep legacy pending requests unchanged; new orders retain the quoted ticket groups.
const requestSchema = z.union([
  requestBaseSchema.extend({
    seats: z
      .array(
        z.object({
          seatNumber: z.string().min(1).max(20),
          ticketGroupId: z.string().uuid(),
        }),
      )
      .min(1)
      .max(100),
    seatNumbers: z.undefined(),
  }),
  requestBaseSchema.extend({
    seatNumbers: z.array(z.string().min(1).max(20)).min(1).max(100),
    seats: z.undefined(),
  }),
])
const stored = useSessionStorage(storageKey, '')
const checkpoint = computed(() => {
  try {
    return requestSchema.parse(JSON.parse(stored.value))
  } catch {
    return null
  }
})
const sending = ref(false)
const resolved = ref(false)
const resolvedBookingId = ref('')
const error = ref('')
const reviewing = ref(false)
const checking = ref(false)
const reviewed = ref<BookingReview | null>(null)
// BACKEND_DEFAULT is a UI choice, never a generated request enum value.
const paymentProvider = ref<CreateBookingRequestPaymentProvider | 'BACKEND_DEFAULT' | undefined>(
  appEnv.mockPaymentEnabled ? 'BACKEND_DEFAULT' : undefined,
)
const providerOptions = [
  ...Object.values(CreateBookingRequestPaymentProvider).map((value) => ({
    value,
    label: value === 'MOMO' ? 'Ví MoMo' : 'VNPAY',
    description: 'Thanh toán tại cổng bảo mật của nhà cung cấp',
  })),
  ...(appEnv.mockPaymentEnabled
    ? [
        {
          value: 'BACKEND_DEFAULT' as const,
          label: 'Mock provider · Test',
          description: 'Dùng provider mặc định của BE. BE cần cấu hình PAYMENT_PROVIDER=MOCK.',
        },
      ]
    : []),
]
const agreed = ref(false)
let active = true
onBeforeUnmount(() => {
  active = false
})
const fingerprint = (value: BookingReview | null | undefined) => JSON.stringify(value)
const paymentLabel = computed(() =>
  props.review
    ? `Thanh toán · ${formatBookingMoney(props.review.totalMinor)}`
    : 'Xác nhận và thanh toán',
)
async function continueBooking() {
  if (!props.page) {
    if (checking.value || sending.value || resolved.value || (!checkpoint.value && props.disabled))
      return
    error.value = ''
    checking.value = true
    try {
      if (!checkpoint.value) selection.save(props.seatNumbers)
      const failure = await router.push({
        name: ROUTE_NAMES.BOOKING_REVIEW,
        query: { showtimeId: props.showtimeId },
      })
      if (failure) error.value = 'Chưa thể mở trang thanh toán. Vui lòng thử lại.'
    } catch {
      error.value = 'Chưa thể mở trang thanh toán. Vui lòng thử lại.'
    } finally {
      checking.value = false
    }
    return
  }
  if (checkpoint.value) {
    void submit()
    return
  }
  if (
    props.disabled ||
    checking.value ||
    sending.value ||
    resolved.value ||
    !paymentProvider.value ||
    !agreed.value
  )
    return
  error.value = ''
  checking.value = true
  try {
    if (!props.prepareReview) return
    const current = await props.prepareReview()
    await nextTick()
    if (!active) return
    if (!current || props.disabled || fingerprint(props.review) !== fingerprint(current)) {
      error.value = 'Ghế đã thay đổi. Vui lòng kiểm tra lại trước khi tiếp tục.'
      return
    }
    reviewed.value = current
    reviewing.value = true
    await submit()
  } catch (cause) {
    error.value = bookingSeatQuoteErrorMessage(cause)
  } finally {
    checking.value = false
  }
}
function invalidateReview() {
  if (!reviewing.value) return
  reviewing.value = false
  reviewed.value = null
  error.value = 'Ghế hoặc báo giá đã thay đổi. Vui lòng kiểm tra lại đơn trước khi xác nhận.'
}
watch(
  () => props.selectionError,
  (message) => {
    if (!message || !reviewing.value) return
    reviewing.value = false
    reviewed.value = null
    error.value = message
  },
)
watch(
  () => props.review,
  (current) => {
    if (current && fingerprint(current) !== fingerprint(reviewed.value)) invalidateReview()
  },
)
watch(() => props.seatNumbers.slice().sort().join('|'), invalidateReview)
const blocked = computed(() => sending.value || !!checkpoint.value || resolved.value)
const processing = computed(() => !!props.page && (checking.value || sending.value || (resolved.value && !error.value)))
watch(processing, (value) => emit('processing', value), { immediate: true, flush: 'sync' })
onBeforeRouteLeave(() => !sending.value || resolved.value)
onBeforeRouteUpdate(() => !sending.value || resolved.value)
watch(blocked, (value) => emit('locked', value), { immediate: true, flush: 'sync' })
async function submit() {
  if (
    !active ||
    sending.value ||
    resolved.value ||
    !owner ||
    !auth.isAuthenticated ||
    auth.subject !== owner
  )
    return
  if (!checkpoint.value) {
    if (
      props.disabled ||
      !props.seatNumbers.length ||
      props.totalAmount === undefined ||
      !paymentProvider.value
    )
      return
    if (
      !reviewing.value ||
      !props.review ||
      fingerprint(props.review) !== fingerprint(reviewed.value)
    )
      return
    const request = requestSchema.parse({
      clientRequestId: crypto.randomUUID(),
      showtimeId: props.showtimeId,
      seats: props.review.seats
        .map((seat) => ({
          seatNumber: seat.seatNumber,
          ticketGroupId: seat.ticketGroupId,
        }))
        .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)),
      expectedTotalAmount: props.totalAmount,
      paymentProvider:
        paymentProvider.value === 'BACKEND_DEFAULT' ? undefined : paymentProvider.value,
    })
    stored.value = JSON.stringify(request)
  }
  const request = checkpoint.value
  if (!request) return
  reviewing.value = false
  sending.value = true
  error.value = ''
  try {
    const booking = await submitCustomerBooking(request, owner)
    if (!active || !auth.isAuthenticated || auth.subject !== owner) return
    resolved.value = true
    resolvedBookingId.value = booking.id
    stored.value = ''
    queries.setQueryData(['customer-bookings', owner, 'detail', booking.id], booking)
    await queries.invalidateQueries({ queryKey: ['customer-bookings', owner], refetchType: 'none' })
    if (!active || !auth.isAuthenticated || auth.subject !== owner) return
    if (props.page && agreed.value && paymentProvider.value !== 'BACKEND_DEFAULT')
      flow.requestPayment(owner, booking.id)
    const failure = await router.push({
      name: ROUTE_NAMES.BOOKING_PROCESSING,
      params: { bookingId: booking.id },
    })
    if (failure) {
      flow.consumePayment(owner, booking.id)
      error.value = 'Đơn đã được tiếp nhận. Mở chi tiết đơn để theo dõi kết quả giữ ghế.'
    }
  } catch (cause) {
    if (resolved.value) {
      flow.consumePayment(owner, resolvedBookingId.value)
      error.value = 'Đơn đã tạo. Mở Vé của tôi để xem kết quả.'
    } else {
      const status = (cause as { status?: number })?.status
      // Only definite validation rejections release the request. Unknown outcomes keep the same key.
      if (status && [400, 403, 404, 422].includes(status)) {
        stored.value = ''
        emit('rejected')
      }
      error.value = checkpoint.value
        ? 'Chưa xác nhận được kết quả. Gửi lại cùng yêu cầu hoặc kiểm tra Vé của tôi; không đặt lại bằng yêu cầu mới.'
        : customerBookingError(cause)
    }
  } finally {
    sending.value = false
  }
}
defineExpose({ continueBooking })
</script>

<template>
  <div class="booking-checkout">
    <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
    <p v-else-if="checkpoint" class="booking-notice" role="status">
      Có yêu cầu đặt vé cần xác nhận kết quả. Lựa chọn đã khóa để tránh tạo trùng đơn.
    </p>
    <template v-if="page && checkpoint">
      <p class="booking-note">
        Ghế trong yêu cầu đã gửi:
        {{
          (checkpoint.seats?.map((seat) => seat.seatNumber) ?? checkpoint.seatNumbers ?? []).join(
            ', ',
          )
        }}<template v-if="checkpoint.paymentProvider">
          · {{ checkpoint.paymentProvider === 'MOMO' ? 'Ví MoMo' : 'VNPAY' }}</template
        >
      </p>
      <AppLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
        >Kiểm tra vé &amp; giao dịch trước khi đặt lại</AppLink
      >
    </template>
    <template v-if="page && !checkpoint && !resolved">
      <fieldset class="booking-checkout__providers" :disabled="sending || checking">
        <legend>Phương thức thanh toán</legend>
        <label
          v-for="provider in providerOptions"
          :key="provider.value"
          :data-selected="paymentProvider === provider.value"
          ><input
            v-model="paymentProvider"
            type="radio"
            name="checkout-payment-provider"
            :value="provider.value"
          /><Wallet v-if="provider.value === 'MOMO'" aria-hidden="true" /><CreditCard
            v-else
            aria-hidden="true"
          /><span
            ><strong>{{ provider.label }}</strong
            ><small>{{ provider.description }}</small></span
          ></label
        >
      </fieldset>
      <label class="booking-checkout__consent"
        ><input v-model="agreed" type="checkbox" :disabled="sending || checking" /><span
          >Tôi xác nhận phim, suất, ghế, điều kiện độ tuổi và tổng tiền trước khi thanh toán.</span
        ></label
      >
    </template>
    <AppButton
      v-if="!resolved"
      :loading="sending || checking"
      :disabled="
        sending ||
        checking ||
        (!checkpoint && (disabled || (page && (!paymentProvider || !agreed))))
      "
      :aria-describedby="selectionError ? 'booking-selection-error' : undefined"
      @click="continueBooking"
      >{{ page ? (checkpoint ? 'Gửi lại cùng yêu cầu' : paymentLabel) : 'Tiếp tục' }}</AppButton
    >
    <AppLink
      v-if="resolvedBookingId"
      :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: resolvedBookingId } }"
    >
      Theo dõi đơn vừa tạo
    </AppLink>
  </div>
</template>

<style scoped>
.booking-checkout {
  --booking-checkout-option-padding: 0.875rem;
  --booking-checkout-option-selected: #fff4ed;
  --booking-checkout-option-icon: 1.125rem;
  --booking-checkout-option-icon-color: #a08e6a;
  --booking-checkout-consent-size: 0.6875rem;
  --booking-checkout-consent-line-height: 1.8;
}
.booking-checkout__providers {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
}
.booking-checkout__providers legend {
  margin-bottom: var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.booking-checkout__providers label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--booking-checkout-option-padding);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
}
.booking-checkout__providers label[data-selected='true'] {
  border-color: var(--color-primary);
  background: var(--booking-checkout-option-selected);
}
.booking-checkout__providers label > svg {
  width: var(--booking-checkout-option-icon);
  height: var(--booking-checkout-option-icon);
  color: var(--booking-checkout-option-icon-color);
  flex-shrink: 0;
}
.booking-checkout__providers small {
  display: block;
  font-size: var(--lumiere-caption-size);
  color: var(--color-text-secondary);
}
.booking-checkout__consent {
  display: flex;
  align-items: start;
  gap: var(--space-3);
  margin-block: var(--space-4);
  font-size: var(--booking-checkout-consent-size);
  line-height: var(--booking-checkout-consent-line-height);
}
.booking-checkout input {
  accent-color: var(--color-primary);
  flex-shrink: 0;
}
.booking-checkout input:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
.booking-checkout {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
