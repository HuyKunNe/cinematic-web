<script setup lang="ts">
import { computed, ref } from 'vue'
import { Ticket, Clock3 } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import type { CustomerBooking } from '../api/customer-bookings'
import type { BookingSeatQuote } from '../api/booking-seat-quote'
import { useBookingContextQuery } from '../api/booking-queries'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'

const props = defineProps<{
  booking?: CustomerBooking
  quote?: BookingSeatQuote
  remaining?: string
  expired?: boolean
}>()
const source = computed(() => props.booking ?? props.quote)
const query = useBookingContextQuery(() => source.value?.showtimeId ?? '', { poll: false })
const context = computed(() => query.data.value)
const imageFailed = ref(false)
const poster = computed(() =>
  imageFailed.value || !context.value?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const amount = computed(() =>
  source.value?.totalAmount == null || !source.value.currency
    ? 'Đang xác nhận'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: source.value.currency,
      }).format(source.value.totalAmount),
)
</script>

<template>
  <aside class="booking-journey__summary booking-panel" aria-labelledby="journey-summary-title">
    <div class="booking-journey__summary-title">
      <h2 id="journey-summary-title">CUỘC HẸN CỦA BẠN</h2>
      <Ticket aria-hidden="true" />
    </div>
    <div class="booking-journey__summary-film">
      <img :src="poster" alt="" @error="imageFailed = true" />
      <div>
        <span v-if="context?.movie.ageRating" class="booking-journey__age">{{
          context.movie.ageRating
        }}</span>
        <h3>
          {{
            context?.movie.title ||
            (query.isPending.value ? 'Đang tải phim…' : 'Thông tin suất chiếu')
          }}
        </h3>
        <p v-if="context">
          <template v-if="context.movie.durationMinutes"
            >{{ context.movie.durationMinutes }} phút</template
          ><template v-if="context.showtime.screeningVersion?.contentFormat">
            · {{ context.showtime.screeningVersion.contentFormat }}</template
          ><br />{{ context.showtime.screeningVersion?.audioLanguage }}
        </p>
      </div>
    </div>
    <div v-if="context" class="booking-journey__summary-location">
      <strong>{{ context.cinema.name }}</strong>
      <p>{{ context.room.name }}</p>
      <p v-if="context.showtime.startsAt">
        <strong>{{ formatCinemaTime(context.showtime.startsAt) }}</strong> ·
        {{ formatCinemaDateKey(getCinemaDateKey(context.showtime.startsAt)) }}
      </p>
    </div>
    <div v-if="query.isError.value || (query.isSuccess.value && !context)" class="booking-note">
      <p>Chưa tải được thông tin suất.</p>
      <AppButton
        variant="ghost"
        size="sm"
        :loading="query.isFetching.value"
        @click="query.refetch()"
        >Thử lại</AppButton
      >
    </div>
    <div class="booking-journey__summary-seats">
      <span>Ghế đã chọn</span
      ><strong>{{
        source?.seats?.map((seat) => seat.seatNumber).join(', ') || 'Đang xác nhận'
      }}</strong
      ><small>{{ source?.seatCount ?? '—' }} đơn vị · {{ source?.capacity ?? '—' }} khách</small>
    </div>
    <dl class="booking-journey__price-breakdown">
      <div>
        <dt>Tiền vé</dt>
        <dd>{{ amount }}</dd>
      </div>
      <div class="booking-journey__total">
        <dt>Tổng thanh toán</dt>
        <dd>{{ amount }}</dd>
      </div>
    </dl>
    <div v-if="booking?.status === 'RESERVED'" class="booking-journey__clock">
      <Clock3 aria-hidden="true" /><span
        >{{ expired ? 'Đã đến hạn giữ ghế. Đang chờ cập nhật.' : 'Giữ chỗ còn' }}
        <strong v-if="!expired">{{ remaining }}</strong></span
      >
    </div>
  </aside>
</template>
