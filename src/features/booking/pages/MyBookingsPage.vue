<script setup lang="ts">
import { formatBookingReference } from '../mappers/booking-reference.mapper'
import { formatSavedBookingMoney } from '../mappers/booking-money.mapper'
import { computed, ref, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  RouterLink,
  useRoute,
  useRouter,
  type LocationQueryRaw,
} from 'vue-router'
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { Ticket } from 'lucide-vue-next'
import BookingTicketCard from '../components/BookingTicketCard.vue'
import CustomerAccountNav from '@/components/navigation/CustomerAccountNav.vue'
import BookingShowtimeSummary from '../components/BookingShowtimeSummary.vue'
import BookingPayment from '../components/BookingPayment.vue'
import type { PaymentCheckoutResponseStatus } from '@/services/api/generated/payment-service/model/paymentCheckoutResponseStatus'
import { canRestartBooking, needsBookingPaymentReview } from '../utils/booking-result-actions'
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
  customerBookingListTabs,
  type CustomerBookingListTab,
  type CustomerBooking,
} from '../api/customer-bookings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const queries = useQueryClient()
const id = computed(() =>
  typeof route.params.bookingId === 'string'
    ? route.params.bookingId.toLowerCase()
    : typeof route.query.bookingId === 'string'
      ? route.query.bookingId.toLowerCase()
      : '',
)
const isCheckout = computed(() => route.name === ROUTE_NAMES.BOOKING_CHECKOUT)
const isResult = computed(() => route.name === ROUTE_NAMES.BOOKING_RESULT)
const validId = computed(() => customerBookingId.safeParse(id.value).success)
const listNavigationError = ref('')
const listNavigating = ref(false)
const activeTab = computed<CustomerBookingListTab>(() => {
  const value = route.query.tab
  return typeof value === 'string' && Object.keys(customerBookingListTabs).includes(value)
    ? (value as CustomerBookingListTab)
    : 'upcoming'
})
const visibleTabs = computed(() =>
  Object.entries(customerBookingListTabs)
    .filter(([key]) => key !== 'confirmed' || activeTab.value === 'confirmed')
    .map(([key, tab]) => ({ key, label: tab.label })),
)
const emptyListCopy = computed(() => {
  const messages: Record<CustomerBookingListTab, { title: string; description: string }> = {
    all: {
      title: 'Bạn chưa có đơn đặt vé',
      description: 'Chọn một bộ phim để bắt đầu cuộc hẹn mới.',
    },
    confirmed: {
      title: 'Chưa có đơn được xác nhận',
      description: 'Bạn có thể xem các đơn đang chờ xử lý trong Giao dịch khác.',
    },
    upcoming: {
      title: 'Chưa có suất sắp hoặc đang chiếu',
      description: 'Vé của các suất chưa kết thúc sẽ xuất hiện tại đây khi đơn được xác nhận.',
    },
    past: {
      title: 'Chưa có suất đã kết thúc',
      description: 'Đơn đã xác nhận sẽ xuất hiện tại đây sau khi suất chiếu kết thúc.',
    },
    unfinished: {
      title: 'Không có giao dịch khác',
      description: 'Các đơn đang chờ, đã hủy, hết hạn hoặc không thành công sẽ xuất hiện tại đây.',
    },
  }
  return messages[activeTab.value]
})
const page = computed({
  get: () => {
    const value = typeof route.query.page === 'string' ? Number(route.query.page) : 1
    return Number.isSafeInteger(value) && value > 0 && value <= 2147483647 ? value - 1 : 0
  },
  set: (value: number) => {
    void updateListLocation({ page: value ? String(value + 1) : undefined })
  },
})
const list = useCustomerBookingsQuery(
  page,
  () => !id.value,
  () => customerBookingListTabs[activeTab.value].statuses,
  () => customerBookingListTabs[activeTab.value].period,
)
const listUnavailable = computed(() => {
  const status = (list.error.value as { status?: number } | null)?.status
  return list.isError.value && (status === 401 || status === 403 || status === 404)
})
const refreshingList = ref(false)
async function refreshList() {
  if (refreshingList.value || listNavigating.value) return
  refreshingList.value = true
  try {
    await list.refetch({ cancelRefetch: false })
  } finally {
    refreshingList.value = false
  }
}
async function updateListLocation(query: LocationQueryRaw) {
  if (listNavigating.value) return
  listNavigating.value = true
  listNavigationError.value = ''
  try {
    const failure = await router.push({
      name: ROUTE_NAMES.ACCOUNT_BOOKINGS,
      query: { ...route.query, ...query },
    })
    if (failure) listNavigationError.value = 'Chưa thể cập nhật danh sách vé. Vui lòng thử lại.'
  } catch {
    listNavigationError.value = 'Chưa thể cập nhật danh sách vé. Vui lòng thử lại.'
  } finally {
    listNavigating.value = false
  }
}
function changeTab(value: string | number) {
  if (
    value === activeTab.value ||
    typeof value !== 'string' ||
    !Object.keys(customerBookingListTabs).includes(value)
  )
    return
  void updateListLocation({ tab: value === 'upcoming' ? undefined : value, page: undefined })
}
const detail = useCustomerBookingQuery(id)
const detailUnavailable = computed(() => {
  const status = (detail.error.value as { status?: number } | null)?.status
  return detail.isError.value && (status === 403 || status === 404)
})
const booking = computed(() =>
  auth.isAuthenticated && !detailUnavailable.value && detail.data.value?.userId === auth.subject
    ? detail.data.value
    : undefined,
)
const seatTypeLabels: Record<string, string> = {
  STANDARD: 'Tiêu chuẩn',
  VIP: 'VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Hỗ trợ tiếp cận',
}
const awaitingSeatSnapshot = computed(
  () =>
    booking.value?.status === 'PENDING' &&
    booking.value.seats?.some((seat) => !seat.seatType || seat.price === null),
)
const incompleteSeatSnapshot = computed(
  () =>
    booking.value &&
    ['RESERVED', 'CONFIRMED', 'PAYMENT_FAILED'].includes(booking.value.status) &&
    (!booking.value.currency ||
      booking.value.totalAmount === null ||
      !booking.value.seats?.length ||
      booking.value.seats.some((seat) => !seat.seatType || seat.price === null)),
)
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
    unit: seats.every((seat) => seat.unit === 'PAIR')
      ? 'cặp'
      : seats.every((seat) => seat.unit === 'SEAT')
        ? 'ghế'
        : 'đơn vị',
    ticketGroups: [
      ...new Set(seats.map((seat) => seat.ticketGroupName?.trim()).filter(Boolean)),
    ].join(', '),
    total: seats.some((seat) => seat.price === null)
      ? null
      : seats.reduce((total, seat) => total + (seat.price ?? 0), 0),
  }))
})
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
let lastBoundaryRefresh = ''
watch(now, (current) => {
  if (
    activeTab.value !== 'upcoming' ||
    id.value ||
    !list.data.value ||
    list.isFetching.value ||
    list.isError.value
  )
    return
  const ended = list.data.value.content.filter(
    (item) =>
      item.status === 'CONFIRMED' &&
      item.showtimeEndsAt &&
      Date.parse(item.showtimeEndsAt) <= current.getTime(),
  )
  if (!ended.length) return
  const key = [
    auth.subject,
    page.value,
    ...ended.map((item) => `${item.id}:${item.showtimeEndsAt}`),
  ].join('|')
  if (key === lastBoundaryRefresh) return
  lastBoundaryRefresh = key
  // Refresh server-filtered totals; never move/filter cards locally.
  void list.refetch()
})
const paymentStatus = ref<PaymentCheckoutResponseStatus>()
const paymentChecked = ref(false)
const paymentNeedsReview = computed(() =>
  needsBookingPaymentReview(booking.value?.status, paymentStatus.value),
)
const canChooseNewShowtime = computed(
  () =>
    booking.value &&
    canRestartBooking(booking.value.status, paymentStatus.value, paymentChecked.value) &&
    detail.isSuccess.value &&
    !detail.isFetching.value &&
    !detail.isError.value,
)
const confirming = ref(false)
const cancelling = ref(false)
const feedback = ref('')
const feedbackIsError = ref(false)
const holdActive = computed(
  () =>
    booking.value?.status === 'RESERVED' &&
    Date.parse(booking.value.expiresAt) > now.value.getTime(),
)
const canCancel = computed(
  () => holdActive.value && !detail.isFetching.value && !detail.isError.value && !cancelling.value,
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
  if (paymentNeedsReview.value)
    return paymentStatus.value === 'SUCCEEDED'
      ? 'Thanh toán đã được ghi nhận nhưng đơn chưa được xác nhận. Kiểm tra kết quả hoặc liên hệ rạp trước khi đặt lại.'
      : 'Kết quả thanh toán chưa xác định. Vui lòng kiểm tra kết quả trước khi tạo đơn mới.'
  switch (booking.value?.status) {
    case 'PENDING':
      return 'Hệ thống đang kiểm tra và giữ ghế. Trang tự cập nhật kết quả; chưa phải vé đã xác nhận.'
    case 'RESERVED':
      return holdActive.value
        ? 'Ghế đã được giữ. Đơn chưa được xác nhận thanh toán.'
        : 'Đã đến hạn giữ ghế. Hệ thống đang cập nhật kết quả đơn; hãy kiểm tra thanh toán trước khi đặt lại.'
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
  return formatSavedBookingMoney(value, currency, booking.value?.status)
}
watch(id, () => {
  paymentStatus.value = undefined
  paymentChecked.value = false
  confirming.value = false
  feedback.value = ''
})
watch(detailUnavailable, (unavailable) => {
  if (unavailable) {
    confirming.value = false
    feedback.value = ''
    paymentStatus.value = undefined
    paymentChecked.value = false
  }
})
watch(
  () => auth.subject,
  () => {
    paymentStatus.value = undefined
    paymentChecked.value = false
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
  <div
    class="booking-start-page customer-bookings"
    :class="{ 'customer-bookings--list': !id, 'customer-bookings--detail': !!id }"
  >
    <AppContainer>
      <header class="customer-bookings__heading">
        <div>
          <p class="lumiere-eyebrow">{{ id ? 'CHI TIẾT GIAO DỊCH' : 'VÉ & GIAO DỊCH' }}</p>
          <h1 class="booking-start__title">
            {{
              isCheckout
                ? 'Kiểm tra để an tâm tận hưởng'
                : isResult
                  ? 'Kết quả đặt vé'
                  : id
                    ? 'Chi tiết đơn đặt vé'
                    : 'Những cuộc hẹn đã lưu'
            }}
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
      <p v-if="!auth.isAuthenticated" class="booking-error" role="alert">
        Vui lòng đăng nhập để xem đơn đặt vé.
      </p>
      <template v-else-if="id">
        <AppEmptyState
          v-if="!validId || detailUnavailable"
          title="Không tìm thấy đơn đặt vé"
          :description="
            !validId
              ? 'Đường dẫn giao dịch không hợp lệ. Chọn Về danh sách để mở lại đơn đặt vé.'
              : 'Không tìm thấy đơn đặt vé thuộc tài khoản của bạn. Vui lòng kiểm tra lại trong danh sách giao dịch.'
          "
        />
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
            <div class="customer-bookings__status-copy">
              <span class="customer-bookings__badge" :data-status="booking.status">{{
                customerBookingLabels[booking.status]
              }}</span>
              <h2 id="customer-booking-status">
                {{
                  paymentNeedsReview
                    ? 'Cần kiểm tra kết quả thanh toán'
                    : booking.status === 'RESERVED' && !holdActive
                      ? 'Đang chờ cập nhật trạng thái'
                      : statusTitles[booking.status]
                }}
              </h2>
              <p class="booking-note" role="status" aria-live="polite">{{ statusDescription }}</p>
              <p v-if="holdActive && !paymentNeedsReview" class="booking-note">
                Thời gian giữ ghế còn {{ remaining }}
              </p>
              <p v-if="booking.rejectionReason" class="booking-error">
                {{ booking.rejectionReason }}
              </p>
              <p v-if="holdActive && !paymentNeedsReview" class="booking-note">
                Kiểm tra thông tin bên dưới và tiếp tục thanh toán trong thời gian giữ ghế. Kết quả
                chỉ được xác nhận khi hệ thống cập nhật trạng thái đơn.
              </p>
            </div>
            <div
              v-if="booking.status === 'CONFIRMED' || booking.status === 'RESERVED'"
              class="customer-bookings__actions"
            >
              <RouterLink
                v-if="booking.status === 'CONFIRMED'"
                class="customer-bookings__detail-ticket-link"
                :to="{ name: ROUTE_NAMES.BOOKING_TICKET, params: { bookingId: booking.id } }"
                >Xem vé <Ticket aria-hidden="true"
              /></RouterLink>
              <AppButton
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
                <p v-if="awaitingSeatSnapshot" class="booking-note" role="status">
                  Ghế yêu cầu: {{ booking.seats?.map((seat) => seat.seatNumber).join(', ') }}. Đang
                  chờ hệ thống xác nhận loại ghế và giá đã lưu. Trang sẽ tự cập nhật.
                </p>
                <p v-if="incompleteSeatSnapshot" class="booking-error" role="alert">
                  Dữ liệu đơn từ hệ thống chưa đầy đủ loại ghế hoặc giá đã lưu. Vui lòng cập nhật
                  trạng thái; giá báo trước khi đặt không thay thế giá của đơn.
                </p>
                <ul
                  v-if="booking.seats?.length && !awaitingSeatSnapshot"
                  class="customer-bookings__seats"
                >
                  <li v-for="group in seatGroups" :key="group.type">
                    <div>
                      <strong>{{ group.label }} · {{ group.count }} {{ group.unit }}</strong>
                      <small>Ghế: {{ group.numbers }}</small>
                      <small v-if="group.ticketGroups">{{ group.ticketGroups }}</small>
                    </div>
                    <strong>{{ money(group.total, booking.currency) }}</strong>
                  </li>
                </ul>
                <p v-else-if="!awaitingSeatSnapshot" class="booking-note">
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
                  <dd>{{ formatBookingReference(booking.id) }}</dd>
                </div>
                <div>
                  <dt>Mã suất chiếu</dt>
                  <dd>{{ formatBookingReference(booking.showtimeId) }}</dd>
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
              </dl>
              <details class="customer-bookings__timeline">
                <summary>Thời gian giao dịch</summary>
                <dl class="customer-bookings__facts">
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
              </details>
              <BookingPayment
                :key="booking.id"
                compact
                :booking="booking"
                :disabled="cancelling || detail.isFetching.value || detail.isError.value"
                @refresh="detail.refetch()"
                @payment-status="paymentStatus = $event"
                @payment-checked="paymentChecked = $event"
              />
            </section>
          </div>
        </template>
      </template>
      <div v-else class="lumiere-account-layout">
        <CustomerAccountNav />
        <section class="customer-bookings__browser" aria-label="Danh sách đơn đặt vé">
          <TabsRoot :model-value="activeTab" @update:model-value="changeTab">
            <TabsList class="customer-bookings__tabs" aria-label="Nhóm giao dịch">
              <TabsTrigger
                v-for="tab in visibleTabs"
                :key="tab.key"
                :value="tab.key"
                :disabled="listNavigating"
                >{{ tab.label }}</TabsTrigger
              >
            </TabsList>
            <TabsContent :value="activeTab">
              <p v-if="listNavigationError" class="booking-error" role="alert">
                {{ listNavigationError }}
              </p>
              <p v-if="list.isPending.value" class="booking-note" role="status">
                Đang tải đơn của bạn…
              </p>
              <div
                v-else-if="list.isError.value && (!list.data.value || listUnavailable)"
                class="booking-panel"
              >
                <p class="booking-error" role="alert">
                  {{ customerBookingError(list.error.value) }}
                </p>
                <AppButton :loading="refreshingList" @click="refreshList">Thử lại</AppButton>
              </div>
              <template v-else-if="list.data.value">
                <p v-if="list.isError.value" class="booking-error" role="alert">
                  Chưa cập nhật được danh sách. Thông tin bên dưới là lần tải gần nhất và có thể
                  chưa phản ánh trạng thái mới. Vui lòng thử lại.
                </p>
                <div class="customer-bookings__list-toolbar">
                  <h2 class="customer-bookings__list-label">
                    {{ customerBookingListTabs[activeTab].label }}
                    <span>{{ list.data.value.page.totalElements }}</span>
                  </h2>
                  <AppButton
                    v-if="list.isError.value"
                    variant="ghost"
                    size="sm"
                    :loading="refreshingList"
                    :disabled="listNavigating"
                    @click="refreshList"
                    >Thử lại</AppButton
                  >
                </div>
                <div v-if="!list.data.value.content.length" class="customer-bookings__empty">
                  <Ticket aria-hidden="true" />
                  <h2>{{ page ? 'Trang này không có đơn' : emptyListCopy.title }}</h2>
                  <p>
                    {{
                      page
                        ? 'Quay về trang đầu để xem các đơn trong nhóm này.'
                        : emptyListCopy.description
                    }}
                  </p>
                  <AppButton v-if="page" variant="ghost" @click="page = 0">Về trang đầu</AppButton>
                </div>
                <div
                  id="customer-booking-orders"
                  class="customer-bookings__list"
                  :aria-busy="list.isFetching.value"
                >
                  <BookingTicketCard
                    v-for="item in list.data.value.content"
                    :key="item.id"
                    :booking="item"
                    :now="now.getTime()"
                  />
                </div>
                <AppPagination
                  v-if="list.data.value.page.totalPages > 1"
                  :page="page + 1"
                  :total="list.data.value.page.totalElements"
                  :page-size="list.data.value.page.size"
                  :disabled="list.isFetching.value || listNavigating"
                  controls="customer-booking-orders"
                  @update:page="page = $event - 1"
                />
              </template>
            </TabsContent>
          </TabsRoot>
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
