<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useIntervalFn, useNow } from '@vueuse/core'
import { useBookingContextQuery, useBookingSeatsQuery } from '../api/booking-queries'
import {
  bookingQuoteSelectionKey,
  bookingSeatQuoteErrorMessage,
  useBookingSeatQuote,
} from '../api/booking-seat-quote'
import { useBookingSelection } from '../composables/use-booking-selection'
import { seatSelectionError } from '../utils/seat-selection-rules'
import type { BookingReview } from '../models/booking-review.model'
import { formatCinemaTime, formatCinemaDateKey, getCinemaDateKey } from '@/utils/cinema-time'
import BookingCheckout from './BookingCheckout.vue'
import BookingSavedSeats from './BookingSavedSeats.vue'
import BookingJourneySummary from './BookingJourneySummary.vue'
import BookingCheckoutRecap from './BookingCheckoutRecap.vue'
import BookingProcessing from './BookingProcessing.vue'

const props = defineProps<{ showtimeId: string }>()
const emit = defineEmits<{ processing: [value: boolean] }>()
const processing = ref(false)
function updateProcessing(value: boolean) { processing.value = value; emit('processing', value) }
const selection = useBookingSelection(props.showtimeId)
const contextQuery = useBookingContextQuery(() => props.showtimeId)
const context = computed(() => contextQuery.data.value)
const seatsQuery = useBookingSeatsQuery(
  () => props.showtimeId,
  () => context.value?.room.id ?? '',
)
const quoteQuery = useBookingSeatQuote(() => props.showtimeId, selection.numbers)
const now = useNow({ scheduler: (update) => useIntervalFn(update, 1_000) })
const requestLocked = ref(false)
const chosen = computed(() =>
  (seatsQuery.data.value?.seats ?? []).filter((seat) =>
    selection.numbers.value.includes(seat.seatNumber),
  ),
)
const selectionError = computed(() => {
  if (requestLocked.value) return ''
  if (!selection.numbers.value.length) return 'Chưa có ghế được chọn. Vui lòng quay lại chọn ghế.'
  if (!seatsQuery.isSuccess.value) return ''
  if (
    chosen.value.length !== selection.numbers.value.length ||
    chosen.value.some((seat) => !seat.selectable)
  )
    return 'Một số ghế đã thay đổi hoặc không còn trống. Vui lòng quay lại chọn ghế.'
  return seatSelectionError(seatsQuery.data.value?.seats ?? [], chosen.value)
})
const ready = computed(
  () =>
    !requestLocked.value &&
    contextQuery.isSuccess.value &&
    !contextQuery.isFetching.value &&
    !contextQuery.isError.value &&
    seatsQuery.isSuccess.value &&
    !seatsQuery.isFetching.value &&
    !seatsQuery.isError.value &&
    context.value?.showtime.status === 'OPEN_FOR_BOOKING' &&
    context.value.room.active === true &&
    context.value.cinema.active === true &&
    Date.parse(context.value.showtime.startsAt ?? '') > now.value.getTime() &&
    !selectionError.value,
)
const checked = ref(false)
const error = ref('')
const quote = computed(() =>
  checked.value &&
  quoteQuery.data.value?.showtimeId === props.showtimeId &&
  bookingQuoteSelectionKey(quoteQuery.data.value.seats.map((seat) => seat.seatNumber)) ===
    bookingQuoteSelectionKey(selection.numbers.value)
    ? quoteQuery.data.value
    : undefined,
)
const review = computed<BookingReview | undefined>(() => {
  if (!quote.value || !context.value?.showtime.startsAt) return undefined
  return {
    movieTitle: context.value.movie.title || 'Phim chưa có tên',
    cinemaName: context.value.cinema.name || '',
    roomName: context.value.room.name || '',
    showtimeLabel: `${formatCinemaTime(context.value.showtime.startsAt)} · ${formatCinemaDateKey(getCinemaDateKey(context.value.showtime.startsAt))}`,
    totalMinor: quote.value.totalMinor,
    seats: quote.value.seats
      .map((seat) => ({
        seatNumber: seat.seatNumber,
        typeLabel:
          chosen.value.find((item) => item.seatNumber === seat.seatNumber)?.typeLabel ||
          seat.seatType,
        ticketGroupId: seat.ticketGroupId,
        ticketGroupName: seat.ticketGroupName,
        capacity: seat.capacity,
        priceMinor: seat.priceMinor,
        unit: seat.unit,
      }))
      .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)),
  }
})
async function refreshQuote() {
  if (!ready.value || quoteQuery.isFetching.value) return undefined
  error.value = ''
  try {
    await quoteQuery.refetch({ throwOnError: true })
    if (!ready.value) {
      checked.value = false
      return undefined
    }
    checked.value = true
    return review.value
  } catch (cause) {
    checked.value = false
    error.value = bookingSeatQuoteErrorMessage(cause)
    throw cause
  }
}
async function prepareReview() {
  const previous = JSON.stringify(review.value)
  const current = await refreshQuote()
  if (current && JSON.stringify(current) !== previous)
    throw new Error('Báo giá đã thay đổi. Vui lòng kiểm tra giá mới và xác nhận thanh toán lại.')
  return current
}
let initialized = false
watch(
  ready,
  (value) => {
    if (value && !initialized) {
      initialized = true
      void refreshQuote().catch(() => {})
    }
  },
  { immediate: true },
)
async function retry() {
  await contextQuery.refetch()
  if (!contextQuery.isSuccess.value || !context.value?.room.id) return
  await seatsQuery.refetch()
  if (ready.value) await refreshQuote().catch(() => {})
}
</script>

<template>
  <BookingProcessing v-if="processing" />
  <!-- Keep the request owner mounted while the processing view is visible. -->
  <div v-show="!processing" class="booking-journey__layout">
    <div class="booking-journey__main">
      <header class="booking-journey__heading">
        <p class="lumiere-eyebrow">BƯỚC 03</p>
        <h1>Kiểm tra để an tâm tận hưởng</h1>
        <p>Kiểm tra suất chiếu, ghế và chọn phương thức thanh toán trước khi xác nhận.</p>
      </header>
      <section class="booking-panel booking-journey__checkout-items">
        <h2>Thông tin đặt vé</h2>
        <p
          v-if="
            contextQuery.isPending.value ||
            (context && seatsQuery.isPending.value) ||
            quoteQuery.isFetching.value
          "
          class="booking-note"
          role="status"
        >
          Đang kiểm tra ghế và báo giá…
        </p>
        <BookingSavedSeats v-if="quote" :quote="quote" />
        <p v-if="contextQuery.isSuccess.value && !context" class="booking-error" role="alert">
          Thông tin suất chiếu chưa đầy đủ hoặc không khớp. Vui lòng chọn lại suất chiếu.
        </p>
        <p v-if="selectionError" id="booking-selection-error" class="booking-error" role="alert">
          {{ selectionError }}
        </p>
        <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
        <p
          v-if="contextQuery.isError.value || seatsQuery.isError.value"
          class="booking-error"
          role="alert"
        >
          Chưa thể kiểm tra thông tin suất và ghế. Vui lòng thử lại.
        </p>
        <p
          v-if="
            !requestLocked &&
            context &&
            !ready &&
            !contextQuery.isFetching.value &&
            !seatsQuery.isFetching.value &&
            !selectionError
          "
          class="booking-note"
        >
          Suất chiếu chưa sẵn sàng để tiếp tục đặt vé.
        </p>
        <RouterLink
          v-if="!requestLocked"
          class="customer-bookings__link"
          :to="{ name: ROUTE_NAMES.BOOKING, params: { showtimeId } }"
          >← Thay đổi ghế</RouterLink
        >
        <AppButton
          v-if="
            !requestLocked &&
            (error ||
              contextQuery.isError.value ||
              seatsQuery.isError.value ||
              (ready && !quote && !quoteQuery.isFetching.value))
          "
          variant="secondary"
          size="sm"
          :loading="
            contextQuery.isFetching.value ||
            seatsQuery.isFetching.value ||
            quoteQuery.isFetching.value
          "
          @click="retry"
          >Thử lại báo giá</AppButton
        >
      </section>
      <div v-if="quote?.seats.some((seat) => seat.eligibilityDescription)" class="booking-notice">
        <strong>Điều kiện vé theo đối tượng</strong>
        <p
          v-for="condition in [
            ...new Set(quote.seats.map((seat) => seat.eligibilityDescription).filter(Boolean)),
          ]"
          :key="condition"
        >
          {{ condition }}
        </p>
      </div>
      <section class="booking-panel booking-journey__payment">
        <BookingCheckout
          page
          :showtime-id="showtimeId"
          :seat-numbers="selection.numbers.value"
          :review="review"
          :prepare-review="prepareReview"
          :total-amount="quote?.totalAmount"
          :selection-error="selectionError"
          :disabled="!ready || !quote || quoteQuery.isFetching.value"
          @locked="requestLocked = $event"
          @processing="updateProcessing"
        />
      </section>
    </div>
    <BookingJourneySummary v-if="quote" id="booking-checkout-summary" :quote="quote" />
    <BookingCheckoutRecap v-if="quote" :quote="quote" />
  </div>
</template>
