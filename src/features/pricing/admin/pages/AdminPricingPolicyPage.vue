<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import {
  pricingErrorMessage,
  pricingLabel,
  useAdminPricingActions,
  type PricingDetail,
  type PricingPolicy,
} from '../api/admin-pricing-queries'
import { useAdminPricingList, useAdminPricingRowDetails } from '../api/admin-pricing-list'
import AdminPricingWorkflowCreate from '../components/AdminPricingWorkflowCreate.vue'
import AdminPricingPublishedQuoteDialog from '../components/AdminPricingPublishedQuoteDialog.vue'

const auth = useAuthStore()
const queryClient = useQueryClient()

const canManage = computed(
  () => auth.isAuthenticated && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const search = ref('')
const status = ref('')
const dayGroup = ref('')
const page = ref(1)
const pageSize = 8
const refreshing = ref(false)
const openingId = ref('')
const requestError = ref('')

const dialogMode = ref<'create' | 'edit' | 'preview' | 'quote' | null>(null)
const dialogDetail = ref<PricingDetail>()
const dialogCinemaId = ref('')
const dialogInitialCinemaIds = ref<string[]>([])

const listing = useAdminPricingList(canManage, cinemaId)
const actions = useAdminPricingActions(canManage)

const filteredPolicies = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('vi-VN')

  return listing.policies.value.filter(
    (item) =>
      (!keyword || item.name.toLocaleLowerCase('vi-VN').includes(keyword)) &&
      (!status.value || item.status === status.value) &&
      (!dayGroup.value || item.dayGroup === dayGroup.value),
  )
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredPolicies.value.length / pageSize)))

const visiblePolicies = computed(() =>
  filteredPolicies.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

const rowDetails = useAdminPricingRowDetails(
  canManage,
  visiblePolicies,
  () => listing.cinemas.data.value ?? [],
  cinemaId,
)

const configurationOptions = computed(() => {
  for (const row of rowDetails.value.values()) {
    if (row.data) return row.data.matrix.options
  }

  return undefined
})

const busy = computed(() => refreshing.value || listing.loading.value || openingId.value !== '')

const hasFilters = computed(() =>
  Boolean(search.value || status.value || dayGroup.value || cinemaId.value),
)

const firstResult = computed(() =>
  filteredPolicies.value.length ? (page.value - 1) * pageSize + 1 : 0,
)

const lastResult = computed(() => Math.min(page.value * pageSize, filteredPolicies.value.length))

watch([search, status, dayGroup, cinemaId], () => {
  page.value = 1
  requestError.value = ''
})

watch(pageCount, (count) => {
  page.value = Math.min(page.value, count)
})

function clearFilters(): void {
  search.value = ''
  status.value = ''
  dayGroup.value = ''
  cinemaId.value = ''
}

function cinemaName(id: string): string {
  return listing.cinemas.data.value?.find((item) => item.id === id)?.name ?? id
}

function appliesToAll(policy: PricingPolicy): boolean {
  const cinemas = listing.cinemas.data.value ?? []

  return (
    cinemas.length > 0 &&
    cinemas.length === policy.cinemaIds.length &&
    cinemas.every((item) => policy.cinemaIds.includes(item.id))
  )
}

function formatsLabel(policy: PricingPolicy): string {
  const matrix = rowDetails.value.get(policy.id)?.data?.matrix
  if (!matrix) return 'Giá bán cố định'

  const formats = [...new Set(matrix.scopes.map((scope) => scope.contentFormat))]

  return formats.length ? `${formats.join(' / ')} · Giá bán cố định` : 'Chưa chọn định dạng'
}

function completenessLabel(policy: PricingPolicy): string {
  const row = rowDetails.value.get(policy.id)

  if (row?.loading && !row.data) return 'Đang tải…'
  if (row?.error || !row?.data) return 'Chưa tải được'

  const matrix = row.data.matrix

  if (matrix.requiredCellCount === 0) return 'Chưa cấu hình'
  if (matrix.missingCellCount > 0) return `${matrix.missingCellCount} ô chưa nhập`

  return 'Hoàn chỉnh'
}

function isComplete(policy: PricingPolicy): boolean {
  return rowDetails.value.get(policy.id)?.data?.matrix.coverageComplete === true
}

function openCreate(): void {
  if (!canManage.value || busy.value) return

  const cinemas = listing.cinemas.data.value ?? []
  if (!cinemas.length) return

  dialogDetail.value = undefined
  dialogCinemaId.value = cinemaId.value || cinemas[0]?.id || ''
  dialogInitialCinemaIds.value = cinemaId.value ? [cinemaId.value] : cinemas.map((item) => item.id)
  dialogMode.value = 'create'
}

async function openPolicy(policy: PricingPolicy, edit: boolean): Promise<void> {
  if (!canManage.value || busy.value) return

  const availableIds = new Set((listing.cinemas.data.value ?? []).map((item) => item.id))

  const anchor =
    cinemaId.value && policy.cinemaIds.includes(cinemaId.value)
      ? cinemaId.value
      : policy.cinemaIds.find((id) => availableIds.has(id))

  if (!anchor) {
    requestError.value = 'Không tìm thấy cụm rạp phù hợp để mở bảng giá.'
    return
  }

  openingId.value = policy.id
  requestError.value = ''

  try {
    const detail = await actions.loadDetail({
      cinemaId: anchor,
      policyId: policy.policyId,
      versionId: policy.id,
    })

    if (!canManage.value) return

    dialogDetail.value = detail
    dialogCinemaId.value = anchor
    dialogInitialCinemaIds.value = [...detail.policy.cinemaIds]

    if (edit && detail.policy.status === 'DRAFT') {
      dialogMode.value = 'edit'
    } else if (detail.policy.status === 'PUBLISHED') {
      dialogMode.value = 'quote'
    } else {
      dialogMode.value = 'preview'
    }
  } catch (error: unknown) {
    requestError.value = pricingErrorMessage(error)
  } finally {
    openingId.value = ''
  }
}

async function refresh(): Promise<void> {
  if (!canManage.value || refreshing.value || dialogMode.value !== null) return

  refreshing.value = true
  requestError.value = ''

  try {
    await queryClient.invalidateQueries({
      queryKey: ['pricing', 'admin'],
      refetchType: 'active',
    })
  } finally {
    refreshing.value = false
  }
}

async function closeDialog(): Promise<void> {
  dialogMode.value = null
  dialogDetail.value = undefined
  await refresh()
}
</script>

<template>
  <section class="pricing-page" aria-labelledby="pricing-page-title">
    <header class="price-page-head">
      <div>
        <h1 id="pricing-page-title">Chính sách vé</h1>
        <p>Giá bán cụ thể cho từng định dạng, hạng ghế và đối tượng.</p>
      </div>
      <button
        v-if="canManage"
        class="price-button price-button--primary"
        type="button"
        :disabled="busy || !listing.cinemas.data.value?.length"
        @click="openCreate"
      >
        <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14 M5 12h14" />
        </svg>
        Tạo bảng giá
      </button>
    </header>

    <div class="price-notice price-notice--info">
      <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 7v3 M15 13v2 M15 18v1" />
      </svg>
      <span>
        Bảng giá lễ/Tết được chọn trực tiếp cho suất chiếu. Mỗi định dạng có giá riêng; từ đúng
        17:00 áp dụng khung buổi tối.
      </span>
    </div>

    <p v-if="!canManage" class="price-notice price-notice--error" role="alert">
      Bạn không có quyền quản lý bảng giá.
    </p>

    <template v-else>
      <p v-if="listing.cinemas.isError.value" class="price-notice price-notice--error" role="alert">
        {{ pricingErrorMessage(listing.cinemas.error.value) }}
      </p>
      <p v-if="listing.errors.value.length" class="price-notice price-notice--error" role="alert">
        Một phần danh sách chưa tải được.
        {{ pricingErrorMessage(listing.errors.value[0]) }}
      </p>
      <p v-if="requestError" class="price-notice price-notice--error" role="alert">
        {{ requestError }}
      </p>

      <div class="price-card">
        <div class="price-filter-row">
          <label class="price-search">
            <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6" />
            </svg>
            <input
              v-model="search"
              type="search"
              aria-label="Tìm bảng giá"
              placeholder="Tìm kiếm…"
              :disabled="openingId !== ''"
            />
          </label>

          <select
            v-model="status"
            class="price-control"
            aria-label="Lọc trạng thái"
            :disabled="openingId !== ''"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đã công bố</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="RETIRED">Ngừng áp dụng</option>
          </select>

          <select
            v-model="dayGroup"
            class="price-control"
            aria-label="Lọc loại ngày"
            :disabled="openingId !== ''"
          >
            <option value="">Tất cả loại ngày</option>
            <option value="WEEKDAY">Ngày thường</option>
            <option value="WEEKEND">Cuối tuần</option>
            <option value="HOLIDAY">Lễ/Tết</option>
          </select>

          <select
            v-model="cinemaId"
            class="price-control"
            aria-label="Lọc cụm rạp"
            :disabled="busy"
          >
            <option value="">Tất cả cụm rạp</option>
            <option
              v-for="cinema in listing.cinemas.data.value ?? []"
              :key="cinema.id"
              :value="cinema.id"
            >
              {{ cinema.name }}
            </option>
          </select>

          <button
            v-if="hasFilters"
            class="price-button price-button--small"
            type="button"
            :disabled="openingId !== ''"
            @click="clearFilters"
          >
            Xóa lọc
          </button>

          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            aria-label="Tải lại bảng giá"
            title="Tải lại"
            :disabled="busy"
            @click="refresh"
          >
            <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6v5h-5 M4 18v-5h5 M19 11a7 7 0 0 0-12-6L4 8 M5 13a7 7 0 0 0 12 6l3-3" />
            </svg>
          </button>
        </div>

        <div
          v-if="listing.loading.value && !visiblePolicies.length"
          class="price-empty"
          role="status"
        >
          Đang tải bảng giá…
        </div>

        <div v-else-if="!visiblePolicies.length" class="price-empty">
          {{
            listing.policies.value.length
              ? 'Không có bảng giá phù hợp bộ lọc.'
              : 'Chưa có bảng giá trong phạm vi đang xem.'
          }}
        </div>

        <div v-else class="price-table-wrap" tabindex="0" aria-label="Danh sách chính sách vé">
          <table class="price-table">
            <thead>
              <tr>
                <th scope="col">Bảng giá</th>
                <th scope="col">Loại ngày</th>
                <th scope="col">Phạm vi áp dụng</th>
                <th scope="col">Mức độ hoàn chỉnh</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">
                  <span class="price-visually-hidden">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="policy in visiblePolicies" :key="policy.policyId">
                <td>
                  <b>{{ policy.name }}</b>
                  <span class="price-cell-sub">{{ formatsLabel(policy) }}</span>
                </td>
                <td>
                  <span class="price-chip">{{ pricingLabel(policy.dayGroup) }}</span>
                </td>
                <td>
                  <template v-if="appliesToAll(policy)">Toàn hệ thống</template>
                  <template v-else>
                    <span v-for="id in policy.cinemaIds" :key="id" class="price-cinema-name">
                      {{ cinemaName(id) }}
                    </span>
                  </template>
                </td>
                <td>
                  <span class="price-badge" :class="{ 'price-badge--success': isComplete(policy) }">
                    {{ completenessLabel(policy) }}
                  </span>
                </td>
                <td>
                  <span
                    class="price-badge"
                    :class="{ 'price-badge--success': policy.status === 'PUBLISHED' }"
                  >
                    {{ pricingLabel(policy.status) }}
                  </span>
                </td>
                <td>
                  <div class="price-actions">
                    <button
                      class="price-button price-button--small"
                      type="button"
                      :disabled="openingId !== ''"
                      :aria-busy="openingId === policy.id"
                      @click="openPolicy(policy, false)"
                    >
                      {{ openingId === policy.id ? 'Đang mở…' : 'Tra giá' }}
                    </button>
                    <button
                      v-if="policy.status === 'DRAFT'"
                      class="price-button price-button--icon price-button--ghost"
                      type="button"
                      :aria-label="`Chỉnh sửa ${policy.name}`"
                      title="Chỉnh sửa bảng giá"
                      :disabled="openingId !== ''"
                      @click="openPolicy(policy, true)"
                    >
                      <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 16l11-11 4 4L8 20H4z M14 6l4 4" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="price-pagination">
          <span>
            {{
              filteredPolicies.length
                ? `Hiển thị ${firstResult}–${lastResult} trong ${filteredPolicies.length} kết quả`
                : '0 kết quả'
            }}
          </span>
          <div class="price-actions">
            <button
              class="price-button price-button--page"
              type="button"
              aria-label="Trang trước"
              :disabled="page === 1 || openingId !== ''"
              @click="page--"
            >
              ‹
            </button>
            <span class="price-chip">{{ page }} / {{ pageCount }}</span>
            <button
              class="price-button price-button--page"
              type="button"
              aria-label="Trang sau"
              :disabled="page === pageCount || openingId !== ''"
              @click="page++"
            >
              ›
            </button>
          </div>
        </footer>
      </div>

      <AdminPricingPublishedQuoteDialog
        v-if="dialogMode === 'quote' && dialogDetail"
        :key="`quote:${dialogDetail.policy.id}`"
        :cinemas="listing.cinemas.data.value ?? []"
        :anchor-cinema-id="dialogCinemaId"
        :can-manage="canManage"
        :initial="dialogDetail"
        @close="closeDialog"
      />

      <AdminPricingWorkflowCreate
        v-else-if="dialogMode"
        :key="dialogDetail?.policy.id ?? 'new-pricing-policy'"
        :cinemas="listing.cinemas.data.value ?? []"
        :anchor-cinema-id="dialogCinemaId"
        :initial-cinema-ids="dialogInitialCinemaIds"
        :configuration-options="configurationOptions"
        :initial="dialogDetail"
        :can-manage="canManage"
        :read-only="dialogMode === 'preview'"
        @close="closeDialog"
      />
    </template>
  </section>
</template>
