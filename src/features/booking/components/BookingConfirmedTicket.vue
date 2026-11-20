<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TicketCheck } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import type { CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatBookingScreeningVersion } from '../mappers/booking-screening.mapper'
import { useCustomerTicketsQuery } from '../api/customer-tickets'
import { formatBookingReference } from '../mappers/booking-reference.mapper'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ booking: CustomerBooking }>()
const ticketsQuery = useCustomerTicketsQuery(() => props.booking)
const tickets = computed(() => ticketsQuery.data.value ?? [])
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
                  ? formatCinemaDateKey(getCinemaDateKey(context.showtime.startsAt))
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
        <p v-if="ticketsQuery.isPending.value" role="status">Đang tải mã vé…</p>
        <p v-else-if="ticketsQuery.isError.value" role="alert">
          Chưa thể cập nhật mã vé. Thông tin đặt vé vẫn được giữ nguyên.
        </p>
        <p v-else-if="!tickets.length" role="status">
          Đơn đã xác nhận. Mã vé chưa được phát hành, vui lòng kiểm tra lại.
        </p>
        <p v-if="tickets.length" role="status">
          {{ tickets.length }} vé đã phát hành cho đơn đặt vé này.
        </p>
        <AppButton
          size="sm"
          variant="ghost"
          :loading="ticketsQuery.isFetching.value"
          @click="ticketsQuery.refetch()"
        >
          {{ ticketsQuery.isError.value ? 'Thử lại mã vé' : 'Cập nhật mã vé' }}
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
