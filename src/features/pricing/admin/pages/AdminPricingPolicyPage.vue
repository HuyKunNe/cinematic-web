<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import {
  pricingErrorMessage,
  pricingLabel,
  useAdminPricingQueries,
  type PricingPolicy,
} from '../api/admin-pricing-queries'
import AdminPricingWorkflowCreate from '../components/AdminPricingWorkflowCreate.vue'

const auth = useAuthStore()
const canManage = computed(
  () => auth.isAuthenticated && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const policyId = ref('')
const versionId = ref('')
const search = ref('')
const dayGroup = ref('')
const status = ref('')
const creating = ref(false)
const readOnly = ref(true)
const locked = ref(false)
const notice = ref('')

const { cinemas, policies, versions, detail } = useAdminPricingQueries(
  canManage,
  cinemaId,
  policyId,
  versionId,
)

const selectedCinema = computed(() =>
  cinemas.data.value?.find((item) => item.id === cinemaId.value),
)

const filteredPolicies = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('vi-VN')

  return (policies.data.value ?? [])
    .filter(
      (item) =>
        (!keyword || item.name.toLocaleLowerCase('vi-VN').includes(keyword)) &&
        (!dayGroup.value || item.dayGroup === dayGroup.value) &&
        (!status.value || item.status === status.value),
    )
    .sort((first, second) => first.name.localeCompare(second.name, 'vi-VN'))
})

const selectedVersion = computed(() =>
  versions.data.value?.find((item) => item.id === versionId.value),
)

const loading = computed(
  () =>
    cinemas.isFetching.value ||
    policies.isFetching.value ||
    versions.isFetching.value ||
    detail.isFetching.value,
)

const showingEditor = computed(
  () => creating.value || (policyId.value !== '' && versionId.value !== ''),
)

watch(cinemaId, () => {
  policyId.value = ''
  versionId.value = ''
  creating.value = false
  notice.value = ''
})

function cinemaNames(ids: string[]): string {
  return ids.map((id) => cinemas.data.value?.find((item) => item.id === id)?.name ?? id).join(', ')
}

function openPolicy(policy: PricingPolicy, edit: boolean): void {
  if (locked.value || loading.value || !canManage.value) return

  creating.value = false
  readOnly.value = !edit || policy.status !== 'DRAFT'
  policyId.value = policy.policyId
  versionId.value = policy.id
  notice.value = ''
}

function createPolicy(): void {
  if (!selectedCinema.value || locked.value || loading.value || !canManage.value) return

  policyId.value = ''
  versionId.value = ''
  creating.value = true
  readOnly.value = false
  notice.value = ''
}

async function refresh(): Promise<void> {
  if (!canManage.value || locked.value || loading.value) return

  notice.value = ''
  await cinemas.refetch()

  if (cinemaId.value && selectedCinema.value) {
    await policies.refetch()
  }
}

async function closeEditor(): Promise<void> {
  creating.value = false
  policyId.value = ''
  versionId.value = ''
  locked.value = false

  if (canManage.value && cinemaId.value) {
    await policies.refetch()
  }
}

function onChanged(): void {
  notice.value = 'Dữ liệu đã thay đổi. Danh sách được tải lại khi quay về.'
}

function selectVersion(): void {
  readOnly.value = selectedVersion.value?.status !== 'DRAFT'
  notice.value = ''
}
</script>

<template>
  <section
    class="admin-reference pricing-workflow"
    data-reference="admin-pricing-policies"
    aria-labelledby="pricing-page-title"
  >
    <header class="pricing-workflow__heading">
      <div>
        <p class="pricing-workflow__eyebrow">Quản lý giá vé</p>
        <h1 id="pricing-page-title">Bảng giá vé</h1>
        <p>Quản lý bảng giá theo nhóm ngày, phạm vi cụm rạp và phiên bản.</p>
      </div>

      <template v-if="canManage && !showingEditor">
        <AppButton type="button" variant="secondary" :disabled="loading" @click="refresh">
          Tải lại
        </AppButton>
        <AppButton type="button" :disabled="loading || !selectedCinema" @click="createPolicy">
          Tạo bảng giá
        </AppButton>
      </template>
    </header>

    <p v-if="!canManage" class="pricing-error" role="alert">Bạn không có quyền quản lý bảng giá.</p>

    <template v-else>
      <p class="pricing-workflow__help">
        Bảng giá Lễ, Tết được chọn theo suất chiếu. Mỗi định dạng có giá riêng; đúng 17:00 thuộc
        khung từ 17:00. Giá bán trọn gói, không cộng phụ thu.
      </p>

      <label class="admin-reference__field">
        <span>Cụm rạp đang quản lý</span>
        <select
          v-model="cinemaId"
          class="admin-reference__input"
          :disabled="locked || loading || creating"
        >
          <option value="">Chọn cụm rạp</option>
          <option v-for="cinema in cinemas.data.value ?? []" :key="cinema.id" :value="cinema.id">
            {{ cinema.name }}{{ cinema.active ? '' : ' · Ngừng hoạt động' }}
          </option>
        </select>
      </label>

      <p v-if="cinemas.isError.value" class="pricing-error" role="alert">
        {{ pricingErrorMessage(cinemas.error.value) }}
      </p>
      <p v-else-if="cinemas.isFetching.value" role="status">Đang tải cụm rạp…</p>
      <p v-else-if="cinemas.isSuccess.value && !cinemas.data.value?.length">
        Chưa có cụm rạp để quản lý bảng giá.
      </p>

      <template v-if="!showingEditor && selectedCinema">
        <section class="pricing-workflow__card" aria-labelledby="pricing-list-title">
          <h2 id="pricing-list-title">Danh sách bảng giá</h2>

          <div class="pricing-workflow__fields">
            <label class="admin-reference__field">
              <span>Tìm bảng giá</span>
              <input
                v-model="search"
                class="admin-reference__input"
                type="search"
                placeholder="Nhập tên bảng giá"
              />
            </label>
            <label class="admin-reference__field">
              <span>Nhóm ngày</span>
              <select v-model="dayGroup" class="admin-reference__input">
                <option value="">Tất cả nhóm ngày</option>
                <option value="WEEKDAY">Ngày thường</option>
                <option value="WEEKEND">Cuối tuần</option>
                <option value="HOLIDAY">Lễ, Tết</option>
              </select>
            </label>
            <label class="admin-reference__field">
              <span>Trạng thái phiên bản mới nhất</span>
              <select v-model="status" class="admin-reference__input">
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã công bố</option>
                <option value="RETIRED">Ngừng áp dụng</option>
              </select>
            </label>
          </div>

          <p v-if="policies.isError.value" class="pricing-error" role="alert">
            {{ pricingErrorMessage(policies.error.value) }}
          </p>
          <p v-else-if="policies.isFetching.value" role="status">Đang tải bảng giá…</p>
          <p v-else-if="!filteredPolicies.length">
            {{
              policies.data.value?.length
                ? 'Không có bảng giá phù hợp bộ lọc.'
                : 'Cụm rạp này chưa có bảng giá.'
            }}
          </p>

          <div
            v-else
            class="pricing-workflow-table__scroll"
            role="region"
            aria-label="Danh sách bảng giá"
            tabindex="0"
          >
            <table class="pricing-workflow-table__table" role="table">
              <caption class="admin-visually-hidden">
                Phiên bản mới nhất của mỗi bảng giá trong cụm rạp đang chọn
              </caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">Bảng giá</th>
                  <th scope="col" role="columnheader">Nhóm ngày</th>
                  <th scope="col" role="columnheader">Phạm vi</th>
                  <th scope="col" role="columnheader">Phiên bản</th>
                  <th scope="col" role="columnheader">Trạng thái</th>
                  <th scope="col" role="columnheader">Thao tác</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                <tr v-for="policy in filteredPolicies" :key="policy.policyId" role="row">
                  <th scope="row" role="rowheader">
                    {{ policy.name }}
                    <small v-if="policy.description" class="pricing-workflow-table__unit">
                      {{ policy.description }}
                    </small>
                  </th>
                  <td data-label="Nhóm ngày" role="cell">
                    {{ pricingLabel(policy.dayGroup) }}
                  </td>
                  <td data-label="Phạm vi" role="cell">
                    {{ cinemaNames(policy.cinemaIds) }}
                  </td>
                  <td data-label="Phiên bản" role="cell">{{ policy.revision }}</td>
                  <td data-label="Trạng thái" role="cell">
                    {{ pricingLabel(policy.status) }}
                  </td>
                  <td data-label="Thao tác" role="cell">
                    <div class="pricing-page__row-actions">
                      <AppButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        :disabled="loading"
                        @click="openPolicy(policy, false)"
                      >
                        Tra giá / phiên bản
                      </AppButton>
                      <AppButton
                        v-if="policy.status === 'DRAFT'"
                        type="button"
                        size="sm"
                        :disabled="loading"
                        @click="openPolicy(policy, true)"
                      >
                        Chỉnh sửa
                      </AppButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="pricing-workflow__help">
            Danh sách chỉ lấy phiên bản mới nhất. Mức độ hoàn chỉnh được đọc từ ma trận khi mở bảng
            giá; không suy đoán từ metadata.
          </p>
        </section>
      </template>

      <template v-if="showingEditor">
        <section v-if="!creating" class="pricing-workflow__card">
          <label class="admin-reference__field">
            <span>Phiên bản bảng giá</span>
            <select
              v-model="versionId"
              class="admin-reference__input"
              :disabled="locked || loading || versions.isError.value"
              @change="selectVersion"
            >
              <option
                v-for="version in versions.data.value ?? []"
                :key="version.id"
                :value="version.id"
              >
                Phiên bản {{ version.revision }} · {{ version.name }} ·
                {{ pricingLabel(version.status) }}
              </option>
            </select>
          </label>

          <p v-if="versions.isError.value" class="pricing-error" role="alert">
            {{ pricingErrorMessage(versions.error.value) }}
          </p>
          <p v-if="detail.isError.value" class="pricing-error" role="alert">
            {{ pricingErrorMessage(detail.error.value) }}
          </p>
          <p v-if="loading" role="status">Đang tải phiên bản và ma trận giá…</p>

          <div
            v-if="detail.isError.value || versions.isError.value"
            class="pricing-workflow__actions"
          >
            <AppButton type="button" variant="secondary" @click="closeEditor">
              Quay lại danh sách
            </AppButton>
            <AppButton
              type="button"
              :disabled="loading"
              @click="
                () => {
                  versions.refetch()
                  detail.refetch()
                }
              "
            >
              Thử tải lại
            </AppButton>
          </div>
        </section>

        <AdminPricingWorkflowCreate
          v-if="creating"
          key="new-pricing-policy"
          :cinemas="cinemas.data.value ?? []"
          :anchor-cinema-id="cinemaId"
          :can-manage="canManage"
          @locked="locked = $event"
          @changed="onChanged"
          @close="closeEditor"
        />

        <AdminPricingWorkflowCreate
          v-else-if="detail.isSuccess.value && detail.data.value && !detail.isFetching.value"
          :key="`${cinemaId}:${policyId}:${versionId}`"
          :cinemas="cinemas.data.value ?? []"
          :anchor-cinema-id="cinemaId"
          :can-manage="canManage"
          :initial="detail.data.value"
          :read-only="readOnly"
          @locked="locked = $event"
          @changed="onChanged"
          @close="closeEditor"
        />
      </template>

      <p v-if="notice" class="pricing-workflow__notice" role="status">{{ notice }}</p>
    </template>
  </section>
</template>

<style scoped>
.pricing-page__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
