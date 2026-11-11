<script setup lang="ts">
import { computed } from 'vue'
import { bookingSeatStatusLabels, formatBookingMoney } from '../mappers/booking-seat.mapper'
import type { BookingSeat, BookingSeatMap } from '../models/booking-seat.model'

const props = defineProps<{
  seats: BookingSeat[]
  matrix: NonNullable<BookingSeatMap['matrix']>
  selectedIds: string[]
  disabled: boolean
}>()
const emit = defineEmits<{ select: [seat: BookingSeat] }>()

const rows = computed(() =>
  Array.from({ length: props.matrix.rowCount }, (_, index) => {
    const seats = props.seats.filter((seat) => seat.position?.row === index)
    const starts = new Map(seats.map((seat) => [seat.position!.column, seat]))
    const cells: { column: number; span: number; seat: BookingSeat | null }[] = []
    for (let column = 0; column < props.matrix.columnCount;) {
      const seat = starts.get(column) ?? null
      const span = seat?.position?.span ?? 1
      cells.push({ column, span, seat })
      column += span
    }
    let number = index + 1
    let label = ''
    while (number > 0) {
      number -= 1
      label = String.fromCharCode(65 + (number % 26)) + label
      number = Math.floor(number / 26)
    }
    return { index, label: seats[0]?.rowLabel ?? label, cells }
  }),
)

const seatTypeLegend = [
  { class: 'STANDARD', label: 'Tiêu chuẩn' },
  { class: 'VIP', label: 'VIP' },
  { class: 'COUPLE', label: 'Ghế đôi' },
  { class: 'ACCESSIBLE', label: 'Hỗ trợ tiếp cận' },
]
const legend = [
  { class: 'STANDARD', label: 'Còn trống' },
  { class: 'selected', label: 'Đang chọn' },
  { class: 'HELD', label: 'Đang được giữ' },
  { class: 'BOOKED', label: 'Đã đặt' },
  { class: 'blocked', label: 'Không sử dụng' },
]
const typePrices = computed(() =>
  seatTypeLegend.flatMap((type) => {
    const seats = props.seats.filter((seat) => seat.seatType === type.class)
    if (!seats.length) return []
    const prices = seats.flatMap((seat) => (seat.priceMinor === null ? [] : [seat.priceMinor]))
    const min = Math.min(...prices),
      max = Math.max(...prices)
    const price = !prices.length
      ? 'Chưa có giá'
      : min === max
        ? formatBookingMoney(min)
        : `${formatBookingMoney(min)} – ${formatBookingMoney(max)}`
    return [{ ...type, price, unit: type.class === 'COUPLE' ? 'cặp' : 'ghế' }]
  }),
)

function label(seat: BookingSeat): string {
  return `${seat.seatNumber}, ${seat.typeLabel}, ${seat.capacity} chỗ, ${
    props.selectedIds.includes(seat.id) ? 'Đang chọn' : bookingSeatStatusLabels[seat.status]
  }, ${seat.priceMinor === null ? 'Chưa có giá' : formatBookingMoney(seat.priceMinor)}`
}
</script>

<template>
  <div class="booking-matrix" :style="{ '--booking-matrix-columns': matrix.columnCount }">
    <div class="booking-matrix__prices" aria-label="Giá theo loại ghế">
      <span v-for="type in typePrices" :key="type.class">
        <i :class="`is-${type.class}`" aria-hidden="true"></i>
        <strong>{{ type.label }}</strong> {{ type.price }}/{{ type.unit }}
      </span>
    </div>
    <div class="booking-matrix__viewport">
      <div class="booking-matrix__axis" aria-hidden="true">
        <span v-for="row in rows" :key="row.index">{{ row.label }}</span>
      </div>
      <div class="booking-matrix__map" role="region" aria-label="Sơ đồ ghế của phòng">
        <div class="booking-matrix__content">
          <div class="booking-matrix__screen"><span>MÀN HÌNH</span></div>
          <div v-for="row in rows" :key="row.index" class="booking-matrix__row">
            <div
              v-for="cell in row.cells"
              :key="cell.column"
              class="booking-matrix__slot"
              :style="{ gridColumn: `${cell.column + 1} / span ${cell.span}` }"
            >
              <button
                v-if="cell.seat"
                type="button"
                class="booking-matrix__seat"
                :class="[
                  `is-${cell.seat.seatType}`,
                  `is-${cell.seat.status}`,
                  {
                    'is-selected': selectedIds.includes(cell.seat.id),
                    'is-blocked':
                      !cell.seat.selectable &&
                      cell.seat.status !== 'HELD' &&
                      cell.seat.status !== 'BOOKED',
                  },
                ]"
                :disabled="disabled || !cell.seat.selectable"
                :aria-pressed="selectedIds.includes(cell.seat.id)"
                :aria-label="label(cell.seat)"
                :title="label(cell.seat)"
                @click="emit('select', cell.seat)"
              >
                {{ cell.seat.seatNumber.replace(cell.seat.rowLabel, '') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="booking-matrix__axis" aria-hidden="true">
        <span v-for="row in rows" :key="row.index">{{ row.label }}</span>
      </div>
    </div>
    <div class="booking-matrix__legend" aria-label="Chú giải sơ đồ ghế">
      <span v-for="item in legend" :key="item.class">
        <i :class="`is-${item.class}`" aria-hidden="true"></i>{{ item.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.booking-matrix {
  --booking-matrix-map-bg: #f0f1eb;
  --booking-matrix-free-bg: #fbfcf7;
  --booking-matrix-free-border: #aeb9aa;
  --booking-matrix-free-text: #5a6e58;
  --booking-matrix-vip-bg: #fff9ed;
  --booking-matrix-vip-border: #bf9b6d;
  --booking-matrix-vip-text: #956e3c;
  --booking-matrix-pair-bg: #e8e6ef;
  --booking-matrix-pair-border: #aea4c1;
  --booking-matrix-pair-text: #756287;
  --booking-matrix-held-bg: #eee6d6;
  --booking-matrix-held-stripe: #dfd2b7;
  --booking-matrix-held-border: #cab992;
  --booking-matrix-sold-bg: #9fa99e;
  --booking-matrix-sold-border: #929e91;
  --booking-matrix-blocked-bg: #e1e3db;
  --booking-matrix-screen-color: #8b9c90;
  --booking-matrix-screen-tint: #cbd4c74a;
  --booking-matrix-seat-radius: var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-sm);
  --booking-matrix-screen-width: 75%;
  --booking-matrix-screen-tracking: 0.28em;
  --booking-matrix-held-stripe-size: var(--space-1);
  --booking-matrix-held-stripe-repeat: var(--space-2);
  --booking-matrix-seat-height: 2rem;
  --booking-matrix-gap: var(--space-2);
  --booking-matrix-axis-width: var(--space-6);
  --booking-matrix-font-min: 0.5rem;
  --booking-matrix-font-scale: 35cqw;
  --booking-matrix-gutter-scale: 8cqw;
  --booking-matrix-adaptive-font: clamp(
    var(--booking-matrix-font-min),
    calc(var(--booking-matrix-font-scale) / var(--booking-matrix-columns)),
    var(--font-size-xs)
  );
  --booking-matrix-row-height: calc(var(--booking-matrix-seat-height) + var(--space-2));
  --booking-matrix-screen-height: 5rem;
  --booking-matrix-dot-size: var(--space-3);
  --booking-matrix-tint: 18%;
  min-width: 0;
  container-type: inline-size;
}
.booking-matrix__legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  margin-block: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.booking-matrix__legend > span,
.booking-matrix__prices > span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.booking-matrix__legend i,
.booking-matrix__prices i {
  display: inline-block;
  flex-shrink: 0;
  width: var(--booking-matrix-dot-size);
  height: var(--booking-matrix-dot-size);
  border: var(--border-width-thin) solid var(--booking-matrix-free-border);
  border-bottom-width: var(--border-width-strong);
  border-radius: var(--radius-sm);
  background: var(--booking-matrix-free-bg);
}
.booking-matrix__prices {
  margin-bottom: var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--font-size-xs);
}
.booking-matrix__viewport {
  display: grid;
  grid-template-columns: var(--booking-matrix-axis-width) minmax(0, 1fr) var(
      --booking-matrix-axis-width
    );
  padding: var(--space-5) var(--space-2);
  background: var(--booking-matrix-map-bg);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.booking-matrix__axis {
  padding-top: var(--booking-matrix-screen-height);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.booking-matrix__axis > span {
  display: grid;
  place-items: center;
  height: var(--booking-matrix-row-height);
}
.booking-matrix__map {
  min-width: 0;
}
.booking-matrix__content {
  width: 100%;
  min-width: 0;
}
.booking-matrix__screen {
  box-sizing: border-box;
  width: var(--booking-matrix-screen-width);
  height: var(--booking-matrix-screen-height);
  margin-inline: auto;
  padding-top: var(--space-2);
  border-top: var(--border-width-strong) solid var(--booking-matrix-screen-color);
  border-radius: 50% 50% 0 0;
  text-align: center;
  color: var(--booking-matrix-screen-color);
  font-size: var(--font-size-xs);
  letter-spacing: var(--booking-matrix-screen-tracking);
  background: linear-gradient(var(--booking-matrix-screen-tint), transparent);
}
.booking-matrix__row {
  display: grid;
  grid-template-columns: repeat(var(--booking-matrix-columns), minmax(0, 1fr));
}
.booking-matrix__slot {
  height: var(--booking-matrix-row-height);
  min-width: 0;
  padding-inline: min(
    var(--booking-matrix-gap),
    calc(var(--booking-matrix-gutter-scale) / var(--booking-matrix-columns))
  );
  display: grid;
  align-items: center;
}
.booking-matrix__seat {
  box-sizing: border-box;
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: var(--booking-matrix-seat-height);
  min-width: 0;
  padding: 0;
  border: var(--border-width-thin) solid var(--booking-matrix-free-border);
  border-bottom-width: var(--border-width-strong);
  border-radius: var(--booking-matrix-seat-radius);
  background: var(--booking-matrix-free-bg);
  color: var(--booking-matrix-free-text);
  font: inherit;
  font-size: var(--booking-matrix-adaptive-font);
  transition:
    background var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}
.booking-matrix .is-VIP {
  border-color: var(--booking-matrix-vip-border);
  background: var(--booking-matrix-vip-bg);
  color: var(--booking-matrix-vip-text);
}
.booking-matrix .is-COUPLE {
  border-color: var(--booking-matrix-pair-border);
  background: var(--booking-matrix-pair-bg);
  color: var(--booking-matrix-pair-text);
}
.booking-matrix__seat.is-COUPLE::before {
  content: '';
  position: absolute;
  inset-block: var(--space-1);
  left: 50%;
  border-left: var(--border-width-thin) solid var(--booking-matrix-pair-border);
  opacity: var(--booking-seat-disabled-opacity);
  pointer-events: none;
}
.booking-matrix .is-ACCESSIBLE {
  border-color: var(--color-focus);
  border-style: double;
}
.booking-matrix .is-HELD {
  border-color: var(--booking-matrix-held-border);
  background: repeating-linear-gradient(
    45deg,
    var(--booking-matrix-held-stripe),
    var(--booking-matrix-held-stripe) var(--booking-matrix-held-stripe-size),
    var(--booking-matrix-held-bg) var(--booking-matrix-held-stripe-size),
    var(--booking-matrix-held-bg) var(--booking-matrix-held-stripe-repeat)
  );
}
.booking-matrix .is-BOOKED {
  border-color: var(--booking-matrix-sold-border);
  color: var(--booking-matrix-free-bg);
  background: var(--booking-matrix-sold-bg);
}
.booking-matrix .is-blocked {
  border-style: dashed;
  color: var(--color-text-muted);
  background: var(--booking-matrix-blocked-bg);
  text-decoration: line-through;
}
.booking-matrix .is-selected {
  border-color: var(--color-primary-hover);
  background: var(--color-primary);
  color: var(--color-on-primary);
}
button.booking-matrix__seat:not(:disabled) {
  cursor: pointer;
}
button.booking-matrix__seat:hover:not(:disabled) {
  box-shadow: var(--shadow-sm);
  border-color: var(--color-focus);
}
.booking-matrix__seat:focus-visible {
  outline: var(--border-width-strong) solid var(--color-focus);
  outline-offset: var(--space-1);
}
button.booking-matrix__seat:disabled {
  cursor: not-allowed;
}
</style>
