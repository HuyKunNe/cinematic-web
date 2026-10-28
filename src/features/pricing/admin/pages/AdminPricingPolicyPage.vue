<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
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
import {
  pricingDraftCreationErrorMessage,
  useCreatePricingDraftFromPublished,
} from '../api/admin-pricing-draft'
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
const notice = ref('')
const dialogMode = ref<'create' | 'edit' | 'revise' | 'preview' | 'quote' | null>(null)
const dialogDetail = ref<PricingDetail>()
const dialogCinemaId = ref('')
const dialogInitialCinemaIds = ref<string[]>([])

const listing = useAdminPricingList(canManage, cinemaId)
const actions = useAdminPricingActions(canManage)
const drafts = useCreatePricingDraftFromPublished(canManage)

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
const busy = computed(
  () => refreshing.value || listing.loading.value || openingId.value !== '' || drafts.pending.value,
)
const recovery = computed(() =>
  drafts.needsRecovery.value && openingId.value === '' ? drafts.checkpoint.value : null,
)
const unknownDraftResult = computed(
  () => drafts.needsRecovery.value && !drafts.checkpoint.value?.created,
)
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
  notice.value = ''
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
  return matrix.missingCellCount > 0 ? `${matrix.missingCellCount} ô chưa nhập` : 'Hoàn chỉnh'
}
function isComplete(policy: PricingPolicy): boolean {
  return rowDetails.value.get(policy.id)?.data?.matrix.coverageComplete === true
}
function chooseAnchor(policy: PricingPolicy, preferredCinemaId: string): string | undefined {
  const ids = new Set((listing.cinemas.data.value ?? []).map((item) => item.id))
  if (policy.cinemaIds.includes(preferredCinemaId) && ids.has(preferredCinemaId))
    return preferredCinemaId
  return policy.cinemaIds.find((id) => ids.has(id))
}
function showDetail(detail: PricingDetail, anchor: string, edit: boolean): void {
  dialogDetail.value = detail
  dialogCinemaId.value = anchor
  dialogInitialCinemaIds.value = [...detail.policy.cinemaIds]
  dialogMode.value =
    edit && detail.policy.status === 'DRAFT'
      ? 'edit'
      : edit && detail.policy.status === 'PUBLISHED'
        ? 'revise'
        : detail.policy.status === 'PUBLISHED'
          ? 'quote'
          : 'preview'
}
function openCreate(): void {
  if (!canManage.value || busy.value || drafts.needsRecovery.value) return
  const cinemas = listing.cinemas.data.value ?? []
  if (!cinemas.length) return
  dialogDetail.value = undefined
  dialogCinemaId.value = cinemaId.value || cinemas[0]?.id || ''
  dialogInitialCinemaIds.value = cinemaId.value ? [cinemaId.value] : cinemas.map((item) => item.id)
  notice.value = ''
  dialogMode.value = 'create'
}
async function openCreatedDraft(created: PricingPolicy): Promise<void> {
  const checkpoint = drafts.checkpoint.value
  const metadata = listing.policies.value.find((item) => item.id === created.id) ?? created
  const anchor = chooseAnchor(metadata, checkpoint?.cinemaId ?? cinemaId.value)
  if (!anchor) {
    throw new Error(
      'Bản nháp đã được tạo nhưng chưa tìm thấy cụm rạp phù hợp để mở. Hãy tải lại danh sách.',
    )
  }
  const detail = await actions.loadDetail({
    cinemaId: anchor,
    policyId: created.policyId,
    versionId: created.id,
  })
  if (!canManage.value) throw new Error('Bạn không còn quyền mở bản nháp này.')
  showDetail(detail, anchor, true)
  drafts.markOpened(detail.policy.id)
  notice.value =
    detail.policy.status === 'DRAFT'
      ? `Đang chỉnh sửa bản nháp phiên bản ${detail.policy.revision}.`
      : `Phiên bản ${detail.policy.revision} hiện ở trạng thái ${pricingLabel(detail.policy.status).toLocaleLowerCase('vi-VN')}.`
}

async function createPublishedDraft(): Promise<PricingDetail> {
  const source = dialogDetail.value
  const anchor = dialogCinemaId.value
  if (!canManage.value || dialogMode.value !== 'revise' || source?.policy.status !== 'PUBLISHED') {
    throw new Error('Chưa xác định được bảng giá đã công bố để chỉnh sửa.')
  }

  const created = await drafts.start(anchor, source.policy)
  const detail = await actions.loadDetail({
    cinemaId: anchor,
    policyId: created.policyId,
    versionId: created.id,
  })
  if (!canManage.value) throw new Error('Bạn không còn quyền mở bản nháp này.')
  if (detail.policy.status !== 'DRAFT' || detail.policy.version !== created.version) {
    throw new Error('Bản nháp đã thay đổi. Hãy tải lại danh sách trước khi tiếp tục.')
  }
  return detail
}

async function openPolicy(policy: PricingPolicy, edit: boolean): Promise<void> {
  if (!canManage.value || busy.value || drafts.needsRecovery.value) return

  const anchor = chooseAnchor(policy, cinemaId.value)
  if (!anchor) {
    requestError.value = 'Không tìm thấy cụm rạp phù hợp để mở bảng giá.'
    return
  }

  openingId.value = policy.id
  requestError.value = ''
  notice.value = ''

  try {
    let selected = policy

    if (!edit) {
      const versions = await actions.loadVersions(anchor, policy.policyId)
      const candidate = versions.find((version) => version.status === 'PUBLISHED') ?? versions[0]

      if (!candidate) {
        throw new Error('Không tìm thấy phiên bản bảng giá trong phạm vi đang xem.')
      }

      selected = candidate
    }

    if (!canManage.value) return

    const detail = await actions.loadDetail({
      cinemaId: anchor,
      policyId: selected.policyId,
      versionId: selected.id,
    })

    if (!canManage.value) return

    if (!edit && selected.status === 'PUBLISHED' && detail.policy.status !== 'PUBLISHED') {
      throw new Error(
        'Phiên bản công bố đã thay đổi trạng thái. Hãy tải lại danh sách trước khi tra giá.',
      )
    }

    showDetail(detail, anchor, edit)
  } catch (cause: unknown) {
    requestError.value = pricingDraftCreationErrorMessage(cause)
  } finally {
    openingId.value = ''
  }
}

async function resumeDraft(): Promise<void> {
  if (!canManage.value || busy.value || dialogMode.value !== null) return
  const checkpoint = drafts.checkpoint.value
  if (!checkpoint) return
  openingId.value = checkpoint.source.id
  requestError.value = ''
  try {
    await openCreatedDraft(await drafts.resume())
  } catch (cause: unknown) {
    requestError.value = pricingDraftCreationErrorMessage(cause)
  } finally {
    openingId.value = ''
  }
}
async function refresh(): Promise<void> {
  if (
    !canManage.value ||
    refreshing.value ||
    openingId.value !== '' ||
    drafts.pending.value ||
    dialogMode.value !== null
  )
    return
  refreshing.value = true
  requestError.value = ''
  try {
    await queryClient.invalidateQueries({ queryKey: ['pricing', 'admin'], refetchType: 'active' })
  } finally {
    refreshing.value = false
  }
}
async function closeDialog(): Promise<void> {
  dialogMode.value = null
  dialogDetail.value = undefined
  await refresh()
}
function confirmLeave(): boolean {
  if (drafts.pending.value) return false
  return (
    !unknownDraftResult.value ||
    window.confirm(
      'Chưa xác định được kết quả tạo bản nháp. Rời trang sẽ mất mã thử lại đang giữ. ' +
        'Bạn muốn rời trang và kiểm tra danh sách trước khi tạo thêm?',
    )
  )
}
function preventUnload(event: BeforeUnloadEvent): void {
  if (!drafts.pending.value && !unknownDraftResult.value) return
  event.preventDefault()
  event.returnValue = ''
}
onBeforeRouteLeave(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))
</script>

<template>
  <section class="pricing-page" aria-labelledby="pricing-page-title">
    <header class="price-page-head">
      <div>
        <h1 id="pricing-page-title">Chính sách vé</h1>
        <p>Giá bán cụ thể cho từng định dạng, hạng ghế và nhóm vé.</p>
      </div>
      <button
        v-if="canManage"
        class="price-button price-button--primary"
        type="button"
        :disabled="busy || drafts.needsRecovery.value || !listing.cinemas.data.value?.length"
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
        Bảng giá Lễ/Tết được chọn trực tiếp cho suất chiếu. Mỗi định dạng có giá riêng; khung giờ và
        nhóm vé được cấu hình theo từng phiên bản bảng giá.
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
        Một phần danh sách chưa tải được. {{ pricingErrorMessage(listing.errors.value[0]) }}
      </p>
      <p v-if="requestError" class="price-notice price-notice--error" role="alert">
        {{ requestError }}
      </p>

      <div v-if="recovery" class="price-notice price-notice--info" role="status">
        <div>
          <p>
            {{
              recovery.created
                ? `Đã tạo phiên bản ${recovery.created.revision} của “${recovery.source.name}” nhưng chưa mở được nội dung.`
                : `Chưa xác định được kết quả tạo bản nháp từ “${recovery.source.name}”.`
            }}
          </p>
          <div class="price-actions">
            <button
              class="price-button price-button--small"
              type="button"
              :disabled="busy"
              @click="resumeDraft"
            >
              {{ recovery.created ? 'Mở phiên bản đã tạo' : 'Thử lại cùng yêu cầu' }}
            </button>
            <button
              class="price-button price-button--small"
              type="button"
              :disabled="busy"
              @click="refresh"
            >
              Tải lại danh sách
            </button>
          </div>
        </div>
      </div>
      <p v-if="notice && !dialogMode" class="price-notice price-notice--info" role="status">
        {{ notice }}
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
                <th scope="col">Trạng thái phiên bản</th>
                <th scope="col"><span class="price-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="policy in visiblePolicies" :key="policy.policyId">
                <td>
                  <b>{{ policy.name }}</b
                  ><span class="price-cell-sub">{{ formatsLabel(policy) }}</span>
                </td>
                <td>
                  <span class="price-chip">{{ pricingLabel(policy.dayGroup) }}</span>
                </td>
                <td>
                  <template v-if="appliesToAll(policy)">Toàn hệ thống</template>
                  <template v-else>
                    <span v-for="id in policy.cinemaIds" :key="id" class="price-cinema-name">{{
                      cinemaName(id)
                    }}</span>
                  </template>
                </td>
                <td>
                  <span
                    class="price-badge"
                    :class="{ 'price-badge--success': isComplete(policy) }"
                    >{{ completenessLabel(policy) }}</span
                  >
                </td>
                <td>
                  <span
                    class="price-badge"
                    :class="{ 'price-badge--success': policy.status === 'PUBLISHED' }"
                    >{{ pricingLabel(policy.status) }}</span
                  >
                </td>
                <td>
                  <div class="price-actions">
                    <button
                      class="price-button price-button--small"
                      type="button"
                      :disabled="openingId !== '' || drafts.needsRecovery.value"
                      :aria-busy="openingId === policy.id"
                      @click="openPolicy(policy, false)"
                    >
                      {{ openingId === policy.id ? 'Đang mở…' : 'Tra giá' }}
                    </button>
                    <button
                      v-if="policy.status === 'DRAFT' || policy.status === 'PUBLISHED'"
                      class="price-button price-button--icon price-button--ghost"
                      type="button"
                      :aria-label="
                        policy.status === 'PUBLISHED'
                          ? `Chỉnh sửa phiên bản công bố ${policy.revision} của ${policy.name}`
                          : `Chỉnh sửa bản nháp phiên bản ${policy.revision} của ${policy.name}`
                      "
                      :title="
                        policy.status === 'PUBLISHED'
                          ? `Chỉnh sửa phiên bản ${policy.revision}; chỉ tạo bản nháp khi lưu`
                          : `Chỉnh sửa bản nháp phiên bản ${policy.revision}`
                      "
                      :disabled="openingId !== '' || drafts.needsRecovery.value"
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
          <span>{{
            filteredPolicies.length
              ? `Hiển thị ${firstResult}–${lastResult} trong ${filteredPolicies.length} kết quả`
              : '0 kết quả'
          }}</span>
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
        :create-draft="dialogMode === 'revise' ? createPublishedDraft : undefined"
        @draft-ready="drafts.markOpened"
        @close="closeDialog"
      />
    </template>
  </section>
</template>
