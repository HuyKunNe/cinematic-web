<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useBookingSeatsQuery } from '../api/booking-queries'
import { bookingSeatStatusLabels, formatBookingMoney } from '../mappers/booking-seat.mapper'
import type { BookingSeat, SelectedBookingSeat } from '../models/booking-seat.model'

const props = defineProps<{
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

const seats = computed(() => query.data.value ?? [])

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
  () => !props.disabled && query.isSuccess.value && !query.isFetching.value && !query.isError.value,
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

const totalMinor = computed(() =>
  chosenSeats.value.reduce((sum, seat) => sum + (seat.priceMinor ?? 0), 0),
)

const capacity = computed(() => chosenSeats.value.reduce((sum, seat) => sum + seat.capacity, 0))

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
    selection.value = [...selection.value, { id: seat.id, priceMinor: seat.priceMinor }]
  }
}

watch(
  () => query.data.value,
  (updatedSeats) => {
    if (!updatedSeats) return

    const remaining = selection.value.filter((selected) =>
      updatedSeats.some(
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
  <div class="booking-seats">
    <section class="booking-panel" aria-labelledby="booking-seats-title">
      <div class="booking-panel__heading">
        <h2 id="booking-seats-title">Danh sách ghế theo hàng</h2>
        <AppButton
          variant="ghost"
          size="sm"
          :loading="query.isFetching.value"
          @click="query.refetch()"
        >
          Làm mới
        </AppButton>
      </div>

      <p class="booking-note">
        Danh sách này không thể hiện vị trí thực tế trong phòng chiếu. Ghế bạn chọn chưa được giữ.
      </p>

      <p v-if="query.isError.value" class="booking-error" role="alert">
        Không thể tải hoặc cập nhật ghế. Vui lòng nhấn Làm mới để thử lại.
      </p>

      <p v-if="selectionNotice" class="booking-notice" role="status">
        {{ selectionNotice }}
      </p>

      <p v-if="query.isPending.value && !query.data.value" class="booking-note" role="status">
        Đang tải ghế…
      </p>

      <template v-else-if="seats.length">
        <p v-if="query.isSuccess.value && !hasAvailableSeats" class="booking-notice" role="status">
          Hiện không có ghế trống để chọn cho suất này.
        </p>

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

      <p v-else-if="query.isSuccess.value" class="booking-note" role="status">
        Chưa có danh sách ghế để chọn cho suất chiếu này.
      </p>
    </section>

    <aside class="booking-panel booking-summary" aria-labelledby="booking-summary-title">
      <h2 id="booking-summary-title">Lựa chọn của bạn</h2>

      <p v-if="!chosenSeats.length" class="booking-note">Chọn ghế còn trống để xem tạm tính.</p>

      <template v-else>
        <ul class="booking-summary__seats">
          <li v-for="seat in chosenSeats" :key="seat.id">
            <span>{{ seat.seatNumber }} · {{ seat.typeLabel }}</span>
            <strong>{{ formatBookingMoney(seat.priceMinor ?? 0) }}</strong>
          </li>
        </ul>

        <dl class="booking-summary__totals">
          <div>
            <dt>Đơn vị ghế</dt>
            <dd>{{ chosenSeats.length }}</dd>
          </div>
          <div>
            <dt>Sức chứa</dt>
            <dd>{{ capacity }} người</dd>
          </div>
          <div>
            <dt>Tạm tính</dt>
            <dd>{{ formatBookingMoney(totalMinor) }}</dd>
          </div>
        </dl>

        <AppButton
          variant="ghost"
          size="sm"
          @click="
            () => {
              selection = []
              selectionNotice = ''
            }
          "
        >
          Bỏ chọn tất cả
        </AppButton>
      </template>

      <p class="booking-note">
        Ghế đôi là một lựa chọn cho hai người; giá hiển thị đã tính cho cả ghế. Giá cuối cùng được
        xác nhận khi đặt vé.
      </p>
    </aside>
  </div>
</template>
