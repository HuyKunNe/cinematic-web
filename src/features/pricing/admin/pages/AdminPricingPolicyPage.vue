<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { pricingErrorMessage, useAdminPricingQueries } from '../api/admin-pricing-queries'
import AdminPricingMatrix from '../components/AdminPricingMatrix.vue'
import AdminPricingDraftCreate from '../components/AdminPricingDraftCreate.vue'

const auth = useAuthStore()

const canRead = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const policyId = ref('')
const policyCinemaId = ref('')

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

const loading = computed(() => cinemas.isFetching.value || policies.isFetching.value)

watch(
  cinemaId,
  () => {
    policyId.value = ''
  },
  { flush: 'sync' },
)

function statusLabel(status: 'DRAFT' | 'PUBLISHED') {
  return status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản'
}

async function reload() {
  if (!canRead.value || loading.value) return

  const shouldReloadPolicies = Boolean(selectedCinema.value)
  const requests: Promise<unknown>[] = [cinemas.refetch()]

  if (shouldReloadPolicies) {
    requests.push(policies.refetch())
  }

  await Promise.allSettled(requests)
}
</script>

<template>
  <section
    class="admin-reference"
    data-reference="admin-pricing-policy"
    aria-labelledby="pricing-title"
  >
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Quản lý giá vé</p>
        <h1 id="pricing-title" tabindex="-1">Chính sách giá</h1>
        <p class="admin-reference__description">Xem các phiên bản chính sách riêng của từng rạp.</p>
      </div>

      <RouterLink class="admin-reference__link-button" :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }">
        Danh sách suất chiếu
      </RouterLink>
    </header>

    <p v-if="!canRead" class="pricing-policy__error" role="alert">
      Bạn không có quyền xem chính sách giá.
    </p>

    <template v-else>
      <section
        class="admin-reference__panel pricing-policy__panel"
        aria-labelledby="pricing-meta-title"
      >
        <header class="pricing-policy__panel-heading">
          <div>
            <h2 id="pricing-meta-title">Thông tin policy</h2>
            <p class="admin-reference__description">
              Chọn phiên bản để xem thông tin hoặc tạo một bản nháp mới.
            </p>
          </div>

          <AppButton
            type="button"
            variant="secondary"
            :loading="loading"
            :disabled="loading"
            @click="reload"
          >
            Tải lại
          </AppButton>
        </header>

        <div class="pricing-policy__fields">
          <label class="admin-reference__field">
            <span>Rạp áp dụng</span>

            <select
              v-model="cinemaId"
              class="admin-reference__input"
              :disabled="cinemas.isFetching.value || cinemas.isError.value"
              aria-describedby="pricing-cinema-feedback"
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
            <span>Phiên bản chính sách</span>

            <select
              v-model="policyId"
              class="admin-reference__input"
              :disabled="
                !selectedCinema ||
                policies.isFetching.value ||
                policies.isError.value ||
                availablePolicies.length === 0
              "
              aria-describedby="pricing-policy-feedback"
            >
              <option value="">Chọn phiên bản</option>

              <option v-for="policy in availablePolicies" :key="policy.id" :value="policy.id">
                v{{ policy.policyVersion }} · {{ statusLabel(policy.status) }}
              </option>
            </select>
          </label>
        </div>

        <div id="pricing-cinema-feedback" aria-live="polite">
          <p v-if="cinemas.isPending.value || cinemas.isFetching.value">Đang tải danh mục rạp…</p>

          <p v-else-if="cinemas.isError.value" class="pricing-policy__error" role="alert">
            {{ pricingErrorMessage(cinemas.error.value) }}
          </p>

          <p v-else-if="cinemas.data.value?.length === 0">Chưa có rạp trong danh mục quản trị.</p>
        </div>

        <div id="pricing-policy-feedback" aria-live="polite">
          <p v-if="!selectedCinema">Chọn rạp để tải các phiên bản chính sách.</p>

          <p v-else-if="policies.isPending.value || policies.isFetching.value">
            Đang tải các phiên bản chính sách…
          </p>

          <p v-else-if="policies.isError.value" class="pricing-policy__error" role="alert">
            {{ pricingErrorMessage(policies.error.value) }}
          </p>

          <p v-else-if="availablePolicies.length === 0">Rạp chưa có chính sách giá.</p>

          <p v-else-if="!selectedPolicy">
            {{
              policyId
                ? 'Phiên bản đã chọn không còn trong danh sách. Hãy chọn lại.'
                : 'Chọn một phiên bản để xem thông tin.'
            }}
          </p>

          <p v-else>
            Đang xem v{{ selectedPolicy.policyVersion }} · {{ statusLabel(selectedPolicy.status) }}.
          </p>
        </div>

        <dl v-if="selectedPolicy" class="pricing-policy__metadata">
          <div>
            <dt>Rạp</dt>
            <dd>{{ selectedCinema?.name }}</dd>
          </div>

          <div>
            <dt>Phiên bản chính sách</dt>
            <dd>v{{ selectedPolicy.policyVersion }}</dd>
          </div>

          <div>
            <dt>Trạng thái</dt>
            <dd>{{ statusLabel(selectedPolicy.status) }}</dd>
          </div>

          <div>
            <dt>Mô hình giá</dt>
            <dd>{{ selectedPolicy.pricingModel }}</dd>
          </div>

          <div>
            <dt>Tiền tệ</dt>
            <dd>{{ selectedPolicy.currency }}</dd>
          </div>

          <div>
            <dt>Múi giờ</dt>
            <dd>{{ selectedPolicy.timeZone }}</dd>
          </div>

          <div>
            <dt>Ngày bắt đầu hiệu lực</dt>
            <dd>{{ selectedPolicy.effectiveFrom }}</dd>
          </div>

          <div>
            <dt>Ngày kết thúc hiệu lực</dt>
            <dd>{{ selectedPolicy.effectiveTo ?? 'Không giới hạn ngày kết thúc' }}</dd>
          </div>
        </dl>

        <p class="pricing-policy__notice">
          Trạng thái “Đã xuất bản” không xác nhận đây là chính sách đang áp dụng cho một suất chiếu
          cụ thể. Trang này chưa đánh giá giá vé, coverage, điều kiện ưu đãi hoặc khả năng mở bán.
        </p>
      </section>
      <AdminPricingMatrix
        v-if="selectedPolicy?.pricingModel === 'FARE_MATRIX_V2'"
        :key="`${selectedPolicy.id}:${selectedPolicy.version}`"
        :cinema-id="selectedPolicy.cinemaId"
        :policy-id="selectedPolicy.id"
        :version="selectedPolicy.version"
        :can-read="canRead"
      />

      <AdminPricingDraftCreate
        v-if="cinemaId"
        :key="cinemaId"
        :cinema-id="cinemaId"
        :can-create="
          canRead &&
          Boolean(selectedCinema) &&
          policies.isSuccess.value &&
          !policies.isFetching.value
        "
        @created="policyId = $event.cinemaId === cinemaId ? $event.id : policyId"
      />

      <p v-else-if="selectedPolicy" class="pricing-policy__notice" role="status">
        Phiên bản này dùng mô hình BASE_RULES_V1. Bảng ma trận FARE_MATRIX_V2 không áp dụng cho
        phiên bản này.
      </p>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-pricing-policy'] .pricing-policy__panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

[data-reference='admin-pricing-policy'] .pricing-policy__panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width-thin) solid var(--color-border);
}

[data-reference='admin-pricing-policy'] h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

[data-reference='admin-pricing-policy'] .pricing-policy__fields,
[data-reference='admin-pricing-policy'] .pricing-policy__metadata {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
}

[data-reference='admin-pricing-policy'] .pricing-policy__fields > *,
[data-reference='admin-pricing-policy'] .pricing-policy__metadata > div {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-policy'] .pricing-policy__metadata {
  margin: 0;
  padding-top: var(--space-4);
  border-top: var(--border-width-thin) solid var(--color-border);
}

[data-reference='admin-pricing-policy'] dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

[data-reference='admin-pricing-policy'] dd {
  margin: var(--space-2) 0 0;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

[data-reference='admin-pricing-policy'] p {
  margin-block: 0;
  line-height: var(--line-height-base);
}

[data-reference='admin-pricing-policy'] .pricing-policy__notice {
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-policy'] .pricing-policy__error {
  color: var(--color-error);
}

[data-reference='admin-pricing-policy'] :is(select, button, a):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
