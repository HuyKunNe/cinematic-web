<script setup lang="ts">
import { computed } from 'vue'
import {
  pricingCellKey,
  pricingErrorMessage,
  pricingLabel,
  pricingMinuteLabel,
  pricingScopeKey,
  pricingSeatLabel,
  useAdminPricingDetailQuery,
  type PricingMatrix,
} from '../api/admin-pricing-queries'

const props = defineProps<{
  cinemaId: string
  policyId: string
  versionId: string
  canManage: boolean
}>()

const query = useAdminPricingDetailQuery(
  () => props.canManage,
  () => props.cinemaId,
  () => props.policyId,
  () => props.versionId,
)

const matrix = computed(() => {
  if (
    !props.canManage ||
    !query.isSuccess.value ||
    query.isFetching.value
  ) {
    return undefined
  }

  const detail = query.data.value

  return detail?.policy.status === 'PUBLISHED' && detail.matrix.coverageComplete
    ? detail.matrix
    : undefined
})

const cells = computed(
  () =>
    new Map(
      (matrix.value?.cells ?? []).map(
        (cell) => [pricingCellKey(cell), cell] as const,
      ),
    ),
)

const moneyFormat = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
})

function priceLabel(
  scope: PricingMatrix['scopes'][number],
  timeBandId: string,
  ticketGroupId: string,
  seatType: PricingMatrix['seatTypes'][number],
): string {
  const cell = cells.value.get(
    pricingCellKey({
      experienceType: scope.experienceType,
      contentFormat: scope.contentFormat,
      timeBandId,
      ticketGroupId,
      seatType,
    }),
  )

  if (cell?.state === 'NOT_APPLICABLE') return 'Không áp dụng'
  if (cell?.state !== 'PRICED' || cell.amount == null) return 'Chưa nhập'

  return `${moneyFormat.format(cell.amount)}đ`
}

function unitLabel(seatType: PricingMatrix['seatTypes'][number]): string {
  const option = matrix.value?.options.seatTypes.find(
    (item) => item.seatType === seatType,
  )

  return option ? pricingLabel(option.unit) : ''
}
</script>

<template>
  <section
    v-if="canManage"
    class="pricing-version-preview price-space-top"
    aria-label="Toàn bộ bảng giá của phiên bản đang chọn"
    :aria-busy="query.isFetching.value"
  >
    <header>
      <h3>Toàn bộ bảng giá của phiên bản đang chọn</h3>
      <p class="price-note">
        Xem cấu hình trước khi lưu lựa chọn bảng giá cho suất chiếu.
      </p>
    </header>

    <p
      v-if="query.isPending.value || query.isFetching.value"
      class="price-notice price-notice--info"
      role="status"
    >
      Đang tải ma trận giá của phiên bản đang chọn…
    </p>

    <div v-else-if="query.isError.value" class="pricing-version-preview__error">
      <p class="price-notice price-notice--error" role="alert">
        {{ pricingErrorMessage(query.error.value) }}
      </p>
      <button
        class="price-button"
        type="button"
        @click="query.refetch()"
      >
        Thử tải lại bảng giá
      </button>
    </div>

    <p
      v-else-if="!matrix"
      class="price-notice"
      role="status"
    >
      Phiên bản không còn là bảng giá đã công bố hoàn chỉnh.
      Hãy tải lại dữ liệu suất chiếu để kiểm tra lựa chọn.
    </p>

    <template v-else>
      <p class="price-note">
        Phiên bản {{ matrix.revision }} · {{ pricingLabel(matrix.dayGroup) }}
      </p>

      <div
        v-for="scope in matrix.scopes"
        :key="pricingScopeKey(scope)"
        class="pricing-version-preview__scope"
      >
        <h4>
          {{ pricingLabel(scope.experienceType) }} · {{ scope.contentFormat }}
        </h4>

        <div
          v-for="band in matrix.timeBands"
          :key="band.id"
          class="price-table-wrap"
          role="region"
          tabindex="0"
          :aria-label="`${pricingLabel(scope.experienceType)}, ${scope.contentFormat}, ${band.name}`"
        >
          <table class="price-table">
            <caption>
              {{ band.name }} · {{ pricingMinuteLabel(band.startMinute) }}–{{
                pricingMinuteLabel(band.endMinute)
              }}
            </caption>

            <thead>
              <tr>
                <th scope="col">Hạng ghế</th>
                <th
                  v-for="group in matrix.ticketGroups"
                  :key="group.id"
                  scope="col"
                >
                  {{ group.name }}
                  <span
                    v-if="group.id === matrix.defaultTicketGroupId"
                    class="price-cell-sub"
                  >
                    Nhóm mặc định
                  </span>
                  <span
                    v-if="group.eligibilityDescription"
                    class="price-cell-sub"
                  >
                    {{ group.eligibilityDescription }}
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="seatType in matrix.seatTypes" :key="seatType">
                <th scope="row">
                  {{ pricingSeatLabel(seatType) }}
                  <span class="price-cell-sub">
                    {{ unitLabel(seatType) }}
                  </span>
                </th>
                <td
                  v-for="group in matrix.ticketGroups"
                  :key="group.id"
                >
                  {{ priceLabel(scope, band.id, group.id, seatType) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="price-note">
        Giá ghế đôi tính cho cả cặp. Mỗi nhóm vé, khung giờ và định dạng
        hiển thị giá được cấu hình riêng. Backend kiểm tra tính phù hợp
        với suất chiếu khi lưu.
      </p>
    </template>
  </section>
</template>

<style scoped>
.pricing-version-preview,
.pricing-version-preview__scope,
.pricing-version-preview__error {
  display: grid;
  gap: var(--price-space-3);
  min-width: 0;
  max-width: 100%;
}

.pricing-version-preview h3,
.pricing-version-preview h4 {
  margin: 0;
  color: var(--price-ink);
  font-weight: var(--price-weight-semibold);
  overflow-wrap: anywhere;
}

.pricing-version-preview h3 {
  font-size: var(--price-size-base);
}

.pricing-version-preview h4 {
  font-size: var(--price-size-body);
}

.pricing-version-preview .price-notice {
  margin: 0;
}

.pricing-version-preview__error > .price-button {
  justify-self: start;
}

.pricing-version-preview .price-table-wrap {
  border: var(--price-border) solid var(--price-line);
  border-radius: var(--price-control-radius);
}

.pricing-version-preview caption {
  padding: var(--price-space-3);
  background: var(--price-soft);
  color: var(--price-ink);
  font-size: var(--price-size-body);
  font-weight: var(--price-weight-semibold);
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.pricing-version-preview :is(th, td) {
  min-width: var(--price-cell-width);
}

.pricing-version-preview th {
  white-space: normal;
  overflow-wrap: anywhere;
}

.pricing-version-preview thead th:not(:first-child),
.pricing-version-preview td {
  text-align: right;
}
</style>