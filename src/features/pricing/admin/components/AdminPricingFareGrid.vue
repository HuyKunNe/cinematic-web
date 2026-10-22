<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { useAdminPricingMatrixQuery } from '../api/admin-pricing-matrix-query'
import { DayGroupInputDaysOfWeekItem as Weekday } from '@/services/api/generated/inventory-service/model/dayGroupInputDaysOfWeekItem'

type Matrix = NonNullable<ReturnType<typeof useAdminPricingMatrixQuery>['data']['value']>

type Fare = Matrix['fareRules'][number]

type PriceRow = {
  key: string
  days: number[]
  from: number
  to: number
  rules: Fare[]
}

const props = defineProps<{
  matrix: Matrix
  categoryCode: string
}>()

const tableKind = ref<'ordinary' | 'holiday'>('ordinary')
const selectedFormat = ref('')

const weekdays = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
]

const weekdayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

const experienceNames = {
  STANDARD: 'Chiếu thường',
  PREMIUM_CINEMA: 'Rạp cao cấp',
  '4DX': 'Chiếu 4DX',
  IMAX: 'Chiếu IMAX',
} as const

const screeningNames = {
  REGULAR_SCREENING: 'Suất chiếu thông thường',
  ADVANCE_SCREENING: 'Suất chiếu sớm',
  ANY: 'Chưa xác định loại suất chiếu',
} as const

const unitNames = {
  PER_TICKET: 'mỗi vé',
  PER_PAIR: 'cả cặp ghế đôi',
  UNCONFIRMED: 'chưa xác định cách tính',
} as const

const categoryRules = computed(() =>
  props.matrix.fareRules.filter((rule) => rule.ticketCategoryCode === props.categoryCode),
)

function formatKey(rule: Fare) {
  return JSON.stringify([rule.experienceType, rule.contentFormat, rule.advanceScreeningCondition])
}

const formatOptions = computed(() => {
  const options = new Map<string, string>()

  for (const rule of categoryRules.value) {
    options.set(
      formatKey(rule),
      [
        experienceNames[rule.experienceType],
        rule.contentFormat,
        screeningNames[rule.advanceScreeningCondition],
      ].join(' · '),
    )
  }

  return [...options].map(([value, label]) => ({ value, label }))
})

watch(
  formatOptions,
  (options) => {
    if (!options.some((option) => option.value === selectedFormat.value)) {
      selectedFormat.value = options[0]?.value ?? ''
    }
  },
  { immediate: true },
)

const selectedRules = computed(() =>
  categoryRules.value.filter((rule) => formatKey(rule) === selectedFormat.value),
)

const dayGroups = computed(() => new Map(props.matrix.dayGroups.map((item) => [item.code, item])))

const timeBands = computed(() => new Map(props.matrix.timeBands.map((item) => [item.code, item])))

const hasInvalidConfiguration = computed(() =>
  selectedRules.value.some((rule) => {
    const time = timeBands.value.get(rule.timeBandCode)

    return (
      !dayGroups.value.has(rule.dayGroupCode) ||
      !time ||
      time.fromMinute >= time.toMinute ||
      !props.matrix.seatTypes.some((seat) => seat.code === rule.seatTypeCode) ||
      rule.advanceScreeningCondition === 'ANY'
    )
  }),
)

const rows = computed(() => {
  if (hasInvalidConfiguration.value) return []

  const rules = selectedRules.value
  const holiday = tableKind.value === 'holiday'

  const points = [
    ...new Set([
      0,
      1440,
      ...rules.flatMap((rule) => {
        const time = timeBands.value.get(rule.timeBandCode)
        return time ? [time.fromMinute, time.toMinute] : []
      }),
    ]),
  ].sort((a, b) => a - b)

  const result: PriceRow[] = []
  const previousRows = new Map<string, PriceRow>()
  const dayIndexes = holiday ? [0] : weekdays.map((_, index) => index)

  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index]
    const to = points[index + 1]

    if (from === undefined || to === undefined) continue

    const groups = new Map<string, { days: number[]; rules: Fare[] }>()

    for (const dayIndex of dayIndexes) {
      const matching = rules.filter((rule) => {
        const day = dayGroups.value.get(rule.dayGroupCode)
        const time = timeBands.value.get(rule.timeBandCode)
        const weekday = weekdays[dayIndex]

        if (!day || !time || !weekday) return false

        const matchesDay = holiday ? day.includesHolidays : day.daysOfWeek.includes(weekday)

        return matchesDay && time.fromMinute <= from && time.toMinute >= to
      })

      if (matching.length === 0) continue

      const signature = matching.map((rule) => rule.id).join('|')
      const group = groups.get(signature)

      if (group) {
        group.days.push(dayIndex)
      } else {
        groups.set(signature, {
          days: [dayIndex],
          rules: matching,
        })
      }
    }

    for (const [signature, group] of groups) {
      const groupKey = JSON.stringify([group.days, signature])
      const previous = previousRows.get(groupKey)

      // Gộp các khoảng giờ liền nhau khi giữ nguyên toàn bộ mức giá.
      if (previous && previous.to === from) {
        previous.to = to
        continue
      }

      const row: PriceRow = {
        key: JSON.stringify([groupKey, from]),
        days: group.days,
        from,
        to,
        rules: group.rules,
      }

      result.push(row)
      previousRows.set(groupKey, row)
    }
  }

  return result
    .sort((a, b) => (a.days[0] ?? 0) - (b.days[0] ?? 0) || a.from - b.from)
    .map((row) => ({
      ...row,
      cells: props.matrix.seatTypes.map((seat) => ({
        seat,
        fares: row.rules.filter((rule) => rule.seatTypeCode === seat.code),
      })),
    }))
})

function dayLabel(days: number[]) {
  if (tableKind.value === 'holiday') return 'Lễ, Tết'

  const names = days.map((day) => weekdayNames[day] ?? 'Ngày chưa xác định')

  if (days.length === 1) return names[0]

  const consecutive = days.every((day, index) => index === 0 || day === (days[index - 1] ?? -2) + 1)

  return consecutive ? `${names[0]}–${names[names.length - 1]}` : names.join(', ')
}

function clock(minute: number) {
  const hour = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0')
  const rest = (minute % 60).toString().padStart(2, '0')
  return `${hour}:${rest}`
}

function timeLabel(from: number, to: number) {
  if (from === 0 && to === 1440) return 'Cả ngày'
  if (from === 0) return `Trước ${clock(to)}`
  if (to === 1440) return `Từ ${clock(from)}`
  return `${clock(from)} đến trước ${clock(to)}`
}

function amount(value: string) {
  return `${value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`
}

function dateLabel(value: string) {
  return value.split('-').reverse().join('/')
}

function periodLabel(rule: Fare) {
  const from = `Từ ${dateLabel(rule.effectiveFrom)}`
  return rule.effectiveTo ? `${from} đến trước ${dateLabel(rule.effectiveTo)}` : from
}

function hasOwnPeriod(rule: Fare) {
  return (
    rule.effectiveFrom !== props.matrix.policy.effectiveFrom ||
    rule.effectiveTo !== props.matrix.policy.effectiveTo
  )
}
</script>

<template>
  <div class="pricing-fare-grid">
    <p v-if="categoryRules.length === 0" class="pricing-fare-grid__message">
      Loại vé này chưa có mức giá. Chọn “Thêm mức giá” để bắt đầu.
    </p>

    <template v-else>
      <div class="pricing-fare-grid__controls">
        <label class="admin-reference__field">
          <span>Bảng giá</span>
          <select v-model="tableKind" class="admin-reference__input">
            <option value="ordinary">Ngày bình thường</option>
            <option value="holiday">Lễ, Tết</option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Hình thức và suất chiếu</span>
          <select v-model="selectedFormat" class="admin-reference__input">
            <option v-for="option in formatOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <p
        v-if="hasInvalidConfiguration"
        class="pricing-error pricing-fare-grid__message"
        role="alert"
      >
        Có mức giá chưa xác định đủ ngày, giờ, loại ghế hoặc loại suất chiếu. Hãy mở danh sách chi
        tiết bên dưới để kiểm tra.
      </p>

      <p v-else-if="rows.length === 0" class="pricing-fare-grid__message" role="status">
        Chưa có mức giá cho bảng và hình thức chiếu đang chọn.
      </p>

      <div
        v-else
        class="pricing-fare-grid__scroll"
        role="region"
        aria-label="Bảng giá theo ngày, giờ và loại ghế"
        tabindex="0"
      >
        <table class="pricing-fare-grid__table">
          <caption class="admin-visually-hidden">
            {{
              tableKind === 'holiday'
                ? 'Các mức giá lễ, Tết đã lưu'
                : 'Các mức giá ngày bình thường đã lưu'
            }}
          </caption>

          <thead>
            <tr>
              <th scope="col">Ngày áp dụng</th>
              <th scope="col">Giờ bắt đầu suất chiếu</th>
              <th v-for="seat in matrix.seatTypes" :key="seat.code" scope="col">
                {{ seat.name }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in rows" :key="row.key">
              <th scope="row">{{ dayLabel(row.days) }}</th>
              <td>{{ timeLabel(row.from, row.to) }}</td>

              <td v-for="cell in row.cells" :key="cell.seat.code">
                <span v-if="cell.fares.length === 0"> Chưa có mức giá </span>

                <template v-else>
                  <p v-if="cell.fares.length > 1" class="pricing-fare-grid__condition">
                    Có nhiều mức giá; cần xem điều kiện áp dụng.
                  </p>

                  <ul class="pricing-fare-grid__prices">
                    <li v-for="fare in cell.fares" :key="fare.id">
                      <strong>{{ amount(fare.amountVnd) }}</strong>
                      <small>{{ unitNames[fare.fareUnit] }}</small>

                      <small v-if="hasOwnPeriod(fare) || cell.fares.length > 1">
                        {{ periodLabel(fare) }}
                      </small>

                      <small v-if="fare.requiredEligibilityCode">
                        Khách cần đáp ứng điều kiện mua vé.
                      </small>
                    </li>
                  </ul>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="pricing-fare-grid__note">
        Bảng tổng hợp các mức giá đã lưu. Chỉ hiển thị ngày và giờ có ít nhất một mức giá; đây chưa
        phải kết quả kiểm tra đầy đủ giá bán. Giá áp dụng còn phụ thuộc thời hạn và điều kiện mua
        vé.
      </p>
    </template>
  </div>
</template>

<style scoped>
.pricing-fare-grid {
  --fare-grid-min-width: 38rem;
  --fare-grid-field-width: 18rem;

  min-width: 0;
}

.pricing-fare-grid__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pricing-layout-gap);
  padding: var(--pricing-panel-padding);
}

.pricing-fare-grid__controls > label {
  flex: 1 1 var(--fare-grid-field-width);
  min-width: 0;
}

.pricing-fare-grid__scroll {
  min-width: 0;
  overflow-x: auto;
}

.pricing-fare-grid__table {
  width: 100%;
  min-width: var(--fare-grid-min-width);
  border-collapse: collapse;
  text-align: left;
}

.pricing-fare-grid__table :is(th, td) {
  padding: var(--space-4);
  border-bottom: var(--border-width-thin) solid var(--color-border);
  vertical-align: top;
  color: var(--color-text-secondary);
}

.pricing-fare-grid__table thead {
  background: var(--color-surface-raised);
}

.pricing-fare-grid__table th {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}

.pricing-fare-grid__prices {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pricing-fare-grid__prices li {
  display: grid;
  gap: var(--space-1);
}

.pricing-fare-grid__prices strong {
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pricing-fare-grid__prices small {
  display: block;
  overflow-wrap: anywhere;
}

.pricing-fare-grid__condition {
  margin: 0 0 var(--space-2);
  color: var(--color-warning);
  font-size: var(--font-size-sm);
}

.pricing-fare-grid__message,
.pricing-fare-grid__note {
  margin: 0;
  padding: var(--pricing-panel-padding);
}

.pricing-fare-grid__note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}
</style>
