<script setup lang="ts">
import { computed, ref } from 'vue'
import { TicketCheck } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import type { CustomerBooking } from '../api/customer-bookings'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{ booking: CustomerBooking }>()
const query = useBookingContextQuery(() => props.booking.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const imageFailed = ref(false)
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
          }}<template v-if="context.showtime.screeningVersion?.contentFormat">
            · {{ context.showtime.screeningVersion.contentFormat }}</template
          ><template v-if="context.showtime.screeningVersion?.audioLanguage">
            · {{ context.showtime.screeningVersion.audioLanguage }}</template
          >
        </p>
        <div v-if="query.isError.value || (query.isSuccess.value && !context)">
          <p>Chưa tải được thông tin suất chiếu. Ghế và giá đã lưu vẫn được giữ nguyên.</p>
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
                  : '—'
              }}
            </dd>
          </div>
          <div>
            <dt>Giờ chiếu · UTC+7</dt>
            <dd>
              {{ context?.showtime.startsAt ? formatCinemaTime(context.showtime.startsAt) : '—' }}
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
        ><strong>{{ booking.id }}</strong>
        <p>Chưa có mã QR từ hệ thống. Đây là thông tin đơn đã được xác nhận.</p>
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
