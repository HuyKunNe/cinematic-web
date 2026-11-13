<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Check, Clock3, CircleAlert, Ticket, Printer, ArrowRight } from 'lucide-vue-next'
import { useIntervalFn, useNow } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BookingProgress from '../components/BookingProgress.vue'
import BookingShowtimeSummary from '../components/BookingShowtimeSummary.vue'
import BookingConfirmedTicket from '../components/BookingConfirmedTicket.vue'
import BookingPayment from '../components/BookingPayment.vue'
import BookingProcessing from '../components/BookingProcessing.vue'
import BookingJourneySummary from '../components/BookingJourneySummary.vue'
import BookingSavedSeats from '../components/BookingSavedSeats.vue'
import type { PaymentCheckoutResponseStatus } from '@/services/api/generated/payment-service/model/paymentCheckoutResponseStatus'
import {
  customerBookingId,
  customerBookingError,
  customerBookingLabels,
  useCustomerBookingQuery,
  type CustomerBooking,
} from '../api/customer-bookings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() =>
  typeof route.params.bookingId === 'string' ? route.params.bookingId.toLowerCase() : '',
)
const valid = computed(() => customerBookingId.safeParse(id.value).success)
const query = useCustomerBookingQuery(id)
const booking = computed(() =>
  auth.isAuthenticated && query.data.value?.userId === auth.subject ? query.data.value : undefined,
)
const checkout = computed(() => route.name === ROUTE_NAMES.BOOKING_CHECKOUT)
const processing = computed(() => route.name === ROUTE_NAMES.BOOKING_PROCESSING)
const ticket = computed(() => route.name === ROUTE_NAMES.BOOKING_TICKET)
const paymentStatus = ref<PaymentCheckoutResponseStatus>()
const paymentHasResult = computed(
  () =>
    paymentStatus.value !== undefined &&
    ['SUCCEEDED', 'FAILED', 'EXPIRED', 'RECONCILIATION_REQUIRED'].includes(paymentStatus.value),
)
const navigationError = ref('')
let redirecting = false
watch(id, () => {
  paymentStatus.value = undefined
  navigationError.value = ''
})
const titles: Record<CustomerBooking['status'], string> = {
  PENDING: 'Đang xác nhận giữ ghế',
  RESERVED: 'Đang kiểm tra kết quả thanh toán',
  CONFIRMED: 'Hẹn bạn tại rạp!',
  REJECTED: 'Chưa thể giữ ghế cho bạn',
  PAYMENT_FAILED: 'Thanh toán chưa thành công',
  CANCELLED: 'Đơn đặt vé đã được hủy',
  EXPIRED: 'Đã hết thời gian giữ ghế',
}
const resultTitle = computed(() => {
  if (booking.value?.status === 'CONFIRMED') return titles.CONFIRMED
  if (booking.value && ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.value.status))
    return titles[booking.value.status]
  if (paymentStatus.value === 'RECONCILIATION_REQUIRED') return 'Chưa xác định kết quả thanh toán'
  if (paymentStatus.value === 'SUCCEEDED')
    return booking.value && ['PENDING', 'RESERVED'].includes(booking.value.status)
      ? 'Thanh toán thành công, đang xác nhận vé'
      : 'Thanh toán đã được ghi nhận, cần kiểm tra đơn'
  if (paymentStatus.value === 'FAILED') return 'Thanh toán chưa thành công'
  if (paymentStatus.value === 'EXPIRED') return 'Đã hết thời gian thanh toán'
  return booking.value ? titles[booking.value.status] : ''
})
const description = computed(() => {
  if (booking.value?.status !== 'CONFIRMED' && paymentStatus.value === 'RECONCILIATION_REQUIRED')
    return 'Chưa có xác nhận kết quả cuối cùng. Kiểm tra trạng thái đơn trước khi thực hiện thanh toán khác.'
  if (
    booking.value &&
    ['PENDING', 'RESERVED'].includes(booking.value.status) &&
    paymentStatus.value === 'SUCCEEDED'
  )
    return 'Hệ thống đã ghi nhận thanh toán và đang xác nhận đơn. Thông tin vé chỉ mở khi booking được xác nhận.'
  switch (booking.value?.status) {
    case 'CONFIRMED':
      return 'Đơn đặt vé đã được xác nhận. Bạn có thể xem lại thông tin vé bên dưới.'
    case 'RESERVED':
      return 'Chưa có xác nhận hoàn tất đơn. Kiểm tra thanh toán trước khi thực hiện thêm giao dịch.'
    case 'PENDING':
      return 'Yêu cầu đã được tiếp nhận. Trang tự cập nhật khi hệ thống xác nhận ghế và giá.'
    case 'REJECTED':
      return 'Yêu cầu giữ ghế không thành công. Bạn có thể chọn lại suất chiếu.'
    case 'PAYMENT_FAILED':
      return 'Chưa có vé được xác nhận. Kiểm tra kết quả thanh toán và đơn trước khi đặt lại.'
    case 'CANCELLED':
      return 'Đơn đã được hủy. Bạn có thể bắt đầu một cuộc hẹn mới.'
    case 'EXPIRED':
      return 'Đơn đã hết hạn giữ ghế. Bạn có thể chọn lại suất và ghế.'
    default:
      return ''
  }
})
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
const remaining = computed(() => {
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(booking.value?.expiresAt ?? '') - now.value.getTime()) / 1000),
  )
  return Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    : '—'
})
function money(value: number | null, currency: string | null) {
  return value === null || !currency
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value)
}
function printTicket() {
  if (booking.value?.status === 'CONFIRMED' && query.isSuccess.value && !query.isError.value)
    window.print()
}
// Booking status is authoritative; URL query flags never confirm a payment or issue a ticket.
async function showResult() {
  if (redirecting || navigationError.value) return
  const bookingId = id.value
  redirecting = true
  navigationError.value = ''
  try {
    const failure = await router.replace({
      name: ROUTE_NAMES.BOOKING_RESULT,
      params: { bookingId },
    })
    if (failure && id.value === bookingId)
      navigationError.value = 'Chưa thể mở trang kết quả. Bạn có thể mở bằng liên kết bên dưới.'
  } catch {
    if (id.value === bookingId)
      navigationError.value = 'Chưa thể mở trang kết quả. Bạn có thể mở bằng liên kết bên dưới.'
  } finally {
    redirecting = false
  }
}
watch(
  () =>
    [
      route.name,
      booking.value?.status,
      query.isSuccess.value,
      query.isFetching.value,
      paymentHasResult.value,
    ] as const,
  () => {
    if (!booking.value || !query.isSuccess.value || query.isFetching.value || query.isError.value)
      return
    if (
      ((checkout.value || processing.value) &&
        (paymentHasResult.value || !['PENDING', 'RESERVED'].includes(booking.value.status))) ||
      (ticket.value && booking.value.status !== 'CONFIRMED')
    ) {
      void showResult()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="booking-journey customer-bookings"
    :class="{
      'booking-journey--printable': booking?.status === 'CONFIRMED',
      'booking-journey--checkout': checkout,
      'booking-journey--ticket': ticket,
      'booking-journey--result': !checkout && !ticket,
    }"
  >
    <AppContainer>
      <BookingProgress v-if="checkout" :current="checkout ? 'checkout' : 'order'" />
      <p v-if="!valid" class="booking-error" role="alert">Mã đơn đặt vé không hợp lệ.</p>
      <BookingProcessing v-else-if="processing && query.isPending.value" />
      <p v-else-if="query.isPending.value" class="booking-note" role="status">
        Đang tải đơn đặt vé…
      </p>
      <div v-else-if="query.isError.value" class="booking-panel">
        <p class="booking-error" role="alert">{{ customerBookingError(query.error.value) }}</p>
        <AppButton :loading="query.isFetching.value" @click="query.refetch()">Thử lại</AppButton>
      </div>
      <template v-if="valid && booking">
        <div v-if="navigationError" class="booking-error" role="alert">
          <p>{{ navigationError }}</p>
          <RouterLink
            class="customer-bookings__link"
            :to="{ name: ROUTE_NAMES.BOOKING_RESULT, params: { bookingId: booking.id } }"
            >Mở kết quả đơn →</RouterLink
          >
        </div>
        <template v-if="processing">
          <BookingProcessing :booking-id="booking.id"><BookingPayment :key="booking.id" processing :booking="booking" :disabled="query.isFetching.value || query.isError.value" @payment-status="paymentStatus = $event" @refresh="query.refetch()" /></BookingProcessing>
        </template>
        <template v-else-if="checkout">
          <div class="booking-journey__layout">
            <div class="booking-journey__main">
              <header class="booking-journey__heading">
                <p class="lumiere-eyebrow">BƯỚC 03</p>
                <h1>Kiểm tra để an tâm tận hưởng</h1>
                <p>Kiểm tra suất chiếu, ghế và tổng tiền trước khi tiếp tục.</p>
              </header>
              <section
                class="booking-panel booking-journey__checkout-items"
                aria-labelledby="checkout-items-title"
              >
                <h2 id="checkout-items-title">Thông tin đặt vé</h2>
                <BookingSavedSeats :booking="booking" />
                <p v-if="booking.status === 'PENDING'" class="booking-note" role="status">
                  Đang xác nhận ghế và giá đã lưu. Chưa thể thanh toán.
                </p>
                <RouterLink
                  class="customer-bookings__link"
                  :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: booking.id } }"
                  >Kiểm tra hoặc hủy đơn giữ ghế →</RouterLink
                >
              </section>
              <section id="checkout-payment" class="booking-panel booking-journey__payment">
                <BookingPayment
                  :key="booking.id"
                  :booking="booking"
                  :result-only="!checkout"
                  :disabled="query.isFetching.value || query.isError.value"
                  @payment-status="paymentStatus = $event"
                  @refresh="query.refetch()"
                />
              </section>
            </div>
            <BookingJourneySummary
              :key="booking.id"
              :booking="booking"
              :remaining="remaining"
              :expired="Date.parse(booking.expiresAt) <= now.getTime()"
            />
          </div>
        </template>
        <template v-else>
          <header v-if="ticket" class="booking-journey__ticket-heading">
            <p class="lumiere-eyebrow">VÉ ĐIỆN TỬ</p>
            <h1>Cuộc hẹn đã sẵn sàng</h1>
            <p>Thông tin đơn đặt vé đã được xác nhận · {{ booking.id }}</p>
          </header>
          <header v-if="!ticket" class="booking-journey__result">
            <span
              class="booking-journey__result-icon"
              :data-confirmed="booking.status === 'CONFIRMED'"
              ><Check v-if="booking.status === 'CONFIRMED'" aria-hidden="true" /><Clock3
                v-else-if="['PENDING', 'RESERVED'].includes(booking.status)"
                aria-hidden="true" /><CircleAlert v-else aria-hidden="true"
            /></span>
            <p class="lumiere-eyebrow">{{ ticket ? 'THÔNG TIN VÉ' : 'KẾT QUẢ ĐẶT VÉ' }}</p>
            <h1>{{ resultTitle }}</h1>
            <p role="status">{{ description }}</p>
          </header>
          <BookingConfirmedTicket
            v-if="booking.status === 'CONFIRMED'"
            :key="booking.id"
            :booking="booking"
          />
          <section v-else class="booking-journey__result-status">
            <p class="booking-note">Mã đơn: {{ booking.id }}</p>
            <p v-if="booking.rejectionReason" class="booking-error">
              {{ booking.rejectionReason }}
            </p>
            <BookingPayment
              :key="booking.id"
              :booking="booking"
              :result-only="!checkout"
              :disabled="query.isFetching.value || query.isError.value"
              @payment-status="paymentStatus = $event"
              @refresh="query.refetch()"
            /><AppButton
              v-if="booking.status === 'PENDING'"
              variant="secondary"
              :loading="query.isFetching.value"
              @click="query.refetch()"
              >Kiểm tra trạng thái đơn</AppButton
            >
          </section>
          <div
            v-if="ticket && booking.status === 'CONFIRMED'"
            class="booking-journey__ticket-details"
          >
            <BookingShowtimeSummary
              :key="booking.id"
              :showtime-id="booking.showtimeId"
              :allow-new-booking="false"
              :disabled="query.isFetching.value"
              ><BookingSavedSeats :booking="booking"
            /></BookingShowtimeSummary>
            <section class="booking-panel">
              <h2>Thanh toán</h2>
              <p v-if="booking.paymentProvider" class="booking-note">
                {{ booking.paymentProvider === 'MOMO' ? 'Ví MoMo' : 'VNPAY' }}
              </p>
              <p class="booking-note">
                <strong>{{ customerBookingLabels[booking.status] }}</strong>
              </p>
              <dl class="booking-journey__price-breakdown">
                <div>
                  <dt>Tiền vé</dt>
                  <dd>{{ money(booking.totalAmount, booking.currency) }}</dd>
                </div>
                <div class="booking-journey__total">
                  <dt>Tổng cộng</dt>
                  <dd>{{ money(booking.totalAmount, booking.currency) }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <div class="booking-journey__actions">
            <RouterLink
              v-if="booking.status === 'CONFIRMED' && !ticket"
              class="booking-journey__primary-link"
              :to="{ name: ROUTE_NAMES.BOOKING_TICKET, params: { bookingId: booking.id } }"
              >Xem vé <Ticket aria-hidden="true"
            /></RouterLink>
            <RouterLink
              v-if="
                ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.status) &&
                !query.isError.value &&
                !query.isFetching.value
              "
              class="booking-journey__primary-link"
              :to="{ name: ROUTE_NAMES.BOOKING, params: { showtimeId: booking.showtimeId } }"
              >Chọn lại ghế <ArrowRight aria-hidden="true"
            /></RouterLink>
            <AppButton
              v-if="booking.status === 'CONFIRMED'"
              variant="secondary"
              :disabled="query.isFetching.value || query.isError.value"
              @click="printTicket"
              ><Printer aria-hidden="true" /> In vé</AppButton
            >
            <RouterLink
              v-if="ticket"
              class="booking-journey__outline-link"
              :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
              >Vé &amp; giao dịch</RouterLink
            >
            <RouterLink
              v-else-if="booking.status !== 'CONFIRMED'"
              class="booking-journey__outline-link"
              :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: booking.id } }"
              >Chi tiết đơn</RouterLink
            >
            <RouterLink class="customer-bookings__link" :to="{ name: ROUTE_NAMES.HOME }"
              >Về trang chủ <ArrowRight aria-hidden="true"
            /></RouterLink>
          </div>
        </template>
      </template>
    </AppContainer>
  </div>
</template>

<style src="../../../styles/customer-bookings.css"></style>
<style src="../../../styles/booking-journey.css"></style>
