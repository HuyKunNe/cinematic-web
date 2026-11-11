<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import type { RouteLocationRaw } from 'vue-router'
import { formatCinemaDateKey, formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import BookingCheckout from './BookingCheckout.vue'
import BookingSeatMatrix from './BookingSeatMatrix.vue'
import { useBookingSeatsQuery, type BookingContext } from '../api/booking-queries'
import {
  bookingSeatQuoteErrorMessage,
  MAX_QUOTED_SEATS,
  useBookingSeatQuote,
} from '../api/booking-seat-quote'
import { bookingSeatStatusLabels, formatBookingMoney } from '../mappers/booking-seat.mapper'
import type { BookingSeat, SelectedBookingSeat } from '../models/booking-seat.model'

const props = defineProps<{
  context: BookingContext
  changeShowtimeTo: RouteLocationRaw
  showtimeId: string
  roomId: string
  disabled: boolean
}>()

const query = useBookingSeatsQuery(
  () => props.showtimeId,
  () => props.roomId,
)

const selection = ref<SelectedBookingSeat[]>([])
const selectionNotice = ref('')
const checkoutLocked = ref(false)

const seats = computed(() => query.data.value?.seats ?? [])

const seatLoadError = computed(() => {
  const error = query.error.value
  if (error?.code === 'INVENTORY_SHOWTIME_LAYOUT_REQUIRED') {
    return 'Suất chiếu chưa được gắn sơ đồ ghế. Vui lòng chọn suất khác hoặc liên hệ rạp.'
  }
  if (error?.status === 409) {
    return 'Sơ đồ ghế của suất chiếu chưa sẵn sàng. Vui lòng thử lại hoặc chọn suất khác.'
  }
  if (error?.status === 404) return 'Không tìm thấy suất chiếu hoặc sơ đồ ghế.'
  if (error?.status === 401 || error?.status === 403) {
    return 'Bạn chưa có quyền tải ghế. Vui lòng đăng nhập lại và thử lại.'
  }
  return 'Không thể tải danh sách ghế hợp lệ. Vui lòng bấm Làm mới để thử lại.'
})

const rows = computed(() => {
  const grouped = new Map<string, BookingSeat[]>()

  for (const seat of seats.value) {
    const row = grouped.get(seat.rowLabel) ?? []
    row.push(seat)
    grouped.set(seat.rowLabel, row)
  }

  return [...grouped].map(([label, items]) => ({ label, seats: items }))
})

const ready = computed(
  () =>
    !props.disabled &&
    !checkoutLocked.value &&
    query.isSuccess.value &&
    !query.isFetching.value &&
    !query.isError.value,
)

const chosenSeats = computed(() =>
  seats.value.filter(
    (seat) =>
      seat.selectable &&
      selection.value.some(
        (selected) => selected.id === seat.id && selected.priceMinor === seat.priceMinor,
      ),
  ),
)

const quoteQuery = useBookingSeatQuote(
  () => props.showtimeId,
  () => chosenSeats.value.map((seat) => seat.seatNumber),
  ready,
)
const quote = computed(() =>
  ready.value &&
  chosenSeats.value.length > 0 &&
  quoteQuery.isSuccess.value &&
  !quoteQuery.isFetching.value
    ? quoteQuery.data.value
    : undefined,
)
const ticketConditions = computed(() => [...new Set(
  (quote.value?.seats ?? []).map((seat) => seat.eligibilityDescription).filter(Boolean),
)])
const totalLabel = computed(() => {
  if (quote.value) return formatBookingMoney(quote.value.totalMinor)
  if (!chosenSeats.value.length) return formatBookingMoney(0)
  if (quoteQuery.isError.value || query.isError.value) return 'Chưa có báo giá'
  return 'Đang xác nhận…'
})

const posterFailed = ref(false)
const poster = computed(() => posterFailed.value || !props.context.movie.posterUrl
  ? '/customer/movie-placeholder.svg' : props.context.movie.posterUrl)
const showDate = computed(() => {
  const date = props.context.showtime.startsAt
  return date ? formatCinemaDateKey(getCinemaDateKey(date)) : ''
})
const showTime = computed(() => props.context.showtime.startsAt ? formatCinemaTime(props.context.showtime.startsAt) : '')
const priceLines = computed(() => {
  const groups = new Map<string, { label: string; count: number; amount: number }>()
  for (const seat of quote.value?.seats ?? []) {
    const label = `${seat.ticketGroupName} / ${seat.unit === 'PAIR' ? 'cặp' : 'ghế'}`
    const key = `${label}:${seat.priceMinor}`
    const line = groups.get(key) ?? { label, count: 0, amount: 0 }
    line.count += 1
    line.amount += seat.priceMinor
    groups.set(key, line)
  }
  return [...groups].map(([key, line]) => ({ key, ...line }))
})

const hasAvailableSeats = computed(() => seats.value.some((seat) => seat.selectable))

function isSelected(seat: BookingSeat): boolean {
  return chosenSeats.value.some((selected) => selected.id === seat.id)
}

function toggleSeat(seat: BookingSeat) {
  if (!ready.value || !seat.selectable || seat.priceMinor === null) return

  selectionNotice.value = ''

  if (isSelected(seat)) {
    selection.value = selection.value.filter((item) => item.id !== seat.id)
  } else {
    if (chosenSeats.value.length >= MAX_QUOTED_SEATS) {
      selectionNotice.value = `Mỗi lần chỉ báo giá tối đa ${MAX_QUOTED_SEATS} đơn vị ghế.`
      return
    }
    selection.value = [...selection.value, { id: seat.id, priceMinor: seat.priceMinor }]
  }
}

watch(
  () => query.data.value,
  (updatedSeats) => {
    if (!updatedSeats || checkoutLocked.value) return

    const remaining = selection.value.filter((selected) =>
      updatedSeats.seats.some(
        (seat) =>
          seat.id === selected.id && seat.selectable && seat.priceMinor === selected.priceMinor,
      ),
    )

    if (remaining.length !== selection.value.length) {
      selectionNotice.value =
        'Một số ghế đã đổi giá hoặc không còn trống và được bỏ khỏi lựa chọn. Vui lòng chọn lại.'
      selection.value = remaining
    }
  },
)
</script>

<template>
  <div class="booking-seats lumiere-seat-booking">
    <section class="lumiere-seat-booking__main" aria-labelledby="booking-seats-title">
      <header class="lumiere-seat-booking__heading">
        <p class="lumiere-eyebrow">CHỌN GHẾ</p>
        <h1 id="booking-seats-title">Chọn góc nhìn của bạn</h1>
        <p>Chọn vị trí yêu thích và kiểm tra báo giá cho từng vé.</p>
      </header>
      <div class="booking-panel__heading lumiere-seat-booking__toolbar">
        <span>{{ context.room.name }}<template v-if="context.showtime.screeningVersion?.contentFormat"> · {{ context.showtime.screeningVersion.contentFormat }}</template></span>
        <AppButton
          variant="ghost"
          size="sm"
          :loading="query.isFetching.value"
          :disabled="checkoutLocked"
          @click="query.refetch()"
        >
          Làm mới
        </AppButton>
      </div>

      <p v-if="selectionNotice" class="booking-notice" role="status">
        {{ selectionNotice }}
      </p>

      <p v-if="query.isError.value" class="booking-error" role="alert">
        {{ seatLoadError }}
      </p>

      <p v-else-if="query.isPending.value && !query.data.value" class="booking-note" role="status">
        Đang tải ghế…
      </p>

      <template v-else-if="seats.length">
        <p v-if="query.isSuccess.value && !hasAvailableSeats" class="booking-notice" role="status">
          Hiện không có ghế trống để chọn cho suất này.
        </p>

        <BookingSeatMatrix
          v-if="query.data.value?.matrix"
          :seats="seats"
          :matrix="query.data.value.matrix"
          :selected-ids="chosenSeats.map((seat) => seat.id)"
          :disabled="!ready"
          @select="toggleSeat"
        />
        <template v-else>
          <p class="booking-note">Sơ đồ cũ hiển thị theo hàng, không thể hiện vị trí thực trong phòng.</p>
          <div v-for="row in rows" :key="row.label" class="booking-seat-row">
            <h3>Hàng {{ row.label }}</h3>

            <ul class="booking-seat-list">
              <li v-for="seat in row.seats" :key="seat.id">
                <button
                  class="booking-seat"
                  :class="{
                    'booking-seat--selected': isSelected(seat),
                  }"
                  type="button"
                  :aria-pressed="isSelected(seat)"
                  :disabled="!ready || !seat.selectable"
                  @click="toggleSeat(seat)"
                >
                  <strong>{{ seat.seatNumber }}</strong>
                  <span>{{ seat.typeLabel }}</span>
                  <span>
                    {{
                      seat.priceMinor === null ? 'Chưa có giá' : formatBookingMoney(seat.priceMinor)
                    }}
                  </span>
                  <span>
                    {{ isSelected(seat) ? 'Đã chọn' : bookingSeatStatusLabels[seat.status] }}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </template>

      <p v-else-if="query.isSuccess.value" class="booking-note" role="status">
        Chưa có danh sách ghế để chọn cho suất chiếu này.
      </p>
      <div v-if="ticketConditions.length" class="booking-notice">
        <strong>Điều kiện vé theo đối tượng</strong>
        <p v-for="condition in ticketConditions" :key="condition">{{ condition }}</p>
      </div>
      <AppLink :to="changeShowtimeTo" variant="muted">← Đổi suất chiếu</AppLink>
    </section>

    <aside class="booking-panel booking-summary" aria-labelledby="booking-summary-title">
      <h2 id="booking-summary-title" class="lumiere-seat-booking__summary-title">CUỘC HẸN CỦA BẠN</h2>
      <div class="lumiere-seat-booking__film">
        <img :src="poster" :alt="context.movie.title || 'Poster phim'" @error="posterFailed = true" />
        <div>
          <span v-if="context.movie.ageRating" class="lumiere-seat-booking__age">{{ context.movie.ageRating }}</span>
          <h3>{{ context.movie.title }}</h3>
          <p v-if="context.movie.durationMinutes">{{ context.movie.durationMinutes }} phút</p>
          <p v-if="context.showtime.screeningVersion?.contentFormat">{{ context.showtime.screeningVersion.contentFormat }}<template v-if="context.showtime.screeningVersion.audioLanguage"> · {{ context.showtime.screeningVersion.audioLanguage }}</template></p>
        </div>
      </div>
      <div class="lumiere-seat-booking__location">
        <strong>{{ context.cinema.name }}</strong>
        <p>{{ context.room.name }}</p>
        <p><strong>{{ showTime }}</strong> · {{ showDate }}</p>
      </div>
      <div class="lumiere-seat-booking__recap" aria-live="polite">
        <span>Ghế đã chọn</span>
        <strong>{{ chosenSeats.length ? chosenSeats.map((seat) => seat.seatNumber).join(', ') : 'Chưa chọn ghế' }}</strong>
        <small v-if="chosenSeats.length">{{ chosenSeats.length }} đơn vị ghế · {{ chosenSeats.reduce((sum, seat) => sum + seat.capacity, 0) }} khách</small>
      </div>
      <dl class="booking-summary__totals">
        <div v-for="line in priceLines" :key="line.key">
          <dt>{{ line.count }} × {{ line.label }}</dt>
          <dd>{{ formatBookingMoney(line.amount) }}</dd>
        </div>
        <div class="lumiere-seat-booking__total">
          <dt>Tổng tiền</dt>
          <dd>{{ totalLabel }}</dd>
        </div>
      </dl>
        <p v-if="chosenSeats.length && !ready" class="booking-note" role="status">
          Đang chờ danh sách ghế hợp lệ để báo giá.
        </p>
        <p v-else-if="quoteQuery.isFetching.value" class="booking-note" role="status">
          Đang xác nhận giá vé…
        </p>
        <div v-else-if="quoteQuery.isError.value">
          <p class="booking-error" role="alert">
            {{ bookingSeatQuoteErrorMessage(quoteQuery.error.value) }}
          </p>
          <AppButton variant="ghost" size="sm" @click="query.refetch()">
            Làm mới ghế và báo giá
          </AppButton>
        </div>

        <AppButton
          variant="ghost"
          size="sm"
          :disabled="checkoutLocked"
          @click="
            () => {
              selection = []
              selectionNotice = ''
            }
          "
        >
          Bỏ chọn tất cả
        </AppButton>
      <BookingCheckout
        :showtime-id="showtimeId"
        :seat-numbers="chosenSeats.map((seat) => seat.seatNumber)"
        :total-amount="quote?.totalAmount"
        :disabled="!ready || !quote || quoteQuery.isFetching.value"
        @locked="checkoutLocked = $event"
        @rejected="query.refetch()"
      />
      <p class="lumiere-seat-booking__summary-note">Ghế chỉ được giữ sau khi yêu cầu đặt vé được xác nhận.</p>
    </aside>
  </div>
</template>
