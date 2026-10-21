<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAdminPricingMatrixQuery } from '../api/admin-pricing-matrix-query'
import { pricingErrorMessage } from '../api/admin-pricing-queries'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  canRead: boolean
}>()

const query = useAdminPricingMatrixQuery(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
  }),
  () => props.canRead,
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

const formatKey = ref('')

const formatOptions = computed(() => {
  const result = new Map<string, string>()

  for (const rule of matrix.value?.fareRules ?? []) {
    const key = `${rule.experienceType}:${rule.contentFormat}`
    result.set(key, `${rule.experienceType} · ${rule.contentFormat}`)
  }

  return [...result].map(([value, label]) => ({ value, label }))
})

watch(
  formatOptions,
  (options) => {
    if (!options.some((item) => item.value === formatKey.value)) {
      formatKey.value = options[0]?.value ?? ''
    }
  },
  { immediate: true },
)

const visibleRules = computed(() =>
  (matrix.value?.fareRules ?? []).filter(
    (rule) => `${rule.experienceType}:${rule.contentFormat}` === formatKey.value,
  ),
)

function resolveMatrixError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return 'Hệ thống không hỗ trợ đọc ma trận cho chính sách này.'
    }

    return pricingErrorMessage(error)
  }

  if (error instanceof Error && error.name !== 'ZodError') {
    return (
      'Không đọc được cấu hình phù hợp với phiên bản đã chọn. ' +
      'Hãy dùng “Tải lại” ở phần thông tin policy rồi chọn lại phiên bản.'
    )
  }

  return pricingErrorMessage(error)
}

const errorMessage = computed(() => resolveMatrixError(query.error.value))

const advanceLabels = {
  ANY: 'Không giới hạn suất chiếu sớm',
  ADVANCE_SCREENING: 'Suất chiếu sớm',
  REGULAR_SCREENING: 'Suất chiếu thông thường',
} as const

const unitLabels = {
  PER_TICKET: 'Mỗi vé',
  PER_PAIR: 'Mỗi cặp',
  UNCONFIRMED: 'Chưa xác nhận đơn vị',
} as const

function dayGroupLabel(code: string) {
  return (
    matrix.value?.dayGroups.find((item) => item.code === code)?.name ??
    `${code} · Chưa có định nghĩa`
  )
}

function clockMinute(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, '0')
  const minutes = (value % 60).toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

function timeBandLabel(code: string) {
  const band = matrix.value?.timeBands.find((item) => item.code === code)

  return band
    ? `${band.name} · ${clockMinute(band.fromMinute)}–${clockMinute(band.toMinute)}`
    : `${code} · Chưa có định nghĩa`
}

function formatAmount(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function reload() {
  if (!props.canRead || query.isFetching.value) return
  void query.refetch()
}
</script>

<template>
  <section
    class="admin-reference__panel pricing-matrix"
    data-reference="admin-pricing-matrix"
    aria-labelledby="pricing-matrix-title"
  >
    <header class="pricing-matrix__heading">
      <div>
        <h2 id="pricing-matrix-title">Ma trận giá đã lưu</h2>
        <p>Cấu hình theo định dạng, nhóm ngày, khung giờ, nhóm vé và loại ghế.</p>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        :loading="query.isFetching.value"
        :disabled="!canRead || query.isFetching.value"
        @click="reload"
      >
        Tải lại ma trận
      </AppButton>
    </header>

    <p v-if="!canRead">Bạn không có quyền xem ma trận giá.</p>

    <p v-else-if="query.isPending.value || query.isFetching.value" role="status">
      Đang tải ma trận…
    </p>

    <p v-else-if="query.isError.value" class="pricing-matrix__error" role="alert">
      {{ errorMessage }}
    </p>

    <template v-else-if="matrix">
      <p class="pricing-matrix__notice">
        Đây là các rule đã lưu, chưa phải giá được chọn cho suất chiếu. Tiền tệ policy:
        {{ matrix.policy.currency }}. Múi giờ: {{ matrix.policy.timeZone }}.
      </p>

      <p v-if="matrix.fareRules.length === 0" role="status">
        Phiên bản này chưa có fare rule. Không có rule không có nghĩa là vé miễn phí.
      </p>

      <template v-else>
        <label class="admin-reference__field">
          <span>Trải nghiệm và định dạng nội dung</span>

          <select
            v-model="formatKey"
            class="admin-reference__input"
            aria-controls="pricing-matrix-table"
          >
            <option v-for="option in formatOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <p role="status">{{ visibleRules.length }} rule trong nhóm đang xem.</p>

        <div
          class="pricing-matrix__scroll"
          role="region"
          aria-label="Các fare rule đã lưu"
          tabindex="0"
        >
          <table id="pricing-matrix-table">
            <caption class="admin-visually-hidden">
              Cấu hình giá đã lưu; không phải kết quả preview hoặc quote
            </caption>

            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Nhóm ngày</th>
                <th scope="col">Khung giờ</th>
                <th scope="col">Nhóm vé</th>
                <th scope="col">Loại ghế</th>
                <th scope="col">Giá cấu hình</th>
                <th scope="col">Điều kiện</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="rule in visibleRules" :key="rule.id">
                <th scope="row">{{ rule.code }}</th>
                <td>{{ dayGroupLabel(rule.dayGroupCode) }}</td>
                <td>{{ timeBandLabel(rule.timeBandCode) }}</td>
                <td>{{ rule.ticketCategoryCode }}</td>
                <td>{{ rule.seatTypeCode }}</td>

                <td>
                  <strong>{{ formatAmount(rule.amountVnd) }} VND</strong>
                  <span
                    class="pricing-matrix__detail"
                    :class="{
                      'pricing-matrix__error': rule.fareUnit === 'UNCONFIRMED',
                    }"
                  >
                    {{ unitLabels[rule.fareUnit] }}
                  </span>
                </td>

                <td>
                  <span>{{ advanceLabels[rule.advanceScreeningCondition] }}</span>
                  <span class="pricing-matrix__detail">
                    Mã điều kiện bổ sung: {{ rule.requiredEligibilityCode ?? '—' }}
                  </span>
                  <span class="pricing-matrix__detail"> Độ ưu tiên: {{ rule.priority }} </span>
                  <span class="pricing-matrix__detail">
                    Hiệu lực: {{ rule.effectiveFrom }} →
                    {{ rule.effectiveTo ?? 'Không giới hạn ngày kết thúc' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p class="pricing-matrix__notice">
        Chưa đánh giá phạm vi bán, điều kiện khách hàng, rule thắng hoặc phụ thu. Các mã nhóm vé và
        loại ghế được giữ nguyên từ cấu hình. Giá theo cặp được hiển thị theo đơn vị BE trả về,
        không nhân thêm theo capacity.
      </p>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-pricing-matrix'] {
  --pricing-matrix-table-min-width: 64rem;

  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin-top: var(--space-5);
  padding: var(--space-5);
}

[data-reference='admin-pricing-matrix'] .pricing-matrix__heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width-thin) solid var(--color-border);
}

[data-reference='admin-pricing-matrix'] h2 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-lg);
}

[data-reference='admin-pricing-matrix'] p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

[data-reference='admin-pricing-matrix'] .pricing-matrix__notice {
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-matrix'] .pricing-matrix__scroll {
  min-width: 0;
  overflow-x: auto;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
}

[data-reference='admin-pricing-matrix'] table {
  width: 100%;
  min-width: var(--pricing-matrix-table-min-width);
  border-collapse: collapse;
  text-align: left;
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-matrix'] :is(th, td) {
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-width-thin) solid var(--color-border);
  vertical-align: top;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

[data-reference='admin-pricing-matrix'] thead th {
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}

[data-reference='admin-pricing-matrix'] strong {
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

[data-reference='admin-pricing-matrix'] .pricing-matrix__detail {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--font-size-xs);
}

[data-reference='admin-pricing-matrix'] .pricing-matrix__error {
  color: var(--color-error);
}

[data-reference='admin-pricing-matrix'] :is(select, button, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
