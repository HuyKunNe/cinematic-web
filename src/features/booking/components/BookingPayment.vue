<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { CreditCard, Wallet } from 'lucide-vue-next'
import { RouterLink, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useBookingFlowStore } from '../stores/booking-flow.store'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { CustomerBooking } from '../api/customer-bookings'
import type { PaymentCheckoutResponseStatus } from '@/services/api/generated/payment-service/model/paymentCheckoutResponseStatus'
import {
  checkoutLink,
  customerPaymentLabels,
  useCustomerPaymentQuery,
} from '../api/customer-payment'

const props = defineProps<{
  booking: CustomerBooking
  disabled: boolean
  resultOnly?: boolean
  processing?: boolean
  compact?: boolean
}>()
const emit = defineEmits<{
  refresh: []
  paymentStatus: [status: PaymentCheckoutResponseStatus | undefined]
  paymentChecked: [value: boolean]
}>()
const auth = useAuthStore()
const flow = useBookingFlowStore()
const route = useRoute()
const agreed = ref(false)
const handoffError = ref('')
const refreshingPayment = ref(false)
let active = true
onBeforeUnmount(() => {
  active = false
})
const hasPaymentIntent = computed(
  () =>
    auth.isAuthenticated &&
    flow.paymentIntent?.owner === auth.subject &&
    flow.paymentIntent.bookingId === props.booking.id,
)
watch(
  hasPaymentIntent,
  (value) => {
    if (value) agreed.value = true
  },
  { immediate: true },
)
watch(agreed, (value) => {
  if (!value && auth.subject) flow.consumePayment(auth.subject, props.booking.id)
})
onBeforeRouteLeave(() => {
  if (auth.subject) flow.consumePayment(auth.subject, props.booking.id)
})
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
const query = useCustomerPaymentQuery(
  () => props.booking.id,
  () =>
    props.booking.userId === auth.subject &&
    props.booking.status !== 'PENDING' &&
    props.booking.status !== 'REJECTED',
  () => props.booking.status === 'RESERVED',
)
const payment = computed(() =>
  props.booking.userId === auth.subject ? query.data.value : undefined,
)
const validLink = computed(() => checkoutLink(payment.value?.checkoutUri))
const holdDeadlineReached = computed(() => {
  if (props.booking.status !== 'RESERVED') return false
  const deadlines = [props.booking.expiresAt, payment.value?.holdExpiresAt]
    .map((value) => Date.parse(value ?? ''))
    .filter(Number.isFinite)
  return deadlines.length > 0 && Math.min(...deadlines) <= now.value.getTime()
})
const showPaymentConsent = computed(
  () =>
    props.booking.status === 'RESERVED' &&
    !holdDeadlineReached.value &&
    !props.resultOnly &&
    !query.isError.value &&
    (!payment.value ||
      ['RECEIVED', 'PROCESSING', 'PENDING_PROVIDER'].includes(payment.value.status)) &&
    (!props.processing || processingNeedsAction.value),
)
watch(
  () =>
    [
      payment.value?.status,
      query.isFetchedAfterMount.value,
      query.isSuccess.value,
      query.isFetching.value,
      query.isError.value,
    ] as const,
  () => {
    emit(
      'paymentChecked',
      query.isFetchedAfterMount.value &&
        query.isSuccess.value &&
        !query.isFetching.value &&
        !query.isError.value &&
        props.booking.userId === auth.subject,
    )
    if (query.isError.value || !payment.value) emit('paymentStatus', undefined)
    else if (query.isFetchedAfterMount.value && query.isSuccess.value && !query.isFetching.value) {
      if (
        auth.subject &&
        ['SUCCEEDED', 'FAILED', 'EXPIRED', 'RECONCILIATION_REQUIRED'].includes(payment.value.status)
      )
        flow.consumePayment(auth.subject, props.booking.id)
      emit('paymentStatus', payment.value.status)
    }
  },
  { immediate: true },
)
const canPay = computed(
  () =>
    !props.resultOnly &&
    agreed.value &&
    auth.isAuthenticated &&
    !props.disabled &&
    !refreshingPayment.value &&
    !query.isError.value &&
    query.isFetchedAfterMount.value &&
    !query.isFetching.value &&
    props.booking.status === 'RESERVED' &&
    payment.value?.status === 'PENDING_PROVIDER' &&
    Math.min(Date.parse(props.booking.expiresAt), Date.parse(payment.value.holdExpiresAt)) >
      now.value.getTime() &&
    !!validLink.value,
)
const processingNeedsAction = computed(
  () =>
    !!props.processing &&
    (query.isError.value ||
      holdDeadlineReached.value ||
      !!handoffError.value ||
      (payment.value?.status === 'PENDING_PROVIDER' &&
        (!hasPaymentIntent.value || !validLink.value))),
)
const message = computed(() => {
  if (props.booking.status === 'PENDING')
    return 'Đang chờ xác nhận giữ ghế trước khi chuẩn bị thanh toán.'
  if (payment.value?.status === 'RECONCILIATION_REQUIRED')
    return 'Chưa xác định được kết quả. Không thanh toán lại hoặc tạo đơn mới; hãy kiểm tra trạng thái đơn.'
  if (payment.value?.status === 'SUCCEEDED' && props.booking.status !== 'CONFIRMED')
    return props.booking.status === 'RESERVED'
      ? 'Thanh toán đã thành công. Đang chờ hệ thống xác nhận đơn đặt vé; chưa phát hành vé tại bước này.'
      : 'Đã ghi nhận thanh toán nhưng đơn chưa được xác nhận. Vui lòng liên hệ rạp để kiểm tra.'
  if (['CANCELLED', 'EXPIRED', 'REJECTED'].includes(props.booking.status))
    return 'Đơn này không còn nhận thanh toán.'
  if (props.booking.status === 'CONFIRMED')
    return 'Đơn đã được xác nhận. Thông tin suất và ghế được lưu bên cạnh.'
  if (payment.value?.status === 'FAILED' || props.booking.status === 'PAYMENT_FAILED')
    return 'Thanh toán chưa thành công. Kiểm tra trạng thái đơn trước khi đặt lại.'
  if (payment.value?.status === 'EXPIRED')
    return 'Đã hết thời gian thanh toán. Kiểm tra trạng thái đơn để biết kết quả giải phóng ghế.'
  if (holdDeadlineReached.value)
    return 'Đã đến hạn giữ ghế hoặc phiên thanh toán. Vui lòng kiểm tra kết quả đơn trước khi tiếp tục.'
  if (payment.value?.status === 'PENDING_PROVIDER' && !validLink.value)
    return 'Cổng thanh toán chưa cung cấp liên kết hợp lệ. Vui lòng kiểm tra lại sau.'
  if (payment.value?.status === 'PENDING_PROVIDER')
    return 'Tiếp tục tại cổng thanh toán. Sau khi hoàn tất, quay lại trang này và kiểm tra kết quả.'
  return 'Hệ thống đang chuẩn bị phiên thanh toán. Trang sẽ tự cập nhật khi có kết quả.'
})
const showManualCheck = computed(
  () =>
    query.isError.value ||
    !!handoffError.value ||
    (payment.value?.status === 'PENDING_PROVIDER' && !validLink.value) ||
    payment.value?.status === 'RECONCILIATION_REQUIRED' ||
    (payment.value?.status === 'SUCCEEDED' && props.booking.status !== 'CONFIRMED') ||
    holdDeadlineReached.value,
)
async function refresh() {
  const owner = auth.subject
  const bookingId = props.booking.id
  if (
    !active ||
    refreshingPayment.value ||
    props.disabled ||
    !auth.isAuthenticated ||
    !owner ||
    props.booking.userId !== owner
  )
    return
  refreshingPayment.value = true
  try {
    await query.refetch({ cancelRefetch: false })
    if (
      active &&
      auth.isAuthenticated &&
      auth.subject === owner &&
      props.booking.userId === owner &&
      props.booking.id === bookingId
    )
      emit('refresh')
  } finally {
    refreshingPayment.value = false
  }
}
function pay() {
  if (canPay.value && validLink.value) {
    handoffError.value = ''
    if (auth.subject) flow.consumePayment(auth.subject, props.booking.id)
    try {
      window.location.assign(validLink.value)
    } catch {
      handoffError.value =
        'Chưa thể mở cổng thanh toán. Vui lòng bấm tiếp tục thanh toán để thử lại.'
    }
  }
}
watch(
  canPay,
  (value) => {
    if (value && hasPaymentIntent.value) pay()
  },
  { immediate: true },
)
</script>

<template>
  <section
    class="booking-payment"
    :class="{ 'booking-payment--processing': processing }"
    aria-labelledby="booking-payment-title"
  >
    <h3 id="booking-payment-title" :class="{ 'sr-only': resultOnly || processing }">
      {{ resultOnly ? 'Trạng thái thanh toán' : 'Phương thức thanh toán' }}
    </h3>
    <div
      v-if="booking.paymentProvider && !resultOnly && !processing"
      class="booking-payment__provider"
    >
      <Wallet v-if="booking.paymentProvider === 'MOMO'" aria-hidden="true" /><CreditCard
        v-else
        aria-hidden="true"
      />
      <div>
        <strong>{{ booking.paymentProvider === 'MOMO' ? 'Ví MoMo' : 'VNPAY' }}</strong
        ><small>Phương thức đã chọn khi xác nhận đặt vé</small>
      </div>
    </div>
    <p
      v-if="query.isPending.value && booking.status === 'RESERVED' && !processing"
      class="booking-note"
      role="status"
    >
      Đang tải phiên thanh toán…
    </p>
    <p
      v-if="payment && !processing && !query.isError.value"
      class="booking-payment__status"
      role="status"
    >
      {{ customerPaymentLabels[payment.status] }}
    </p>
    <p
      v-if="!query.isError.value && (!processing || processingNeedsAction)"
      class="booking-note"
      role="status"
    >
      {{ message }}
    </p>
    <p v-if="handoffError" class="booking-error" role="alert">{{ handoffError }}</p>
    <p v-if="query.isError.value" class="booking-error" role="alert">Vui lòng thử lại.</p>
    <label v-if="showPaymentConsent" class="booking-payment__consent">
      <input v-model="agreed" type="checkbox" :disabled="disabled" />
      <span
        >Tôi đã kiểm tra phim, suất chiếu, ghế, điều kiện độ tuổi và tổng tiền trước khi thanh
        toán.</span
      >
    </label>
    <div v-if="!processing || processingNeedsAction" class="booking-payment__actions">
      <AppButton
        v-if="
          !resultOnly &&
          !holdDeadlineReached &&
          validLink &&
          payment?.status === 'PENDING_PROVIDER' &&
          booking.status === 'RESERVED'
        "
        :disabled="!canPay"
        @click="pay"
        >Tiếp tục thanh toán →</AppButton
      >
      <AppButton
        v-if="showManualCheck && booking.status !== 'PENDING' && booking.status !== 'REJECTED'"
        :variant="resultOnly ? 'primary' : 'secondary'"
        :disabled="disabled"
        :loading="refreshingPayment"
        @click="refresh"
        >{{
          query.isError.value ? 'Thử lại' : compact ? 'Kiểm tra kết quả' : 'Kiểm tra thanh toán'
        }}</AppButton
      >
      <RouterLink
        v-if="
          !resultOnly &&
          !compact &&
          booking.status === 'RESERVED' &&
          route.name !== ROUTE_NAMES.BOOKING_CHECKOUT
        "
        :to="{ name: ROUTE_NAMES.BOOKING_CHECKOUT, params: { bookingId: booking.id } }"
        class="customer-bookings__link"
        >Thông tin thanh toán</RouterLink
      >
    </div>
  </section>
</template>

<style scoped>
.booking-payment__provider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-surface-hover);
}
.booking-payment__provider svg {
  width: var(--icon-size-lg);
  height: var(--icon-size-lg);
  flex-shrink: 0;
  color: var(--color-primary);
}
.booking-payment__provider strong {
  font-size: var(--font-size-sm);
}
.booking-payment__provider small {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.booking-payment {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: var(--border-width-thin) solid var(--color-border);
}
.booking-payment h3,
.booking-payment p {
  margin: 0;
}
.booking-payment h3 {
  font-size: var(--font-size-lg);
}
.booking-payment__status {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.booking-payment__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
.booking-payment__consent {
  display: flex;
  align-items: start;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}
.booking-payment__consent input {
  margin-top: var(--space-1);
  accent-color: var(--color-primary);
  flex-shrink: 0;
}
.booking-payment__consent input:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
.booking-payment.booking-payment--processing {
  max-width: var(--journey-copy-width);
  margin: var(--space-5) auto 0;
  padding: 0;
  border: 0;
  text-align: center;
}
.booking-payment--processing .booking-payment__actions {
  justify-content: center;
}
</style>
