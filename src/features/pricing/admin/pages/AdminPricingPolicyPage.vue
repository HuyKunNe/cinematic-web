<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { pricingErrorMessage, useAdminPricingQueries } from '../api/admin-pricing-queries'
import { useAdminPricingMatrixQuery } from '../api/admin-pricing-matrix-query'
import AdminPricingWorkflowTable from '../components/AdminPricingWorkflowTable.vue'

const auth = useAuthStore()

const canRead = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const policyId = ref('')
const categoryCode = ref('')
const selectionKey = ref('')
const locked = ref(false)
const refreshing = ref(false)
const notice = ref('')

const tableEditor = ref<InstanceType<typeof AdminPricingWorkflowTable> | null>(null)

const { cinemas, policies } = useAdminPricingQueries(canRead, cinemaId)

const selectedCinema = computed(() =>
  canRead.value ? cinemas.data.value?.find((item) => item.id === cinemaId.value) : undefined,
)

const availablePolicies = computed(() =>
  canRead.value
    ? (policies.data.value ?? []).filter((item) => item.cinemaId === cinemaId.value)
    : [],
)

const selectedPolicy = computed(() =>
  availablePolicies.value.find((item) => item.id === policyId.value),
)

const supportsMatrix = computed(
  () =>
    selectedPolicy.value?.pricingModel === 'FARE_MATRIX_V2' &&
    selectedPolicy.value.currency === 'VND',
)

const matrixQuery = useAdminPricingMatrixQuery(
  () => ({
    cinemaId: cinemaId.value,
    policyId: selectedPolicy.value?.id ?? '',
    version: selectedPolicy.value?.version ?? -1,
  }),
  () => canRead.value && supportsMatrix.value,
)

const matrix = computed(() => {
  if (!canRead.value || !matrixQuery.isSuccess.value || matrixQuery.isFetching.value) {
    return undefined
  }

  const value = matrixQuery.data.value
  const policy = selectedPolicy.value

  return policy &&
    value?.policy.id === policy.id &&
    value.policy.cinemaId === cinemaId.value &&
    value.policy.version === policy.version
    ? value
    : undefined
})

const category = computed(() =>
  matrix.value?.ticketCategories.find((item) => item.code === categoryCode.value),
)

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

const formatOptions = computed(() => {
  const options = new Map<string, string>()

  for (const fare of matrix.value?.fareRules ?? []) {
    if (fare.ticketCategoryCode !== categoryCode.value) continue

    const key = JSON.stringify([
      fare.experienceType,
      fare.contentFormat,
      fare.advanceScreeningCondition,
    ])

    options.set(
      key,
      [
        experienceNames[fare.experienceType],
        fare.contentFormat,
        screeningNames[fare.advanceScreeningCondition],
      ].join(' · '),
    )
  }

  return [...options].map(([value, label]) => ({ value, label }))
})

const selectedFormatName = computed(
  () => formatOptions.value.find((item) => item.value === selectionKey.value)?.label ?? '',
)

const busy = computed(
  () =>
    refreshing.value ||
    cinemas.isFetching.value ||
    policies.isFetching.value ||
    (supportsMatrix.value && matrixQuery.isFetching.value),
)

const steps = [
  { title: 'Thông tin', description: 'Rạp và bản giá' },
  { title: 'Chọn loại vé', description: 'Loại vé và hình thức chiếu' },
  { title: 'Nhập giá', description: 'Ngày, giờ và loại ghế' },
  { title: 'Xem lại', description: 'Kiểm tra trước khi lưu' },
]

const currentStep = computed(() => {
  if (!matrix.value) return 1
  if (!category.value || !selectionKey.value) return 2
  return tableEditor.value?.editing ? 3 : 4
})

watch(cinemaId, () => {
  policyId.value = ''
  categoryCode.value = ''
  selectionKey.value = ''
  notice.value = ''
})

watch(policyId, () => {
  categoryCode.value = ''
  selectionKey.value = ''
  notice.value = ''
})

watch(
  () => matrix.value?.ticketCategories,
  (items) => {
    if (!items) return

    if (!items.some((item) => item.code === categoryCode.value)) {
      categoryCode.value =
        items.find((item) => item.pricingRole === 'REGULAR')?.code ?? items[0]?.code ?? ''
    }
  },
  { immediate: true },
)

watch(
  formatOptions,
  (items) => {
    if (!items.some((item) => item.value === selectionKey.value)) {
      selectionKey.value = items[0]?.value ?? ''
    }
  },
  { immediate: true },
)

function dateLabel(value: string) {
  return value.split('-').reverse().join('/')
}

async function refresh() {
  if (!canRead.value || locked.value || busy.value) return

  refreshing.value = true

  try {
    await cinemas.refetch()

    if (!selectedCinema.value) return

    await policies.refetch()
    await nextTick()

    if (supportsMatrix.value && !matrixQuery.isFetching.value) {
      await matrixQuery.refetch()
    }
  } finally {
    refreshing.value = false
  }
}

async function onSaved() {
  notice.value = 'Đã lưu các mức giá vào bản nháp.'
  await policies.refetch()
}
</script>

<template>
  <section
    class="admin-reference pricing-workflow"
    data-reference="admin-pricing-policies"
    aria-labelledby="pricing-workflow-title"
  >
    <header class="pricing-workflow__heading">
      <div>
        <p class="pricing-workflow__eyebrow">Quản lý giá vé</p>
        <h1 id="pricing-workflow-title">Bảng giá vé</h1>
        <p>Chọn bản giá, nhập giá theo loại ghế rồi kiểm tra trước khi lưu.</p>
      </div>

      <AppButton
        v-if="canRead"
        type="button"
        variant="secondary"
        :loading="refreshing"
        :disabled="locked || busy"
        @click="refresh"
      >
        Tải lại
      </AppButton>
    </header>

    <p v-if="!canRead" class="pricing-error" role="alert">Bạn không có quyền quản lý giá vé.</p>

    <template v-else>
      <nav class="pricing-workflow__progress" aria-label="Các bước thiết lập bảng giá">
        <ol>
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            :class="{ 'is-current': currentStep === index + 1 }"
            :aria-current="currentStep === index + 1 ? 'step' : undefined"
          >
            <span class="pricing-workflow__number">{{ index + 1 }}</span>
            <span>
              <strong>{{ step.title }}</strong>
              <small>{{ step.description }}</small>
            </span>
          </li>
        </ol>
      </nav>

      <p v-if="notice" class="pricing-workflow__notice" role="status">
        {{ notice }}
      </p>

      <section class="pricing-workflow__card" aria-labelledby="pricing-info-title">
        <header class="pricing-workflow__card-heading">
          <span class="pricing-workflow__number" aria-hidden="true">1</span>
          <div>
            <h2 id="pricing-info-title">Thông tin bảng giá</h2>
            <p>Chọn rạp và bản giá cần xem hoặc chỉnh sửa.</p>
          </div>
        </header>

        <div class="pricing-workflow__fields">
          <label class="admin-reference__field">
            <span>Rạp áp dụng</span>
            <select
              v-model="cinemaId"
              class="admin-reference__input"
              :disabled="locked || busy || cinemas.isError.value"
            >
              <option value="">Chọn rạp</option>
              <option
                v-for="cinema in cinemas.data.value ?? []"
                :key="cinema.id"
                :value="cinema.id"
              >
                {{ cinema.name }}
              </option>
            </select>
          </label>

          <label class="admin-reference__field">
            <span>Bản giá</span>
            <select
              v-model="policyId"
              class="admin-reference__input"
              :disabled="locked || busy || !selectedCinema || policies.isError.value"
            >
              <option value="">Chọn bản giá</option>
              <option v-for="policy in availablePolicies" :key="policy.id" :value="policy.id">
                Bản số {{ policy.policyVersion }} ·
                {{ policy.status === 'DRAFT' ? 'Bản nháp' : 'Đã công bố' }}
              </option>
            </select>
          </label>
        </div>

        <div class="pricing-workflow__feedback" aria-live="polite">
          <p v-if="cinemas.isError.value" class="pricing-error">
            {{ pricingErrorMessage(cinemas.error.value) }}
          </p>
          <p v-else-if="policies.isError.value" class="pricing-error">
            {{ pricingErrorMessage(policies.error.value) }}
          </p>
          <p v-else-if="busy">Đang tải thông tin bảng giá…</p>
          <p v-else-if="cinemas.isSuccess.value && !cinemas.data.value?.length">
            Chưa có rạp để lựa chọn.
          </p>
          <p v-else-if="selectedCinema && !availablePolicies.length">Rạp này chưa có bản giá.</p>
        </div>

        <dl v-if="selectedPolicy" class="pricing-workflow__summary">
          <div>
            <dt>Bắt đầu áp dụng</dt>
            <dd>{{ dateLabel(selectedPolicy.effectiveFrom) }}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>
              {{
                selectedPolicy.status === 'DRAFT'
                  ? 'Bản nháp, chưa đưa vào sử dụng'
                  : 'Đã công bố, chỉ có thể xem'
              }}
            </dd>
          </div>
        </dl>
      </section>

      <p v-if="selectedPolicy && !supportsMatrix" class="pricing-workflow__notice" role="status">
        Bản giá này dùng cách lưu khác và chưa hỗ trợ chỉnh sửa tại đây.
      </p>

      <p v-else-if="supportsMatrix && matrixQuery.isError.value" class="pricing-error" role="alert">
        Chưa tải được nội dung bản giá. Chọn “Tải lại” để lấy thông tin mới nhất.
      </p>

      <template v-if="matrix">
        <section class="pricing-workflow__card" aria-labelledby="pricing-choice-title">
          <header class="pricing-workflow__card-heading">
            <span class="pricing-workflow__number" aria-hidden="true">2</span>
            <div>
              <h2 id="pricing-choice-title">Chọn loại vé và hình thức chiếu</h2>
              <p>Mỗi loại vé và hình thức chiếu có mức giá riêng.</p>
            </div>
          </header>

          <div class="pricing-workflow__fields">
            <label class="admin-reference__field">
              <span>Loại vé</span>
              <select
                v-model="categoryCode"
                class="admin-reference__input"
                :disabled="locked || busy"
              >
                <option value="">Chọn loại vé</option>
                <option v-for="item in matrix.ticketCategories" :key="item.code" :value="item.code">
                  {{ item.name }}
                </option>
              </select>
            </label>

            <label class="admin-reference__field">
              <span>Hình thức và suất chiếu</span>
              <select
                v-model="selectionKey"
                class="admin-reference__input"
                :disabled="locked || busy || !formatOptions.length"
              >
                <option value="">Chọn hình thức chiếu</option>
                <option v-for="item in formatOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>
          </div>

          <p class="pricing-workflow__help">
            <strong>Loại vé khác với loại ghế.</strong>
            Một loại vé có thể có giá riêng cho ghế thường, ghế VIP và ghế đôi.
          </p>
        </section>

        <section class="pricing-workflow__card" aria-labelledby="pricing-values-title">
          <header class="pricing-workflow__card-heading">
            <span class="pricing-workflow__number" aria-hidden="true">3</span>
            <div>
              <h2 id="pricing-values-title">Giá vé theo ngày, giờ và loại ghế</h2>
              <p>
                {{ category?.name ?? 'Chưa chọn loại vé' }}
                {{ selectedFormatName ? ` · ${selectedFormatName}` : '' }}
              </p>
            </div>
          </header>

          <AdminPricingWorkflowTable
            v-if="categoryCode && selectionKey"
            :key="`${matrix.policy.id}:${matrix.policy.version}:${categoryCode}`"
            ref="tableEditor"
            :matrix="matrix"
            :category-code="categoryCode"
            :selection-key="selectionKey"
            :can-read="canRead"
            :can-edit="selectedPolicy?.status === 'DRAFT'"
            :show-actions="false"
            @locked="locked = $event"
            @saved="onSaved"
            @reload="refresh"
          />

          <p v-else class="pricing-workflow__empty">
            {{
              categoryCode ? 'Loại vé này chưa có mức giá đã lưu.' : 'Chọn loại vé để xem bảng giá.'
            }}
          </p>
        </section>

        <section class="pricing-workflow__card" aria-labelledby="pricing-review-title">
          <header class="pricing-workflow__card-heading">
            <span class="pricing-workflow__number" aria-hidden="true">4</span>
            <div>
              <h2 id="pricing-review-title">Xem lại trước khi lưu</h2>
              <p>Kiểm tra đúng rạp, loại vé, hình thức chiếu và giá ghế đôi.</p>
            </div>
          </header>

          <dl class="pricing-workflow__summary">
            <div>
              <dt>Rạp áp dụng</dt>
              <dd>{{ selectedCinema?.name }}</dd>
            </div>
            <div>
              <dt>Bản giá</dt>
              <dd>Bản số {{ selectedPolicy?.policyVersion }}</dd>
            </div>
            <div>
              <dt>Loại vé</dt>
              <dd>{{ category?.name ?? 'Chưa chọn' }}</dd>
            </div>
            <div>
              <dt>Hình thức chiếu</dt>
              <dd>{{ selectedFormatName || 'Chưa chọn' }}</dd>
            </div>
          </dl>

          <p v-if="tableEditor?.dirty" class="pricing-workflow__help" role="status">
            Có mức giá chưa lưu. Kiểm tra các ô dùng chung trước khi lưu bảng giá.
          </p>

          <footer class="pricing-workflow__actions">
            <template v-if="tableEditor?.editing">
              <AppButton
                type="button"
                variant="secondary"
                :disabled="tableEditor.saving || tableEditor.requiresReload"
                @click="tableEditor.cancelEdit()"
              >
                Hủy thay đổi
              </AppButton>

              <AppButton
                type="button"
                :loading="tableEditor.saving"
                :disabled="!tableEditor.inputsEnabled || !tableEditor.dirty"
                @click="tableEditor.submit()"
              >
                Lưu bảng giá
              </AppButton>
            </template>

            <AppButton
              v-else-if="tableEditor?.canStart"
              type="button"
              @click="tableEditor.startEdit()"
            >
              Chỉnh sửa giá
            </AppButton>

            <AppButton
              v-if="tableEditor?.requiresReload"
              type="button"
              variant="secondary"
              :disabled="tableEditor.saving"
              @click="tableEditor.reloadEdit()"
            >
              Tải lại bản giá
            </AppButton>
          </footer>
        </section>
      </template>
    </template>
  </section>
</template>
