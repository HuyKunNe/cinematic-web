<script setup lang="ts">
import { formatBookingDate } from '../mappers/booking-date.mapper'
import { computed, ref, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { TicketCheck } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import type { CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatBookingScreeningVersion } from '../mappers/booking-screening.mapper'
import { useCustomerPickupQuery } from '../api/customer-pickup'
import { formatBookingReference } from '../mappers/booking-reference.mapper'
import { formatSavedBookingMoney } from '../mappers/booking-money.mapper'
import { formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ booking: CustomerBooking }>()
const auth = useAuthStore()
const ticketsQuery = useCustomerPickupQuery(() => props.booking)
const pickup = computed(() =>
  auth.isAuthenticated &&
  props.booking.userId === auth.subject &&
  ticketsQuery.data.value?.bookingId === props.booking.id
    ? ticketsQuery.data.value
    : undefined,
)
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
const pickupDeadlineReached = computed(() => {
  const pass = pickup.value
  return (
    pass?.status === 'READY' &&
    !!pass.expiresAt &&
    Date.parse(pass.expiresAt) <= now.value.getTime()
  )
})
const pickupQrImage = computed(() =>
  ticketsQuery.isFetchedAfterMount.value &&
  !ticketsQuery.isError.value &&
  pickup.value?.status === 'READY' &&
  !pickupDeadlineReached.value
    ? pickup.value.qrImage
    : undefined,
)
watch(pickupDeadlineReached, (reached) => {
  if (reached) void ticketsQuery.refetch({ cancelRefetch: false })
})
const refreshingTickets = ref(false)
async function refreshTickets() {
  if (refreshingTickets.value) return
  refreshingTickets.value = true
  try {
    await ticketsQuery.refetch({ cancelRefetch: false })
  } finally {
    refreshingTickets.value = false
  }
}
const issuanceMessage = computed(() => {
  const pass = pickup.value
  if (!pass) return ''
  switch (pass.status) {
    case 'WAITING_FOR_TICKETS':
      return `Đang phát hành vé: ${pass.issuedTickets}/${pass.expectedTickets} đơn vị ghế. Trang sẽ tự cập nhật.`
    case 'READY':
      return pickupDeadlineReached.value
        ? ticketsQuery.isFetching.value
          ? 'Mã nhận vé đã đến hạn hiệu lực. Đang kiểm tra trạng thái với hệ thống.'
          : 'Mã nhận vé đã đến hạn hiệu lực. Vui lòng kiểm tra lại trạng thái với hệ thống.'
        : 'Xuất trình QR này tại quầy hoặc POS để nhận toàn bộ vé của đơn.'
    case 'EXPIRED':
      return 'Mã nhận vé chung đã hết hiệu lực.'
    case 'TICKETS_USED':
      return 'Đơn có vé đã sử dụng, không còn mã nhận vé chung khả dụng.'
    case 'NOT_CONFIRMED':
      return 'Hệ thống chưa xác nhận đơn để cấp mã nhận vé chung.'
    case 'UNAVAILABLE':
      return 'Hiện chưa thể cấp mã nhận vé chung. Vui lòng liên hệ rạp để được hỗ trợ.'
  }
})
const query = useBookingContextQuery(() => props.booking.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const screeningLabel = computed(() =>
  formatBookingScreeningVersion(context.value?.showtime.screeningVersion),
)
const imageFailed = ref(false)
watch(
  () => context.value?.movie?.posterUrl,
  () => {
    imageFailed.value = false
  },
)
const missingTime = computed(() => (query.isPending.value ? 'Đang tải…' : 'Chưa có thông tin'))
const image = computed(() =>
  imageFailed.value || !context.value?.movie?.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const amount = computed(() =>
  formatSavedBookingMoney(props.booking.totalAmount, props.booking.currency, props.booking.status),
)
</script>

<template>
  <article
    v-if="booking.status === 'CONFIRMED'"
    class="booking-confirmed-ticket"
    aria-label="Thông tin vé đã xác nhận"
  >
    <header class="booking-confirmed-ticket__top">
      <strong>cinematic <small>CINEMA</small></strong
      ><span>ĐẶT VÉ ĐÃ XÁC NHẬN</span>
    </header>
    <div class="booking-confirmed-ticket__content">
      <img
        :src="image"
        alt=""
        class="booking-confirmed-ticket__poster"
        @error="imageFailed = true"
      />
      <div class="booking-confirmed-ticket__movie">
        <span v-if="context?.movie?.ageRating" class="booking-journey__age">{{
          context.movie.ageRating
        }}</span>
        <span class="customer-bookings__badge" data-status="CONFIRMED">Đã xác nhận</span>
        <h2>
          {{
            context?.movie?.title ||
            (query.isPending.value ? 'Đang tải thông tin phim…' : 'Thông tin đặt vé')
          }}
        </h2>
        <p v-if="context">
          {{ context.cinema.name }}<br />{{ context.room.name
          }}<template v-if="screeningLabel"> · {{ screeningLabel }}</template>
        </p>
        <div v-if="query.isError.value || (query.isSuccess.value && (!context || !context.movie))">
          <p role="status">
            {{
              context && !context.movie
                ? 'Thông tin phim chưa khả dụng. Ghế và giá vé đã lưu vẫn được giữ nguyên.'
                : 'Chưa tải được thông tin suất chiếu. Ghế và giá đã lưu vẫn được giữ nguyên.'
            }}
          </p>
          <AppButton
            size="sm"
            variant="ghost"
            :loading="query.isFetching.value"
            @click="query.refetch({ cancelRefetch: false })"
            >{{
              context && !context.movie ? 'Thử lại thông tin phim' : 'Tải lại thông tin suất'
            }}</AppButton
          >
        </div>
        <dl class="booking-confirmed-ticket__facts">
          <div>
            <dt>Ngày xem</dt>
            <dd>
              {{
                context?.showtime.startsAt
                  ? formatBookingDate(getCinemaDateKey(context.showtime.startsAt))
                  : missingTime
              }}
            </dd>
          </div>
          <div>
            <dt>Giờ chiếu · UTC+7</dt>
            <dd>
              {{
                context?.showtime.startsAt
                  ? formatCinemaTime(context.showtime.startsAt)
                  : missingTime
              }}
            </dd>
          </div>
          <div>
            <dt>Ghế / đơn vị bán</dt>
            <dd>
              {{
                booking.seats?.map((seat) => seat.seatNumber).join(', ') || 'Chưa có thông tin ghế'
              }}
            </dd>
          </div>
          <div>
            <dt>Số khách</dt>
            <dd>{{ booking.capacity ?? '—' }}</dd>
          </div>
        </dl>
      </div>
      <div class="booking-confirmed-ticket__code">
        <img
          v-if="pickupQrImage"
          :src="pickupQrImage"
          class="booking-confirmed-ticket__qr"
          alt="QR nhận toàn bộ vé của đơn đặt vé"
        />
        <TicketCheck v-else aria-hidden="true" /><small>MÃ ĐƠN ĐẶT VÉ</small
        ><strong>{{ formatBookingReference(booking.id) }}</strong>
        <p v-if="ticketsQuery.isPending.value" role="status">Đang tải thông tin vé…</p>
        <p v-else-if="ticketsQuery.isError.value" role="alert">
          Chưa tải được thông tin vé. Thông tin đặt vé vẫn được giữ nguyên.
        </p>
        <p v-else-if="pickup" role="status">
          {{ issuanceMessage }}
        </p>
        <AppButton
          v-if="
            ticketsQuery.isError.value ||
            (pickupDeadlineReached && (!ticketsQuery.isFetching.value || refreshingTickets))
          "
          size="sm"
          variant="ghost"
          :loading="refreshingTickets"
          @click="refreshTickets"
        >
          {{ ticketsQuery.isError.value ? 'Thử tải lại vé' : 'Kiểm tra mã nhận vé' }}
        </AppButton>
      </div>
    </div>
    <footer class="booking-confirmed-ticket__bottom">
      <span
        >Vui lòng đến trước giờ chiếu 15 phút. Mang theo giấy tờ phù hợp độ tuổi và đối tượng
        vé.</span
      ><strong>{{ amount }}</strong>
    </footer>
  </article>
</template>
