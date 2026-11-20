<script setup lang="ts">
import { formatBookingDate } from '../mappers/booking-date.mapper'
import { computed, ref, watch } from 'vue'
import { TicketCheck } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import type { CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatBookingScreeningVersion } from '../mappers/booking-screening.mapper'
import { useCustomerTicketsQuery } from '../api/customer-tickets'
import { formatBookingReference } from '../mappers/booking-reference.mapper'
import { formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ booking: CustomerBooking }>()
const ticketsQuery = useCustomerTicketsQuery(() => props.booking)
const tickets = computed(() => ticketsQuery.data.value ?? [])
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
const awaitingIssuance = computed(() => {
  const expected = props.booking.seatCount ?? props.booking.seats?.length
  return expected != null && expected > 0 && tickets.value.length < expected
})
const issuanceMessage = computed(() => {
  const expected = props.booking.seatCount ?? props.booking.seats?.length
  if (expected != null && tickets.value.length < expected)
    return `Đang phát hành vé: ${tickets.value.length}/${expected} đơn vị ghế. Trang sẽ tự cập nhật.`
  return `${tickets.value.length} vé đã phát hành cho đơn đặt vé này.`
})
const query = useBookingContextQuery(() => props.booking.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const screeningLabel = computed(() =>
  formatBookingScreeningVersion(context.value?.showtime.screeningVersion),
)
const imageFailed = ref(false)
watch(
  () => props.booking.showtimeId,
  () => {
    imageFailed.value = false
  },
)
const missingTime = computed(() => (query.isPending.value ? 'Đang tải…' : 'Chưa có thông tin'))
const image = computed(() =>
  imageFailed.value || !context.value?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const amount = computed(() =>
  props.booking.totalAmount === null || !props.booking.currency
    ? 'Chưa có giá xác nhận'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: props.booking.currency,
      }).format(props.booking.totalAmount),
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
        <span v-if="context?.movie.ageRating" class="booking-journey__age">{{
          context.movie.ageRating
        }}</span>
        <span class="customer-bookings__badge" data-status="CONFIRMED">Đã xác nhận</span>
        <h2>
          {{
            context?.movie.title ||
            (query.isPending.value ? 'Đang tải thông tin phim…' : 'Thông tin đặt vé')
          }}
        </h2>
        <p v-if="context">
          {{ context.cinema.name }}<br />{{ context.room.name
          }}<template v-if="screeningLabel"> · {{ screeningLabel }}</template>
        </p>
        <div v-if="query.isError.value || (query.isSuccess.value && !context)">
          <p role="status">
            Chưa tải được thông tin suất chiếu. Ghế và giá đã lưu vẫn được giữ nguyên.
          </p>
          <AppButton
            size="sm"
            variant="ghost"
            :loading="query.isFetching.value"
            @click="query.refetch()"
            >Tải lại thông tin suất</AppButton
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
        <TicketCheck aria-hidden="true" /><small>MÃ ĐƠN ĐẶT VÉ</small
        ><strong>{{ formatBookingReference(booking.id) }}</strong>
        <p v-if="ticketsQuery.isPending.value" role="status">Đang tải thông tin vé…</p>
        <p v-else-if="ticketsQuery.isError.value" role="alert">
          Chưa tải được thông tin vé. Thông tin đặt vé vẫn được giữ nguyên.
        </p>
        <p v-else-if="!tickets.length" role="status">
          {{
            awaitingIssuance
              ? 'Đơn đã xác nhận. Đang chờ phát hành vé, trang sẽ tự cập nhật.'
              : 'Đơn đã xác nhận. Mã vé chưa được phát hành, vui lòng kiểm tra lại.'
          }}
        </p>
        <p v-if="tickets.length && !ticketsQuery.isError.value" role="status">
          {{ issuanceMessage }}
        </p>
        <AppButton
          v-if="
            ticketsQuery.isError.value ||
            (ticketsQuery.isSuccess.value && !tickets.length && !awaitingIssuance)
          "
          size="sm"
          variant="ghost"
          :loading="refreshingTickets"
          @click="refreshTickets"
        >
          Thử tải lại vé
        </AppButton>
        <p>In vé được thực hiện bởi nhân viên hoặc máy POS tại rạp.</p>
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
