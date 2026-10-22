<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { pricingErrorMessage, useAdminPricingQueries } from '../api/admin-pricing-queries'
import type { CreatedPricingDraft } from '../api/admin-pricing-create'
import AdminPricingCategoriesEditor from '../components/AdminPricingCategoriesEditor.vue'
import AdminPricingMatrix from '../components/AdminPricingMatrix.vue'
import AdminPricingDraftCreate from '../components/AdminPricingDraftCreate.vue'
import AdminPricingSeatTypes from '../components/AdminPricingSeatTypes.vue'
import AdminPricingDimensions from '../components/AdminPricingDimensions.vue'

const auth = useAuthStore()

const canRead = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const policyId = ref('')
const policyCinemaId = ref('')
const categoryLocked = ref(false)
const seatLocked = ref(false)
const dimensionLocked = ref(false)
const fareLocked = ref(false)
const creating = ref(false)
const reloading = ref(false)
const notice = ref('')
const showCreate = ref(false)
const createRegion = ref<HTMLElement | null>(null)

const selectedTicket = ref<{ code: string; name: string } | null>(null)

const { cinemas, policies } = useAdminPricingQueries(canRead, policyCinemaId)

const selectedCinema = computed(() => {
  if (!canRead.value || !cinemas.isSuccess.value || cinemas.isFetching.value) {
    return undefined
  }

  return cinemas.data.value?.find((item) => item.id === cinemaId.value)
})

watch(
  () => selectedCinema.value?.id ?? '',
  (id) => {
    policyCinemaId.value = id
  },
  { immediate: true, flush: 'sync' },
)

const availablePolicies = computed(() => {
  if (!selectedCinema.value || !policies.isSuccess.value || policies.isFetching.value) {
    return []
  }

  return (policies.data.value ?? []).filter((item) => item.cinemaId === selectedCinema.value?.id)
})

const selectedPolicy = computed(() =>
  availablePolicies.value.find((item) => item.id === policyId.value),
)

const loading = computed(
  () => reloading.value || cinemas.isFetching.value || policies.isFetching.value,
)

const contextLocked = computed(
  () =>
    categoryLocked.value ||
    seatLocked.value ||
    dimensionLocked.value ||
    fareLocked.value ||
    creating.value,
)

const currentStep = computed(() => {
  if (!selectedPolicy.value) return 1
  return selectedTicket.value ? 3 : 2
})

const steps = ['Chọn rạp', 'Chọn loại vé', 'Xem giá']

watch(
  cinemaId,
  () => {
    policyId.value = ''
    selectedTicket.value = null
    notice.value = ''
    showCreate.value = false
  },
  { flush: 'sync' },
)

watch(
  policyId,
  () => {
    selectedTicket.value = null
    notice.value = ''
  },
  { flush: 'sync' },
)

function statusLabel(status: 'DRAFT' | 'PUBLISHED') {
  return status === 'DRAFT' ? 'Bản nháp' : 'Đã công bố'
}

function onCategoryLocked(value: boolean) {
  categoryLocked.value = value
  if (value) notice.value = ''
}

async function onCategoriesSaved() {
  categoryLocked.value = false
  notice.value = 'Đã lưu loại vé.'

  if (canRead.value && selectedCinema.value && policyCinemaId.value === selectedCinema.value.id) {
    await policies.refetch()
  }
}

function onSeatLocked(value: boolean) {
  seatLocked.value = value
  if (value) notice.value = ''
}

async function onSeatSaved() {
  seatLocked.value = false
  notice.value = 'Đã thêm loại ghế cho bản giá.'

  if (canRead.value && selectedCinema.value && policyCinemaId.value === selectedCinema.value.id) {
    await policies.refetch()
  }
}

function onFareLocked(value: boolean) {
  fareLocked.value = value
  if (value) notice.value = ''
}

async function onFareSaved() {
  fareLocked.value = false
  notice.value = 'Đã lưu mức giá vào bản nháp.'

  if (canRead.value && selectedCinema.value && policyCinemaId.value === selectedCinema.value.id) {
    await policies.refetch()
  }
}

async function onFareReload() {
  fareLocked.value = false
  notice.value = ''
  await reload()
}

function onDimensionLocked(value: boolean) {
  dimensionLocked.value = value
  if (value) notice.value = ''
}

async function onDimensionSaved() {
  dimensionLocked.value = false
  notice.value = 'Đã lưu cấu hình ngày và khung giờ.'

  if (canRead.value && selectedCinema.value && policyCinemaId.value === selectedCinema.value.id) {
    await policies.refetch()
  }
}

async function onDimensionReload() {
  dimensionLocked.value = false
  notice.value = ''
  await reload()
}

async function onSeatReload() {
  seatLocked.value = false
  notice.value = ''
  await reload()
}

async function reload() {
  if (!canRead.value || loading.value || contextLocked.value) return

  reloading.value = true
  const requestedCinemaId = cinemaId.value

  try {
    await cinemas.refetch()
    await nextTick()

    if (
      canRead.value &&
      selectedCinema.value?.id === requestedCinemaId &&
      policyCinemaId.value === requestedCinemaId &&
      !policies.isFetching.value
    ) {
      await policies.refetch()
    }
  } finally {
    reloading.value = false
  }
}

async function onCategoryReload() {
  categoryLocked.value = false
  notice.value = ''
  await reload()
}

async function openCreate() {
  if (!selectedCinema.value || contextLocked.value || loading.value) return

  showCreate.value = true
  await nextTick()
  createRegion.value?.focus()
  createRegion.value?.scrollIntoView({ block: 'start' })
}

function onDraftCreated(draft: CreatedPricingDraft) {
  if (draft.cinemaId !== cinemaId.value) return

  policyId.value = draft.id
  notice.value = `Đã tạo bản giá số ${draft.policyVersion}.`
  showCreate.value = false
}
</script>

<template>
  <section
    class="admin-reference pricing-page"
    data-reference="admin-pricing-policies"
    aria-labelledby="pricing-title"
  >
    <header class="admin-reference__heading pricing-page__heading">
      <div>
        <p class="admin-reference__eyebrow">Quản lý giá theo rạp</p>
        <h1 id="pricing-title" tabindex="-1">Giá vé</h1>
        <p class="admin-reference__description">Chọn rạp, chọn loại vé rồi xem mức giá đang đặt.</p>
      </div>

      <AppButton
        v-if="canRead"
        type="button"
        :disabled="!selectedCinema || contextLocked || loading"
        @click="openCreate"
      >
        Tạo bản giá mới
      </AppButton>
    </header>

    <p v-if="!canRead" class="pricing-error" role="alert">Bạn không có quyền quản lý giá vé.</p>

    <template v-else>
      <ol class="pricing-steps" aria-label="Các bước xem giá">
        <li
          v-for="(step, index) in steps"
          :key="step"
          :class="{
            'is-complete': currentStep > index + 1,
            'is-current': currentStep === index + 1,
          }"
          :aria-current="currentStep === index + 1 ? 'step' : undefined"
        >
          <span>{{ index + 1 }}</span>
          <strong>{{ step }}</strong>
        </li>
      </ol>

      <section
        class="admin-reference__panel pricing-policy-context"
        aria-labelledby="pricing-context-title"
      >
        <header class="pricing-panel-heading">
          <div>
            <h2 id="pricing-context-title">Bạn đang xem giá của rạp nào?</h2>
            <p>Chọn rạp và bản giá muốn kiểm tra.</p>
          </div>

          <AppButton
            type="button"
            variant="secondary"
            :loading="loading"
            :disabled="loading || contextLocked"
            @click="reload"
          >
            Tải lại
          </AppButton>
        </header>

        <div class="pricing-policy-context__fields">
          <label class="admin-reference__field">
            <span>Rạp</span>
            <select
              v-model="cinemaId"
              class="admin-reference__input"
              :disabled="
                contextLocked || reloading || cinemas.isFetching.value || cinemas.isError.value
              "
              aria-describedby="pricing-context-feedback pricing-lock-help"
            >
              <option value="">Chọn rạp</option>
              <option
                v-for="cinema in cinemas.data.value ?? []"
                :key="cinema.id"
                :value="cinema.id"
              >
                {{ cinema.name }}{{ cinema.active ? '' : ' · Ngừng hoạt động' }}
              </option>
            </select>
          </label>

          <label class="admin-reference__field">
            <span>Bản giá</span>
            <select
              v-model="policyId"
              class="admin-reference__input"
              :disabled="
                contextLocked ||
                reloading ||
                !selectedCinema ||
                policies.isFetching.value ||
                policies.isError.value ||
                availablePolicies.length === 0
              "
              aria-describedby="pricing-context-feedback pricing-lock-help"
            >
              <option value="">Chọn bản giá</option>
              <option v-for="policy in availablePolicies" :key="policy.id" :value="policy.id">
                Bản số {{ policy.policyVersion }} · {{ statusLabel(policy.status) }}
              </option>
            </select>
          </label>
        </div>

        <div id="pricing-context-feedback" aria-live="polite">
          <p v-if="cinemas.isPending.value || cinemas.isFetching.value">Đang tải danh sách rạp…</p>
          <p v-else-if="cinemas.isError.value" class="pricing-error" role="alert">
            {{ pricingErrorMessage(cinemas.error.value) }}
          </p>
          <p v-else-if="cinemas.data.value?.length === 0">Chưa có rạp để lựa chọn.</p>
          <template v-else-if="selectedCinema">
            <p v-if="policies.isPending.value || policies.isFetching.value">
              Đang tải các bản giá…
            </p>
            <p v-else-if="policies.isError.value" class="pricing-error" role="alert">
              {{ pricingErrorMessage(policies.error.value) }}
            </p>
            <p v-else-if="availablePolicies.length === 0">
              Rạp chưa có bản giá. Chọn “Tạo bản giá mới” để bắt đầu.
            </p>
            <p v-else-if="!selectedPolicy">Chọn bản giá muốn xem.</p>
          </template>
        </div>

        <p v-if="selectedPolicy" class="pricing-policy-context__status">
          <span class="pricing-badge">{{ statusLabel(selectedPolicy.status) }}</span>
          <span>
            {{
              selectedPolicy.status === 'DRAFT'
                ? 'Chưa được đưa vào sử dụng.'
                : 'Đã công bố; việc áp dụng phụ thuộc ngày hiệu lực của bản giá.'
            }}
          </span>
        </p>

        <p id="pricing-lock-help" class="pricing-hint" role="status">
          {{
            fareLocked
              ? 'Lưu hoặc hủy mức giá trước khi chuyển loại vé, rạp hay bản giá.'
              : categoryLocked
                ? 'Lưu hoặc hủy thay đổi loại vé trước khi chuyển rạp hay bản giá.'
                : seatLocked
                  ? 'Lưu hoặc hủy thông tin loại ghế trước khi chuyển rạp hay bản giá.'
                  : dimensionLocked
                    ? 'Lưu hoặc hủy cấu hình ngày và giờ trước khi chuyển rạp hay bản giá.'
                    : creating
                      ? 'Đang tạo bản giá mới…'
                      : ''
          }}
        </p>
      </section>

      <section
        v-if="showCreate && selectedCinema"
        ref="createRegion"
        tabindex="-1"
        aria-label="Tạo bản giá mới"
      >
        <AdminPricingDraftCreate
          :key="selectedCinema.id"
          :cinema-id="selectedCinema.id"
          :can-create="
            canRead && !categoryLocked && !seatLocked && !dimensionLocked && !fareLocked && !loading
          "
          @busy="creating = $event"
          @created="onDraftCreated"
          @cancel="showCreate = false"
        />
      </section>

      <template v-if="selectedPolicy?.pricingModel === 'FARE_MATRIX_V2'">
        <AdminPricingCategoriesEditor
          :key="`types:${selectedPolicy.id}:${selectedPolicy.version}`"
          :cinema-id="selectedPolicy.cinemaId"
          :policy-id="selectedPolicy.id"
          :version="selectedPolicy.version"
          :can-read="canRead"
          :can-edit="!creating && !seatLocked && !dimensionLocked && !fareLocked"
          :selection-locked="fareLocked"
          :selected-code="selectedTicket?.code ?? ''"
          @selected="selectedTicket = $event"
          @locked="onCategoryLocked"
          @saved="onCategoriesSaved"
          @reload="onCategoryReload"
        />

        <section
          :key="`pricing-setup:${selectedPolicy.id}:${selectedPolicy.version}`"
          class="admin-reference__panel pricing-shared-setup"
          aria-labelledby="pricing-shared-setup-title"
        >
          <details :open="seatLocked || dimensionLocked">
            <summary @click="(seatLocked || dimensionLocked) && $event.preventDefault()">
              <span>
                <strong id="pricing-shared-setup-title"> Thiết lập dùng chung cho bản giá </strong>
                <small>Loại ghế, ngày và khung giờ áp dụng</small>
              </span>
            </summary>

            <div class="pricing-shared-setup__content">
              <AdminPricingSeatTypes
                :cinema-id="selectedPolicy.cinemaId"
                :policy-id="selectedPolicy.id"
                :version="selectedPolicy.version"
                :can-read="canRead"
                :can-edit="!creating && !categoryLocked && !dimensionLocked && !fareLocked"
                @locked="onSeatLocked"
                @saved="onSeatSaved"
                @reload="onSeatReload"
              />

              <AdminPricingDimensions
                :cinema-id="selectedPolicy.cinemaId"
                :policy-id="selectedPolicy.id"
                :version="selectedPolicy.version"
                :can-read="canRead"
                :can-edit="!creating && !categoryLocked && !seatLocked && !fareLocked"
                @locked="onDimensionLocked"
                @saved="onDimensionSaved"
                @reload="onDimensionReload"
              />
            </div>
          </details>
        </section>

        <AdminPricingMatrix
          :key="`fares:${selectedPolicy.id}:${selectedPolicy.version}`"
          :cinema-id="selectedPolicy.cinemaId"
          :policy-id="selectedPolicy.id"
          :version="selectedPolicy.version"
          :can-read="canRead"
          :category-code="selectedTicket?.code ?? ''"
          :category-name="selectedTicket?.name ?? ''"
          :can-edit="!creating && !categoryLocked && !seatLocked && !dimensionLocked"
          @locked="onFareLocked"
          @saved="onFareSaved"
          @reload="onFareReload"
        />
      </template>

      <p v-else-if="selectedPolicy" class="pricing-help" role="status">
        Bản giá này dùng cách lưu cũ. Hiện chỉ xem được thông tin chung.
      </p>
    </template>
  </section>
</template>
