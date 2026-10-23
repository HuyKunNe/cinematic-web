<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import {
  fareEditErrorMessage,
  fareEditRequiresReload,
  normalizeFareAmount,
  usePricingFareEdit,
} from '../api/admin-pricing-fare-edit'
import type { useAdminPricingMatrixQuery } from '../api/admin-pricing-matrix-query'
import { DayGroupInputDaysOfWeekItem as Weekday } from '@/services/api/generated/inventory-service/model/dayGroupInputDaysOfWeekItem'

type Matrix = NonNullable<ReturnType<typeof useAdminPricingMatrixQuery>['data']['value']>

type Fare = Matrix['fareRules'][number]

type PriceRow = {
  key: string
  holiday: boolean
  days: number[]
  from: number
  to: number
  rules: Fare[]
}

const props = defineProps<{
  matrix: Matrix
  categoryCode: string
  canRead: boolean
  canEdit: boolean
  selectionKey?: string
  showActions?: boolean
}>()

const emit = defineEmits<{
  locked: [value: boolean]
  saved: []
  reload: []
}>()

const selectedFormat = ref('')

watch(
  () => props.selectionKey,
  (value) => {
    if (value !== undefined) selectedFormat.value = value
  },
  { immediate: true },
)

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

function buildRows(holiday: boolean): PriceRow[] {
  if (hasInvalidConfiguration.value) return []

  const rules = selectedRules.value

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
      const groupKey = JSON.stringify([holiday, group.days, signature])
      const previous = previousRows.get(groupKey)

      // Gộp các khoảng giờ liền nhau khi giữ nguyên toàn bộ mức giá.
      if (previous && previous.to === from) {
        previous.to = to
        continue
      }

      const row: PriceRow = {
        key: JSON.stringify([groupKey, from]),
        holiday,
        days: group.days,
        from,
        to,
        rules: group.rules,
      }

      result.push(row)
      previousRows.set(groupKey, row)
    }
  }
  return result.sort((a, b) => (a.days[0] ?? 0) - (b.days[0] ?? 0) || a.from - b.from)
}

const rows = computed(() =>
  [...buildRows(false), ...buildRows(true)].map((row) => ({
    ...row,
    cells: props.matrix.seatTypes.map((seat) => ({
      seat,
      fares: row.rules.filter((rule) => rule.seatTypeCode === seat.code),
    })),
  })),
)

function dayLabel(days: number[], holiday: boolean) {
  if (holiday) return 'Lễ, Tết'

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

function seatUnitName(code: string) {
  const units = [
    ...new Set(
      selectedRules.value.filter((rule) => rule.seatTypeCode === code).map((rule) => rule.fareUnit),
    ),
  ]

  if (units.length === 0) return 'Chưa có mức giá'
  if (units.length > 1) return 'Xem từng mức giá'

  const unit = units[0]
  return unit ? unitNames[unit] : 'Chưa xác định cách tính'
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

const editing = ref(false)
const awaitingRefresh = ref(false)
const showErrors = ref(false)
const originals = ref<Record<string, string>>({})
const drafts = ref<Record<string, string>>({})
const editContext = ref<{
  cinemaId: string
  policyId: string
  version: number
  categoryCode: string
} | null>(null)

const save = usePricingFareEdit(
  () => ({ matrix: props.matrix, categoryCode: props.categoryCode }),
  () => props.canRead,
  () => props.canEdit,
)

const contextChanged = computed(() => {
  const value = editContext.value
  return (
    value !== null &&
    (value.cinemaId !== props.matrix.policy.cinemaId ||
      value.policyId !== props.matrix.policy.id ||
      value.version !== props.matrix.policy.version ||
      value.categoryCode !== props.categoryCode)
  )
})

const requiresReload = computed(
  () => contextChanged.value || fareEditRequiresReload(save.error.value),
)

const changes = computed(() =>
  Object.entries(originals.value).flatMap(([code, original]) => {
    const amountVnd = normalizeFareAmount(drafts.value[code] ?? '')
    return amountVnd === original ? [] : [{ code, amountVnd: amountVnd ?? '' }]
  }),
)

const dirty = computed(() => changes.value.length > 0)

const fieldErrors = computed(() => {
  const errors: Record<string, string> = {}
  if (!showErrors.value) return errors

  for (const code of Object.keys(originals.value)) {
    if (normalizeFareAmount(drafts.value[code] ?? '') === null) {
      errors[code] = 'Nhập số tiền hợp lệ, ví dụ 55.000 hoặc 55000.'
    }
  }

  return errors
})

const editableFares = computed(() => {
  const fares = new Map<string, Fare>()

  for (const row of rows.value) {
    for (const cell of row.cells) {
      const fare = cell.fares.length === 1 ? cell.fares[0] : undefined
      if (!fare) continue

      const seat = cell.seat
      const expectedUnit = seat.physicalSeatType === 'COUPLE' ? 'PER_PAIR' : 'PER_TICKET'

      if (
        seat.mappingStatus === 'CONFIRMED' &&
        seat.physicalSeatType !== null &&
        fare.fareUnit === expectedUnit &&
        fare.advanceScreeningCondition !== 'ANY'
      ) {
        fares.set(fare.code, fare)
      }
    }
  }

  return [...fares.values()]
})

const inputsEnabled = computed(
  () =>
    props.canRead &&
    props.canEdit &&
    props.matrix.policy.status === 'DRAFT' &&
    props.matrix.policy.currency === 'VND' &&
    !save.isPending.value &&
    !requiresReload.value &&
    !awaitingRefresh.value,
)

const canStart = computed(
  () =>
    inputsEnabled.value &&
    !editing.value &&
    !hasInvalidConfiguration.value &&
    editableFares.value.length > 0,
)

function startEdit() {
  if (!canStart.value) return

  save.reset()
  showErrors.value = false
  originals.value = Object.fromEntries(
    editableFares.value.map((fare) => [fare.code, fare.amountVnd]),
  )
  drafts.value = Object.fromEntries(
    editableFares.value.map((fare) => [
      fare.code,
      fare.amountVnd.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    ]),
  )
  editContext.value = {
    cinemaId: props.matrix.policy.cinemaId,
    policyId: props.matrix.policy.id,
    version: props.matrix.policy.version,
    categoryCode: props.categoryCode,
  }
  editing.value = true
}

function clearEdit() {
  editing.value = false
  originals.value = {}
  drafts.value = {}
  editContext.value = null
  showErrors.value = false
}

function cancelEdit() {
  if (save.isPending.value || requiresReload.value) return
  clearEdit()
  save.reset()
}

function sharedCount(code: string) {
  return rows.value.reduce(
    (total, row) =>
      total + row.cells.filter((cell) => cell.fares.some((fare) => fare.code === code)).length,
    0,
  )
}

function displayedAmount(fare: Fare) {
  if (!editing.value || originals.value[fare.code] === undefined) {
    return amount(fare.amountVnd)
  }

  const value = normalizeFareAmount(drafts.value[fare.code] ?? '')
  return value === null ? 'Chưa hợp lệ' : amount(value)
}

async function submit() {
  if (!editing.value || !inputsEnabled.value || !dirty.value || !editContext.value) return

  showErrors.value = true
  if (Object.keys(fieldErrors.value).length > 0) return

  try {
    await save.mutateAsync({
      ...editContext.value,
      changes: changes.value.map((item) => ({ ...item })),
    })
    awaitingRefresh.value = true
    clearEdit()
    emit('saved')
  } catch {
    // Giữ nguyên số tiền đang nhập để người dùng kiểm tra.
  }
}

function reloadEdit() {
  if (save.isPending.value) return
  if (dirty.value && !window.confirm('Bỏ thay đổi chưa lưu và tải lại bản giá?')) {
    return
  }

  clearEdit()
  save.reset()
  awaitingRefresh.value = false
  emit('reload')
}

function confirmLeave() {
  if (save.isPending.value) return false
  return !dirty.value || window.confirm('Rời trang và bỏ các mức giá chưa lưu?')
}

function preventUnload(event: BeforeUnloadEvent) {
  if (!dirty.value && !save.isPending.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(
  () => editing.value || save.isPending.value || requiresReload.value,
  (value) => emit('locked', value),
  { immediate: true, flush: 'sync' },
)

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('locked', false)
})

defineExpose({
  startEdit,
  cancelEdit,
  submit,
  reloadEdit,
  editing,
  dirty,
  canStart,
  inputsEnabled,
  requiresReload,
  saving: save.isPending,
})
</script>

<template>
  <form
    class="pricing-workflow-table"
    aria-label="Mức giá theo ngày, giờ và loại ghế"
    :aria-busy="save.isPending.value"
    novalidate
    @submit.prevent="submit"
  >
    <p v-if="categoryRules.length === 0" class="pricing-workflow-table__message">
      Loại vé này chưa có mức giá trong bản giá đang chọn.
    </p>

    <template v-else>
      <div v-if="selectionKey === undefined" class="pricing-workflow-table__controls">
        <label class="admin-reference__field">
          <span>Hình thức và suất chiếu</span>
          <select
            v-model="selectedFormat"
            class="admin-reference__input"
            :disabled="editing || save.isPending.value || awaitingRefresh"
          >
            <option v-for="option in formatOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="editing" class="pricing-workflow-table__message" role="status">
        Nhập số tiền bằng đồng, ví dụ 55.000 hoặc 55000. Mức giá dùng chung ở nhiều ô sẽ được cập
        nhật cùng nhau.
      </p>

      <p
        v-if="save.isError.value || contextChanged"
        class="pricing-error pricing-workflow-table__message"
        role="alert"
      >
        {{
          contextChanged
            ? 'Bản giá đã thay đổi. Hãy tải lại trước khi tiếp tục.'
            : fareEditErrorMessage(save.error.value)
        }}
      </p>

      <p v-if="awaitingRefresh" class="pricing-workflow-table__message" role="status">
        Đã lưu. Đang tải bản giá mới…
      </p>

      <p
        v-if="hasInvalidConfiguration"
        class="pricing-error pricing-workflow-table__message"
        role="alert"
      >
        Có mức giá chưa xác định đủ ngày, giờ, loại ghế hoặc loại suất chiếu. Hãy kiểm tra lại thông
        tin của bản giá.
      </p>

      <p v-else-if="rows.length === 0" class="pricing-workflow-table__message" role="status">
        Chưa có mức giá cho hình thức và suất chiếu đang chọn.
      </p>

      <div
        v-else
        class="pricing-workflow-table__scroll"
        role="region"
        aria-label="Bảng giá theo ngày, giờ và loại ghế"
        tabindex="0"
      >
        <table class="pricing-workflow-table__table" role="table">
          <caption class="admin-visually-hidden">
            Giá ngày bình thường và Lễ, Tết theo từng loại ghế
          </caption>

          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">Ngày áp dụng</th>
              <th scope="col" role="columnheader">Giờ bắt đầu suất chiếu</th>
              <th v-for="seat in matrix.seatTypes" :key="seat.code" scope="col" role="columnheader">
                {{ seat.name }}
                <small class="pricing-workflow-table__unit">
                  {{ seatUnitName(seat.code) }}
                </small>
              </th>
            </tr>
          </thead>

          <tbody role="rowgroup">
            <tr
              v-for="(row, rowIndex) in rows"
              :key="row.key"
              :class="{ 'pricing-workflow-table__holiday': row.holiday }"
              role="row"
            >
              <th scope="row" role="rowheader">
                {{ dayLabel(row.days, row.holiday) }}
              </th>
              <td data-label="Giờ bắt đầu suất chiếu" role="cell">
                {{ timeLabel(row.from, row.to) }}
              </td>

              <td
                v-for="cell in row.cells"
                :key="cell.seat.code"
                :data-label="`${cell.seat.name} · ${seatUnitName(cell.seat.code)}`"
                role="cell"
              >
                <span v-if="cell.fares.length === 0"> Chưa có mức giá </span>

                <template v-else>
                  <p v-if="cell.fares.length > 1" class="pricing-workflow-table__condition">
                    Có nhiều mức giá; cần xem điều kiện áp dụng.
                  </p>

                  <ul class="pricing-workflow-table__prices">
                    <li v-for="fare in cell.fares" :key="fare.id">
                      +
                      <template
                        v-if="
                          editing && cell.fares.length === 1 && originals[fare.code] !== undefined
                        "
                      >
                        <input
                          v-model="drafts[fare.code]"
                          class="admin-reference__input pricing-workflow-table__input"
                          type="text"
                          inputmode="numeric"
                          autocomplete="off"
                          maxlength="25"
                          :disabled="!inputsEnabled"
                          :aria-label="
                            [
                              cell.seat.name,
                              dayLabel(row.days, row.holiday),
                              timeLabel(row.from, row.to),
                              seatUnitName(cell.seat.code),
                            ].join(', ')
                          "
                          :aria-invalid="Boolean(fieldErrors[fare.code])"
                          :aria-describedby="
                            fieldErrors[fare.code]
                              ? `fare-error-${rowIndex}-${cell.seat.code}`
                              : undefined
                          "
                        />
                        <small
                          v-if="sharedCount(fare.code) > 1"
                          class="pricing-workflow-table__shared"
                        >
                          Dùng chung ở {{ sharedCount(fare.code) }} ô.
                        </small>
                        <small
                          v-if="fieldErrors[fare.code]"
                          :id="`fare-error-${rowIndex}-${cell.seat.code}`"
                          class="pricing-error"
                        >
                          {{ fieldErrors[fare.code] }}
                        </small>
                      </template>
                      <strong v-else>{{ displayedAmount(fare) }}</strong>
                      <small v-if="seatUnitName(cell.seat.code) === 'Xem từng mức giá'">
                        {{ unitNames[fare.fareUnit] }}
                      </small>

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
      <div v-if="showActions !== false" class="pricing-workflow-table__actions">
        <AppButton v-if="!editing && canStart" type="button" variant="secondary" @click="startEdit">
          Chỉnh sửa giá
        </AppButton>

        <template v-else-if="editing">
          <AppButton
            type="button"
            variant="secondary"
            :disabled="save.isPending.value || requiresReload"
            @click="cancelEdit"
          >
            Hủy thay đổi
          </AppButton>
          <AppButton
            type="submit"
            :loading="save.isPending.value"
            :disabled="!inputsEnabled || !dirty"
          >
            Lưu bảng giá
          </AppButton>
        </template>

        <AppButton
          v-if="requiresReload"
          type="button"
          variant="secondary"
          :disabled="save.isPending.value"
          @click="reloadEdit"
        >
          Tải lại bản giá
        </AppButton>
      </div>

      <div class="pricing-workflow-table__notes" aria-label="Lưu ý về bảng giá">
        <p>
          <strong>Giờ áp dụng:</strong>
          Tính theo giờ bắt đầu suất chiếu. Khung “Từ 17:00” bao gồm đúng 17:00.
        </p>
        <p>
          <strong>Ghế đôi:</strong>
          Kiểm tra cách tính ở đầu cột; giá cho cả cặp được tính một lần.
        </p>
        <p>
          <strong>Lễ, Tết:</strong>
          Giá lễ được hiển thị ở cuối bảng, không cần chọn ngày cụ thể khi xem.
        </p>
      </div>

      <p class="pricing-workflow-table__note">
        Chỉ hiển thị phạm vi đã có mức giá. Giá áp dụng còn phụ thuộc thời hạn và điều kiện mua vé.
      </p>
    </template>
  </form>
</template>
