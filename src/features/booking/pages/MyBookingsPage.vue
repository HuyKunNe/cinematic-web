<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink, useRoute } from 'vue-router'
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from 'reka-ui'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import CustomerAccountNav from '@/components/navigation/CustomerAccountNav.vue'
import BookingProgress from '../components/BookingProgress.vue'
import BookingShowtimeSummary from '../components/BookingShowtimeSummary.vue'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'
import { CINEMA_TIME_ZONE } from '@/utils/cinema-time'
import {
  customerBookingId,
  customerBookingLabels,
  customerBookingError,
  cancelCustomerBooking,
  useCustomerBookingQuery,
  useCustomerBookingsQuery,
  type CustomerBooking,
} from '../api/customer-bookings'

const route = useRoute()
const auth = useAuthStore()
const queries = useQueryClient()
const id = computed(() =>
  typeof route.query.bookingId === 'string' ? route.query.bookingId.toLowerCase() : '',
)
const validId = computed(() => customerBookingId.safeParse(id.value).success)
const page = ref(0)
const list = useCustomerBookingsQuery(page, () => !id.value)
const detail = useCustomerBookingQuery(id)
const booking = computed(() =>
  auth.isAuthenticated && detail.data.value?.userId === auth.subject
    ? detail.data.value
    : undefined,
)
const seatTypeLabels: Record<string, string> = {
  STANDARD: 'Tiêu chuẩn',
  VIP: 'VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Hỗ trợ tiếp cận',
}
const seatGroups = computed(() => {
  const groups = new Map<string, NonNullable<CustomerBooking['seats']>>()
  for (const seat of booking.value?.seats ?? []) {
    const key = seat.seatType?.trim() || ''
    const seats = groups.get(key) ?? []
    seats.push(seat)
    groups.set(key, seats)
  }
  return Array.from(groups, ([type, seats]) => ({
    type,
    label: seatTypeLabels[type] ?? (type || 'Loại ghế chưa xác định'),
    numbers: seats.map((seat) => seat.seatNumber).join(', '),
    count: seats.length,
    unit: seats.every((seat) => seat.unit === 'PAIR') ? 'cặp' : 'ghế',
    ticketGroups: [
      ...new Set(seats.map((seat) => seat.ticketGroupName || 'Nhóm vé chưa xác định')),
    ].join(', '),
    total: seats.some((seat) => seat.price === null)
      ? null
      : seats.reduce((total, seat) => total + (seat.price ?? 0), 0),
  }))
})
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
const canChooseNewShowtime = computed(
  () =>
    booking.value &&
    ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.value.status) &&
    detail.isSuccess.value &&
    !detail.isFetching.value &&
    !detail.isError.value,
)
const confirming = ref(false)
const cancelling = ref(false)
const feedback = ref('')
const feedbackIsError = ref(false)
const canCancel = computed(
  () =>
    booking.value?.status === 'RESERVED' &&
    Date.parse(booking.value.expiresAt) > now.value.getTime() &&
    !detail.isFetching.value &&
    !detail.isError.value &&
    !cancelling.value,
)
const remaining = computed(() => {
  if (!booking.value) return ''
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(booking.value.expiresAt) - now.value.getTime()) / 1000),
  )
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
const statusTitles: Record<CustomerBooking['status'], string> = {
  PENDING: 'Yêu cầu đã được tiếp nhận',
  RESERVED: 'Ghế của bạn đã được giữ',
  CONFIRMED: 'Hẹn bạn tại rạp!',
  REJECTED: 'Chưa thể giữ ghế cho đơn này',
  PAYMENT_FAILED: 'Thanh toán chưa thành công',
  CANCELLED: 'Đơn đặt vé đã được hủy',
  EXPIRED: 'Đã hết thời gian giữ ghế',
}
const statusDescription = computed(() => {
  switch (booking.value?.status) {
    case 'PENDING':
      return 'Hệ thống đang kiểm tra và giữ ghế. Trang tự cập nhật kết quả; chưa phải vé đã xác nhận.'
    case 'RESERVED':
      return 'Ghế đã được giữ. Đơn chưa được xác nhận thanh toán.'
    case 'CONFIRMED':
      return 'Đơn đặt vé đã được xác nhận.'
    case 'REJECTED':
      return 'Yêu cầu đặt vé không được chấp nhận. Bạn có thể chọn lại suất hoặc ghế.'
    case 'PAYMENT_FAILED':
      return 'Thanh toán không thành công. Kiểm tra trạng thái mới nhất trước khi đặt lại.'
    case 'CANCELLED':
      return 'Đơn đã được hủy.'
    case 'EXPIRED':
      return 'Đơn đã hết thời gian giữ ghế.'
    default:
      return ''
  }
})
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: CINEMA_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
})
function date(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : '—'
}
function money(value: number | null, currency: string | null) {
  return value === null || currency === null
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(value)
}
watch(id, () => {
  confirming.value = false
  feedback.value = ''
})
watch(
  () => auth.subject,
  () => {
    confirming.value = false
    feedback.value = ''
  },
)
onBeforeRouteLeave(() => !cancelling.value)
onBeforeRouteUpdate(() => !cancelling.value)
async function cancel() {
  const current = booking.value
  const owner = auth.subject
  if (!current || !owner || !canCancel.value) return
  cancelling.value = true
  feedback.value = ''
  try {
    const result = await cancelCustomerBooking(current.id, owner)
    if (!auth.isAuthenticated || auth.subject !== owner) return
    queries.setQueryData(['customer-bookings', owner, 'detail', current.id], result)
    await queries.invalidateQueries({
      queryKey: ['customer-bookings', owner, 'list'],
      refetchType: 'none',
    })
    confirming.value = false
    feedbackIsError.value = false
    feedback.value = 'Đã hủy đơn đặt vé.'
  } catch (cause) {
    feedbackIsError.value = true
    feedback.value = customerBookingError(cause)
    confirming.value = false
    await detail.refetch()
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="booking-start-page customer-bookings">
    <AppContainer>
      <header class="customer-bookings__heading">
        <div>
          <p class="lumiere-eyebrow">{{ id ? 'CHI TIẾT GIAO DỊCH' : 'VÉ & GIAO DỊCH' }}</p>
          <h1 class="booking-start__title">
            {{ id ? 'Chi tiết đơn đặt vé' : 'Những cuộc hẹn đã lưu' }}
          </h1>
        </div>
        <RouterLink
          v-if="id"
          class="customer-bookings__link"
          :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
          >Về danh sách</RouterLink
        >
        <RouterLink v-else class="customer-bookings__link" :to="{ name: ROUTE_NAMES.BOOKING_START }"
          >Đặt vé mới</RouterLink
        >
      </header>
      <BookingProgress v-if="id" current="order" />
      <p v-if="!auth.isAuthenticated" class="booking-error" role="alert">
        Vui lòng đăng nhập để xem đơn đặt vé.
      </p>
      <template v-else-if="id">
        <p v-if="!validId" class="booking-error" role="alert">Mã đơn đặt vé không hợp lệ.</p>
        <p v-else-if="detail.isPending.value" class="booking-note" role="status">
          Đang tải đơn đặt vé…
        </p>
        <div v-else-if="detail.isError.value" class="booking-panel">
          <p class="booking-error" role="alert">{{ customerBookingError(detail.error.value) }}</p>
          <AppButton :loading="detail.isFetching.value" @click="detail.refetch()"
            >Tải lại đơn</AppButton
          >
        </div>
        <template v-if="validId && booking">
          <p
            v-if="feedback"
            :class="feedbackIsError ? 'booking-error' : 'booking-notice'"
            role="status"
          >
            {{ feedback }}
          </p>
          <section
            class="customer-bookings__status"
            :data-status="booking.status"
            aria-labelledby="customer-booking-status"
          >
            <span class="customer-bookings__result-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path v-if="booking.status === 'CONFIRMED'" d="m5 12 4 4L20 5" />
                <template v-else-if="booking.status === 'PENDING' || booking.status === 'RESERVED'">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 6v6l4 2" />
                </template>
                <template v-else>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v6m0-10v1" />
                </template>
              </svg>
            </span>
            <span class="customer-bookings__badge" :data-status="booking.status">{{
              customerBookingLabels[booking.status]
            }}</span>
            <h2 id="customer-booking-status">{{ statusTitles[booking.status] }}</h2>
            <p class="booking-note" role="status" aria-live="polite">{{ statusDescription }}</p>
            <p v-if="booking.status === 'RESERVED'" class="booking-note">
              {{
                Date.parse(booking.expiresAt) > now.getTime()
                  ? `Thời gian giữ ghế còn ${remaining}`
                  : 'Đã đến hạn giữ ghế. Đang chờ trạng thái từ hệ thống.'
              }}
            </p>
            <p v-if="booking.rejectionReason" class="booking-error">
              {{ booking.rejectionReason }}
            </p>
            <p v-if="booking.status === 'RESERVED'" class="booking-note">
              Thanh toán trực tuyến chưa khả dụng trên website. Bạn có thể theo dõi hoặc hủy đơn
              trong thời gian giữ ghế.
            </p>
            <div class="customer-bookings__actions">
              <AppButton
                variant="secondary"
                :disabled="cancelling || detail.isFetching.value"
                @click="detail.refetch()"
                >Cập nhật trạng thái</AppButton
              ><AppButton
                v-if="booking.status === 'RESERVED'"
                variant="ghost"
                :disabled="!canCancel"
                @click="confirming = true"
                >Hủy đơn giữ ghế</AppButton
              >
            </div>
          </section>
          <div class="customer-bookings__grid">
            <BookingShowtimeSummary
              :key="booking.id"
              :showtime-id="booking.showtimeId"
              :allow-new-booking="!!canChooseNewShowtime"
              :disabled="cancelling"
            >
              <section
                class="customer-bookings__seat-section"
                aria-labelledby="customer-booking-seats"
              >
                <h3 id="customer-booking-seats">Ghế và giá đã lưu</h3>
                <ul v-if="booking.seats?.length" class="customer-bookings__seats">
                  <li v-for="group in seatGroups" :key="group.type">
                    <div>
                      <strong>{{ group.label }} · {{ group.count }} {{ group.unit }}</strong>
                      <small>Ghế: {{ group.numbers }}</small>
                      <small>{{ group.ticketGroups }}</small>
                    </div>
                    <strong>{{ money(group.total, booking.currency) }}</strong>
                  </li>
                </ul>
                <p v-else class="booking-note">
                  {{
                    booking.status === 'PENDING'
                      ? 'Ghế đang được hệ thống xử lý.'
                      : 'Chưa có thông tin ghế.'
                  }}
                </p>
              </section>
            </BookingShowtimeSummary>
            <section class="booking-panel" aria-labelledby="customer-booking-info">
              <h2 id="customer-booking-info">Thông tin đơn &amp; tổng tiền</h2>
              <dl class="customer-bookings__facts">
                <div>
                  <dt>Mã đơn</dt>
                  <dd>{{ booking.id }}</dd>
                </div>
                <div>
                  <dt>Mã suất chiếu</dt>
                  <dd>{{ booking.showtimeId }}</dd>
                </div>
                <div>
                  <dt>Tổng tiền</dt>
                  <dd class="customer-bookings__amount">
                    {{ money(booking.totalAmount, booking.currency) }}
                  </dd>
                </div>
                <div>
                  <dt>Số ghế / chỗ</dt>
                  <dd>
                    {{ booking.seatCount ?? '—' }} đơn vị ghế · {{ booking.capacity ?? '—' }} chỗ
                  </dd>
                </div>
                <div>
                  <dt>Ngày tạo</dt>
                  <dd>{{ date(booking.createdAt) }}</dd>
                </div>
                <div>
                  <dt>Hạn giữ ghế</dt>
                  <dd>{{ date(booking.expiresAt) }}</dd>
                </div>
                <div v-if="booking.confirmedAt">
                  <dt>Xác nhận lúc</dt>
                  <dd>{{ date(booking.confirmedAt) }}</dd>
                </div>
                <div v-if="booking.cancelledAt">
                  <dt>Hủy lúc</dt>
                  <dd>{{ date(booking.cancelledAt) }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <div class="customer-bookings__result-actions">
            <RouterLink class="customer-bookings__link" :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
              >Vé &amp; giao dịch</RouterLink
            >
            <RouterLink class="customer-bookings__link" :to="{ name: ROUTE_NAMES.HOME }"
              >Về trang chủ →</RouterLink
            >
          </div>
        </template>
      </template>
      <div v-else class="lumiere-account-layout">
        <CustomerAccountNav />
        <section class="customer-bookings__browser" aria-label="Danh sách đơn đặt vé">
          <p v-if="list.isPending.value" class="booking-note" role="status">
            Đang tải đơn của bạn…
          </p>
          <div v-else-if="list.isError.value" class="booking-panel">
            <p class="booking-error" role="alert">{{ customerBookingError(list.error.value) }}</p>
            <AppButton :loading="list.isFetching.value" @click="list.refetch()">Thử lại</AppButton>
          </div>
          <template v-else-if="list.data.value">
            <div class="customer-bookings__heading">
              <span class="booking-note"
                >{{ list.data.value.page.totalElements }} đơn · Giờ Việt Nam</span
              ><AppButton variant="ghost" :loading="list.isFetching.value" @click="list.refetch()"
                >Làm mới</AppButton
              >
            </div>
            <p v-if="!list.data.value.content.length" class="booking-panel">
              Chưa có đơn trên trang này.
              <AppButton v-if="page" variant="ghost" @click="page = 0">Về trang đầu</AppButton>
            </p>
            <div class="customer-bookings__list">
              <article
                v-for="item in list.data.value.content"
                :key="item.id"
                class="customer-bookings__order-card"
              >
                <img
                  class="customer-bookings__order-art"
                  src="/customer/movie-placeholder.svg"
                  alt=""
                  loading="lazy"
                />
                <div class="customer-bookings__order-main">
                  <small class="customer-bookings__id">{{ item.id }}</small>
                  <h2>Đơn đặt vé</h2>
                  <p class="booking-note">
                    {{ date(item.createdAt) }}<br />Ghế:
                    {{ item.seats?.map((seat) => seat.seatNumber).join(', ') || 'Đang xác nhận' }}
                  </p>
                  <span class="customer-bookings__badge" :data-status="item.status">{{
                    customerBookingLabels[item.status]
                  }}</span>
                </div>
                <div class="customer-bookings__order-actions">
                  <strong>{{ money(item.totalAmount, item.currency) }}</strong>
                  <RouterLink
                    class="customer-bookings__order-link"
                    :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: item.id } }"
                    >Chi tiết đơn →</RouterLink
                  >
                </div>
              </article>
            </div>
            <nav class="customer-bookings__actions" aria-label="Phân trang đơn">
              <AppButton
                variant="secondary"
                :disabled="!page || list.isFetching.value"
                @click="page--"
                >Trang trước</AppButton
              ><span>Trang {{ page + 1 }} / {{ Math.max(1, list.data.value.page.totalPages) }}</span
              ><AppButton
                variant="secondary"
                :disabled="list.data.value.page.last || list.isFetching.value"
                @click="page++"
                >Trang sau</AppButton
              >
            </nav>
          </template>
        </section>
      </div>
      <AlertDialogRoot :open="confirming" @update:open="!cancelling && (confirming = $event)"
        ><AlertDialogPortal
          ><AlertDialogOverlay class="customer-bookings__overlay" /><AlertDialogContent
            class="customer-bookings__confirm"
            @escape-key-down="cancelling && $event.preventDefault()"
            ><AlertDialogTitle>Hủy đơn giữ ghế?</AlertDialogTitle
            ><AlertDialogDescription
              >Ghế sẽ được giải phóng sau khi hệ thống xử lý. Chỉ hủy đơn đang giữ ghế và còn
              hạn.</AlertDialogDescription
            >
            <div class="customer-bookings__actions">
              <AlertDialogCancel as-child
                ><AppButton variant="secondary" :disabled="cancelling"
                  >Giữ đơn</AppButton
                ></AlertDialogCancel
              ><AppButton :loading="cancelling" :disabled="!canCancel" @click="cancel"
                >Xác nhận hủy đơn</AppButton
              >
            </div></AlertDialogContent
          ></AlertDialogPortal
        ></AlertDialogRoot
      >
    </AppContainer>
  </div>
</template>

<style src="../../../styles/customer-bookings.css"></style>
