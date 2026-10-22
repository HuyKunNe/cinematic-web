<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAdminPricingMatrixQuery } from '../api/admin-pricing-matrix-query'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  canRead: boolean
  categoryCode: string
  categoryName: string
}>()

const query = useAdminPricingMatrixQuery(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
  }),
  () => props.canRead && Boolean(props.categoryCode),
)

const filters = reactive({ day: '', format: '', seat: '' })

watch(
  () => props.categoryCode,
  () => {
    filters.day = ''
    filters.format = ''
    filters.seat = ''
  },
)

const matrix = computed(() => {
  if (!props.canRead || query.isFetching.value || !query.isSuccess.value) {
    return undefined
  }

  const value = query.data.value

  return value?.policy.id === props.policyId &&
    value.policy.cinemaId === props.cinemaId &&
    value.policy.version === props.version
    ? value
    : undefined
})

const categoryRules = computed(() =>
  (matrix.value?.fareRules ?? []).filter((item) => item.ticketCategoryCode === props.categoryCode),
)

const experienceLabels = {
  STANDARD: 'Chiếu thường',
  PREMIUM_CINEMA: 'Rạp cao cấp',
  '4DX': 'Chiếu 4DX',
  IMAX: 'Chiếu IMAX',
} as const

const screeningLabels = {
  REGULAR_SCREENING: 'Suất chiếu thông thường',
  ADVANCE_SCREENING: 'Suất chiếu sớm',
  ANY: 'Chưa xác định loại suất chiếu',
} as const

const unitLabels = {
  PER_TICKET: 'Mỗi vé',
  PER_PAIR: 'Mỗi cặp',
  UNCONFIRMED: 'Chưa xác định',
} as const

function dayName(code: string) {
  return matrix.value?.dayGroups.find((item) => item.code === code)?.name ?? 'Nhóm ngày chưa có tên'
}

function seatName(code: string) {
  return matrix.value?.seatTypes.find((item) => item.code === code)?.name ?? 'Loại ghế chưa có tên'
}

function clock(value: number) {
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`
}

function timeName(code: string) {
  const value = matrix.value?.timeBands.find((item) => item.code === code)
  return value ? `${clock(value.fromMinute)}–${clock(value.toMinute)}` : 'Chưa xác định giờ'
}

function formatKey(item: (typeof categoryRules.value)[number]) {
  return `${item.experienceType}:${item.contentFormat}`
}

function formatName(item: (typeof categoryRules.value)[number]) {
  return `${experienceLabels[item.experienceType]} · ${item.contentFormat}`
}

const dayOptions = computed(() =>
  [...new Set(categoryRules.value.map((item) => item.dayGroupCode))].map((value) => ({
    value,
    label: dayName(value),
  })),
)

const seatOptions = computed(() =>
  [...new Set(categoryRules.value.map((item) => item.seatTypeCode))].map((value) => ({
    value,
    label: seatName(value),
  })),
)

const formatOptions = computed(() => {
  const values = new Map<string, string>()
  categoryRules.value.forEach((item) => values.set(formatKey(item), formatName(item)))
  return [...values].map(([value, label]) => ({ value, label }))
})

const visibleRules = computed(() =>
  categoryRules.value.filter(
    (item) =>
      (!filters.day || filters.day === item.dayGroupCode) &&
      (!filters.seat || filters.seat === item.seatTypeCode) &&
      (!filters.format || filters.format === formatKey(item)),
  ),
)

function amount(value: string) {
  return `${value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đồng`
}

function reload() {
  if (!props.canRead || !props.categoryCode || query.isFetching.value) return
  void query.refetch()
}
</script>

<template>
  <section class="admin-reference__panel pricing-fares" aria-labelledby="pricing-fares-title">
    <header class="pricing-panel-heading pricing-fares__heading">
      <div>
        <p class="admin-reference__eyebrow">Bước 3</p>
        <h2 id="pricing-fares-title">
          {{ categoryName ? `Mức giá của ${categoryName}` : 'Mức giá vé' }}
        </h2>
        <p>Giá thay đổi theo ngày, giờ, hình thức chiếu và loại ghế.</p>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        disabled
        aria-describedby="pricing-add-fare-help"
      >
        Thêm mức giá
      </AppButton>
    </header>

    <p v-if="!categoryCode" class="pricing-fares__message">
      Chọn loại vé ở phía trên để xem mức giá.
    </p>

    <p
      v-else-if="query.isPending.value || query.isFetching.value"
      class="pricing-fares__message"
      role="status"
    >
      Đang tải mức giá…
    </p>

    <div v-else-if="query.isError.value" class="pricing-fares__message" role="alert">
      <p class="pricing-error">
        Chưa tải được mức giá phù hợp với bản đang xem. Hãy tải lại; nếu vẫn lỗi, tải lại bản giá ở
        đầu trang.
      </p>
      <AppButton type="button" variant="secondary" @click="reload"> Tải lại mức giá </AppButton>
    </div>

    <template v-else-if="matrix">
      <div class="pricing-fares__filters">
        <label class="admin-reference__field">
          <span>Ngày</span>
          <select v-model="filters.day" class="admin-reference__input">
            <option value="">Tất cả ngày</option>
            <option v-for="item in dayOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Hình thức chiếu</span>
          <select v-model="filters.format" class="admin-reference__input">
            <option value="">Tất cả hình thức</option>
            <option v-for="item in formatOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Loại ghế</span>
          <select v-model="filters.seat" class="admin-reference__input">
            <option value="">Tất cả loại ghế</option>
            <option v-for="item in seatOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>

      <div
        class="pricing-table-scroll"
        role="region"
        aria-label="Các mức giá của loại vé đang chọn"
        tabindex="0"
      >
        <table class="pricing-fare-table">
          <caption class="admin-visually-hidden">
            Các mức giá đã lưu của loại vé đang chọn
          </caption>
          <thead>
            <tr>
              <th scope="col">Ngày và giờ</th>
              <th scope="col">Hình thức chiếu</th>
              <th scope="col">Loại ghế</th>
              <th scope="col">Suất chiếu</th>
              <th scope="col">Giá vé</th>
              <th scope="col">Tính theo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in visibleRules" :key="item.id">
              <td>
                {{ dayName(item.dayGroupCode) }} · {{ timeName(item.timeBandCode) }}
                <small class="pricing-table-detail">
                  Từ {{ item.effectiveFrom }}
                  {{ item.effectiveTo ? `đến ${item.effectiveTo}` : '' }}
                </small>
              </td>
              <td>{{ formatName(item) }}</td>
              <td>{{ seatName(item.seatTypeCode) }}</td>
              <td>
                {{ screeningLabels[item.advanceScreeningCondition] }}
                <small v-if="item.requiredEligibilityCode" class="pricing-table-detail">
                  Có điều kiện mua vé
                </small>
              </td>
              <td>
                <strong>{{ amount(item.amountVnd) }}</strong>
              </td>
              <td>{{ unitLabels[item.fareUnit] }}</td>
            </tr>
            <tr v-if="visibleRules.length === 0">
              <td colspan="6">
                {{
                  categoryRules.length === 0
                    ? 'Loại vé này chưa có mức giá đã lưu.'
                    : 'Không có mức giá phù hợp với lựa chọn đang lọc.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p id="pricing-add-fare-help" class="pricing-fares__note">
      Chức năng thêm mức giá đang được hoàn thiện. Giá áp dụng thực tế được xác nhận theo bản giá và
      suất chiếu được chọn. Giá mỗi cặp được tính một lần cho cả cặp ghế.
    </p>
  </section>
</template>
