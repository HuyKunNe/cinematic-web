<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import type {
  RoomLayoutGeometryResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import {
  useAdminRoomLayoutsQuery,
  useAdminRoomLayoutContentQuery,
} from '../api/admin-room-layout-queries'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'
import AdminRoomLayoutDraftForm from '../components/AdminRoomLayoutDraftForm.vue'
import { RoomLayoutElementInputKind } from '@/services/api/generated/inventory-service/model'
import AdminRoomLayoutElementForm from '../components/AdminRoomLayoutElementForm.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const roomId = computed(() =>
  typeof route.params.roomId === 'string' ? route.params.roomId.toLowerCase() : '',
)

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const validRoom = computed(() => isRoomSeatUuid(roomId.value))
const context = useAdminRoomSeatContext(roomId, canManage)

const current = computed(() =>
  canManage.value && validRoom.value ? context.data.value : undefined,
)

const canRead = computed(() => canManage.value && validRoom.value && context.isSuccess.value)

const layouts = useAdminRoomLayoutsQuery(roomId, canRead)
const chosenId = ref('')
const selectedKey = ref('')
const zoom = ref(100)
const draftOpen = ref(false)
const draftBusy = ref(false)
const creationBlocked = ref(false)
const draftMessage = ref('')
const elementKind = ref<RoomLayoutElementInputKind | null>(null)
const editingElementId = ref('')
const elementBusy = ref(false)
const contentBlocked = ref(false)
const saveMessage = ref('')
const elementForm = ref<InstanceType<typeof AdminRoomLayoutElementForm> | null>(null)

const elementTools = [
  { kind: RoomLayoutElementInputKind.SCREEN, label: '+ Màn hình' },
  { kind: RoomLayoutElementInputKind.AISLE, label: '+ Lối đi' },
  { kind: RoomLayoutElementInputKind.EXIT, label: '+ Lối ra' },
] as const

const editorLocked = computed(
  () => draftBusy.value || elementBusy.value || elementKind.value !== null,
)
const canCreate = computed(
  () =>
    !editorLocked.value &&
    canRead.value &&
    !context.isFetching.value &&
    layouts.isSuccess.value &&
    !layouts.isFetching.value &&
    !draftBusy.value &&
    !creationBlocked.value,
)

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  editorLocked,
  (pending) => {
    if (pending) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
})

onBeforeRouteLeave(() => !editorLocked.value)
onBeforeRouteUpdate(() => !editorLocked.value)

async function openDraftForm() {
  if (!canCreate.value || draftOpen.value) return

  draftMessage.value = ''
  draftOpen.value = true

  await nextTick()
  document.querySelector<HTMLElement>('.layout-draft-form input')?.focus()
}

async function onDraftCreated(created: RoomLayoutResponse) {
  if (created.roomId !== roomId.value) return

  chosenId.value = created.id
  selectedKey.value = ''
  draftOpen.value = false
  creationBlocked.value = false
  draftMessage.value = `Đã tạo bản nháp phiên bản ${created.layoutVersion}.`

  await nextTick()
  document.getElementById('room-layout-version')?.focus()
}

async function reloadVersions() {
  if (editorLocked.value || draftOpen.value || !canRead.value) return

  const requestedRoomId = roomId.value
  const result = await layouts.refetch()

  if (result.isSuccess && requestedRoomId === roomId.value) {
    creationBlocked.value = false
  }
}

const selectedVersion = computed(() => {
  const items = layouts.data.value ?? []
  return items.find((item) => item.id === chosenId.value) ?? items[0]
})

const layoutId = computed(() => selectedVersion.value?.id ?? '')
const contentQuery = useAdminRoomLayoutContentQuery(roomId, layoutId, canRead)

const content = computed(() =>
  canRead.value && layoutId.value ? contentQuery.data.value : undefined,
)

const layout = computed(() => content.value?.layout ?? selectedVersion.value)

const canAppend = computed(
  () =>
    canRead.value &&
    !context.isFetching.value &&
    layouts.isSuccess.value &&
    !layouts.isFetching.value &&
    contentQuery.isSuccess.value &&
    !contentQuery.isFetching.value &&
    content.value?.layout.status === 'DRAFT' &&
    !draftBusy.value &&
    !draftOpen.value &&
    !creationBlocked.value &&
    !contentBlocked.value,
)

async function openElementForm(kind: RoomLayoutElementInputKind) {
  if (!canAppend.value || editorLocked.value) return
  editingElementId.value = ''
  elementKind.value = kind
  saveMessage.value = ''

  await nextTick()
  document.querySelector<HTMLElement>('.layout-element-inspector input')?.focus()
}

function onElementSaved(action: 'created' | 'updated' | 'deleted') {
  const messages = {
    created: 'Đã thêm phần tử vào bản nháp.',
    updated: 'Đã cập nhật phần tử trong bản nháp.',
    deleted: 'Đã xóa phần tử khỏi bản nháp.',
  }

  elementKind.value = null
  editingElementId.value = ''
  selectedKey.value = ''
  contentBlocked.value = false
  saveMessage.value = messages[action]
}

async function reloadContent() {
  if (editorLocked.value || draftOpen.value || !canRead.value || !layoutId.value) {
    return
  }

  const requestedRoomId = roomId.value
  const requestedLayoutId = layoutId.value
  const result = await contentQuery.refetch()

  if (
    result.isSuccess &&
    requestedRoomId === roomId.value &&
    requestedLayoutId === layoutId.value
  ) {
    contentBlocked.value = false
  }
}

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    SEAT: 'Ghế',
    SCREEN: 'Màn hình',
    AISLE: 'Lối đi',
    EXIT: 'Lối ra',
    STANDARD: 'Ghế thường',
    VIP: 'VIP',
    COUPLE: 'Ghế đôi',
    ACCESSIBLE: 'Hỗ trợ tiếp cận',
  }

  return labels[kind] ?? kind
}

const objects = computed(() => [
  ...(content.value?.seats ?? []).map((seat) => ({
    key: `seat:${seat.id}`,
    name: seat.seatNumberSnapshot,
    kind: 'SEAT',
    type: seat.seatTypeSnapshot as string,
    row: seat.rowLabelSnapshot,
    geometry: seat.geometry,
  })),
  ...(content.value?.elements ?? []).map((element) => ({
    key: `element:${element.id}`,
    name: element.label?.trim() || kindLabel(element.kind),
    kind: element.kind as string,
    type: element.kind as string,
    row: '',
    geometry: element.geometry,
  })),
])

const selected = computed(() => objects.value.find((object) => object.key === selectedKey.value))

const selectedElement = computed(() =>
  content.value?.elements.find((element) => `element:${element.id}` === selectedKey.value),
)

async function openEditElementForm() {
  const element = selectedElement.value
  if (!element || !canAppend.value || editorLocked.value) return

  editingElementId.value = element.id
  elementKind.value = element.kind
  saveMessage.value = ''

  await nextTick()
  document.querySelector<HTMLElement>('.layout-element-inspector input')?.focus()
}

function closeElementForm() {
  if (elementBusy.value) return

  elementKind.value = null
  editingElementId.value = ''
}

function selectObject(key: string) {
  if (editorLocked.value || !objects.value.some((object) => object.key === key)) {
    return
  }

  selectedKey.value = key
}

const geometryFields = [
  { key: 'x', label: 'Vị trí X' },
  { key: 'y', label: 'Vị trí Y' },
  { key: 'width', label: 'Chiều rộng' },
  { key: 'height', label: 'Chiều cao' },
  { key: 'rotationDegrees', label: 'Góc xoay (độ)' },
] as const

const rowCount = computed(
  () => new Set(content.value?.seats.map((seat) => seat.rowLabelSnapshot) ?? []).size,
)

function outsideCanvas(geometry: RoomLayoutGeometryResponse) {
  if (!layout.value) return false

  const angle = (geometry.rotationDegrees * Math.PI) / 180
  const halfWidth = geometry.width / 2
  const halfHeight = geometry.height / 2
  const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfHeight
  const extentY = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfHeight
  const centerX = geometry.x + halfWidth
  const centerY = geometry.y + halfHeight
  const tolerance = 0.0000001

  return (
    centerX - extentX < -tolerance ||
    centerY - extentY < -tolerance ||
    centerX + extentX > layout.value.canvasWidth + tolerance ||
    centerY + extentY > layout.value.canvasHeight + tolerance
  )
}

const outsideCount = computed(
  () => objects.value.filter((object) => outsideCanvas(object.geometry)).length,
)

function rotation(geometry: RoomLayoutGeometryResponse) {
  return `rotate(${geometry.rotationDegrees} ${
    geometry.x + geometry.width / 2
  } ${geometry.y + geometry.height / 2})`
}

function formatDate(value?: string) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function backToSeats() {
  if (editorLocked.value) return
  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: validRoom.value ? roomId.value : '' },
    query: current.value ? { cinemaId: current.value.cinema.id } : {},
  })
}

watch(
  roomId,
  () => {
    draftOpen.value = false
    draftBusy.value = false
    creationBlocked.value = false
    draftMessage.value = ''
    chosenId.value = ''
    selectedKey.value = ''
    zoom.value = 100
    editingElementId.value = ''
    elementKind.value = null
    elementBusy.value = false
    contentBlocked.value = false
    saveMessage.value = ''
  },
  { flush: 'sync' },
)

watch(layoutId, () => {
  saveMessage.value = ''
  selectedKey.value = ''
  zoom.value = 100
})

watch(objects, (items) => {
  if (!items.some((item) => item.key === selectedKey.value)) {
    selectedKey.value = ''
  }
})
</script>

<template>
  <section
    class="room-layout-page"
    data-reference="admin-room-layout"
    aria-labelledby="room-layout-title"
  >
    <header class="layout-heading">
      <div>
        <p class="layout-eyebrow">
          {{ current ? `${current.cinema.name} · ${current.room.name}` : 'Cấu hình phòng chiếu' }}
        </p>
        <h1 id="room-layout-title">Thiết kế không gian phòng</h1>
        <p>Thiết lập vị trí, kích thước và góc xoay trước khi xuất bản sơ đồ.</p>
      </div>

      <div class="layout-heading__actions">
        <AppButton variant="secondary" @click="backToSeats" :disabled="editorLocked"
          >Quay lại phòng</AppButton
        >
        <AppButton
          variant="secondary"
          :disabled="!elementKind || !canAppend || !elementForm?.canSave"
          :loading="elementBusy"
          @click="elementForm?.submit()"
        >
          Lưu nháp
        </AppButton>
        <AppButton disabled title="Xuất bản chưa được triển khai."> Xuất bản layout </AppButton>
      </div>
    </header>

    <p v-if="!canManage" class="layout-error" role="alert">
      Tài khoản không có quyền quản lý sơ đồ phòng.
    </p>
    <p v-else-if="!validRoom" class="layout-error" role="alert">
      Mã phòng trong đường dẫn không hợp lệ.
    </p>

    <div v-else-if="context.isError.value" class="layout-feedback">
      <p class="layout-error" role="alert">
        {{ adminRoomErrorMessage(context.error.value, 'Không thể tải thông tin phòng.') }}
      </p>
      <AppButton variant="secondary" :loading="context.isFetching.value" @click="context.refetch()">
        Tải lại thông tin phòng
      </AppButton>
    </div>

    <p v-else-if="!current" class="layout-muted" role="status">Đang tải thông tin phòng…</p>

    <template v-else>
      <aside class="layout-draft-notice" role="status">
        <span class="layout-draft-notice__dot" aria-hidden="true"></span>
        <span>
          <strong>
            {{
              layout
                ? layout.status === 'DRAFT'
                  ? 'Bản nháp'
                  : 'Đã xuất bản'
                : 'Chưa chọn phiên bản'
            }}
          </strong>
          <template v-if="layout"> · Phiên bản {{ layout.layoutVersion }}</template>
        </span>
        <span class="layout-draft-notice__meta">
          Cập nhật lần cuối: {{ formatDate(layout?.updatedAt) }}
        </span>
      </aside>

      <p v-if="draftMessage" class="layout-muted" role="status">
        {{ draftMessage }}
      </p>
      <p v-if="saveMessage" class="layout-muted" role="status">
        {{ saveMessage }}
      </p>

      <section class="layout-toolbar layout-panel" aria-label="Công cụ thiết kế">
        <div class="layout-tools" role="group" aria-label="Công cụ đặt đối tượng">
          <button class="layout-tool" type="button" @click="backToSeats" :disabled="editorLocked">
            Xếp ghế theo hàng
          </button>
          <button
            v-for="tool in elementTools"
            :key="tool.kind"
            class="layout-tool"
            type="button"
            :class="{ 'is-active': elementKind === tool.kind }"
            :disabled="editorLocked || !canAppend"
            @click="openElementForm(tool.kind)"
          >
            {{ tool.label }}
          </button>
        </div>

        <div class="layout-toolbar__actions">
          <button class="layout-icon-button" type="button" disabled aria-label="Hoàn tác">↶</button>
          <button class="layout-icon-button" type="button" disabled aria-label="Làm lại">↷</button>
          <span class="layout-toolbar__divider" aria-hidden="true"></span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Thu nhỏ sơ đồ"
            :disabled="!content || zoom <= 50"
            @click="zoom = Math.max(50, zoom - 25)"
          >
            −
          </button>
          <span class="layout-zoom" aria-live="polite">{{ zoom }}%</span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Phóng to sơ đồ"
            :disabled="!content || zoom >= 200"
            @click="zoom = Math.min(200, zoom + 25)"
          >
            ＋
          </button>
        </div>
      </section>

      <div class="layout-workspace">
        <section class="layout-canvas-panel layout-panel" aria-labelledby="layout-canvas-title">
          <header class="layout-canvas-heading">
            <div>
              <h2 id="layout-canvas-title">Sơ đồ phòng</h2>
              <p>Chọn đối tượng để xem thuộc tính đã lưu.</p>
            </div>
            <span class="layout-seat-count">{{ content?.seats.length ?? '—' }} ghế</span>
          </header>

          <div class="layout-legend" aria-label="Chú thích">
            <span><i class="layout-legend__swatch layout-legend__swatch--standard"></i>Thường</span>
            <span><i class="layout-legend__swatch layout-legend__swatch--vip"></i>VIP</span>
            <span
              ><i class="layout-legend__swatch layout-legend__swatch--selected"></i>Đang chọn</span
            >
          </div>

          <p v-if="contentQuery.isError.value" class="layout-error" role="alert">
            {{ adminRoomErrorMessage(contentQuery.error.value, 'Không thể tải nội dung sơ đồ.') }}
            <template v-if="content">Đang hiển thị nội dung từ lần tải trước.</template>
          </p>
          <p v-else-if="contentQuery.isFetching.value" class="layout-muted" role="status">
            Đang tải nội dung sơ đồ…
          </p>

          <p v-if="outsideCount" class="layout-warning" role="status">
            {{ outsideCount }} đối tượng vượt giới hạn canvas. Geometry được giữ nguyên.
          </p>

          <div
            class="layout-canvas-scroll"
            role="region"
            aria-label="Sơ đồ phòng, có thể cuộn"
            tabindex="0"
          >
            <svg
              v-if="content"
              class="layout-preview-svg"
              :style="{ '--layout-zoom-factor': zoom / 100 }"
              :viewBox="`0 0 ${content.layout.canvasWidth} ${content.layout.canvasHeight}`"
              :width="content.layout.canvasWidth"
              :height="content.layout.canvasHeight"
              aria-label="Đối tượng trong sơ đồ phòng"
            >
              <g
                v-for="object in objects"
                :key="object.key"
                class="layout-preview-object"
                :class="{
                  'is-vip': object.type === 'VIP',
                  'is-screen': object.kind === 'SCREEN',
                  'is-aisle': object.kind === 'AISLE',
                  'is-exit': object.kind === 'EXIT',
                  'is-selected': selectedKey === object.key,
                }"
                :transform="rotation(object.geometry)"
                role="button"
                :tabindex="editorLocked ? -1 : 0"
                :aria-disabled="editorLocked"
                @click="selectObject(object.key)"
                @keydown.enter.prevent="selectObject(object.key)"
                @keydown.space.prevent="selectObject(object.key)"
                :aria-label="`${kindLabel(object.type)} ${object.name}`"
                :aria-pressed="selectedKey === object.key"
              >
                <title>{{ object.name }}</title>
                <rect
                  :x="object.geometry.x"
                  :y="object.geometry.y"
                  :width="object.geometry.width"
                  :height="object.geometry.height"
                />
                <text
                  :x="object.geometry.x + object.geometry.width / 2"
                  :y="object.geometry.y + object.geometry.height / 2"
                  text-anchor="middle"
                  dominant-baseline="middle"
                >
                  {{ object.name }}
                </text>
              </g>
            </svg>

            <p v-else class="layout-muted">
              {{
                layoutId ? 'Chưa có nội dung để hiển thị.' : 'Chọn phiên bản để xem sơ đồ phòng.'
              }}
            </p>
          </div>

          <p v-if="content && !objects.length" class="layout-muted">
            Phiên bản này chưa có ghế hoặc phần tử không gian.
          </p>

          <footer class="layout-canvas-footer">
            <span
              >{{ content?.seats.length ?? 0 }} ghế · {{ content?.elements.length ?? 0 }} phần
              tử</span
            >
            <span>Kéo ngang để xem toàn bộ sơ đồ trên màn hình nhỏ</span>
          </footer>
        </section>

        <aside class="layout-inspector">
          <section
            class="layout-inspector-panel layout-panel"
            :aria-labelledby="elementKind ? undefined : 'layout-object-title'"
            :aria-label="
              elementKind
                ? editingElementId
                  ? 'Sửa phần tử không gian'
                  : 'Thêm phần tử không gian'
                : undefined
            "
          >
            <AdminRoomLayoutElementForm
              v-if="elementKind && content"
              ref="elementForm"
              class="layout-element-inspector"
              :key="`${roomId}:${layoutId}:${elementKind}:${editingElementId}`"
              :content="content"
              :kind="elementKind"
              :element-id="editingElementId || undefined"
              :enabled="canAppend"
              @busy="elementBusy = $event"
              @saved="onElementSaved"
              @failed="contentBlocked = true"
              @cancel="closeElementForm"
            />

            <template v-else>
              <header class="layout-canvas-heading">
                <div>
                  <p class="layout-inspector__eyebrow">ĐỐI TƯỢNG ĐANG CHỌN</p>
                  <h2 id="layout-object-title">{{ selected?.name ?? 'Chưa chọn đối tượng' }}</h2>
                </div>
                <span v-if="selected" class="layout-seat-type-badge">
                  {{ kindLabel(selected.type) }}
                </span>
              </header>

              <p class="layout-muted">
                Loại ghế và trạng thái được chỉnh trong trang Ghế của phòng.
              </p>

              <template v-if="selected">
                <label v-for="field in geometryFields" :key="field.key" class="layout-field">
                  <span>{{ field.label }}</span>
                  <input type="text" :value="selected.geometry[field.key]" readonly />
                </label>

                <div v-if="selected.kind === 'SEAT'" class="layout-seat-info">
                  <span
                    >Hàng <strong>{{ selected.row }}</strong></span
                  >
                  <span
                    >Mã ghế <strong>{{ selected.name }}</strong></span
                  >
                </div>
              </template>

              <p v-else class="layout-muted">Chọn đối tượng trên canvas để xem geometry.</p>

              <AppButton
                v-if="selectedElement"
                variant="secondary"
                class="layout-inspector__button"
                :disabled="editorLocked || !canAppend"
                @click="openEditElementForm"
              >
                Sửa phần tử
              </AppButton>

              <AppButton v-else variant="secondary" class="layout-inspector__button" disabled>
                Áp dụng vị trí
              </AppButton>
            </template>
          </section>

          <section
            class="layout-inspector-panel layout-panel"
            aria-labelledby="layout-summary-title"
          >
            <header class="layout-canvas-heading">
              <div>
                <h2 id="layout-summary-title">Thông tin sơ đồ</h2>
                <p>Chọn phiên bản của phòng.</p>
              </div>
            </header>

            <label class="layout-field">
              <span>Phiên bản</span>
              <select
                id="room-layout-version"
                :value="layoutId"
                :disabled="
                  editorLocked ||
                  draftOpen ||
                  layouts.isFetching.value ||
                  !layouts.data.value?.length
                "
                @change="chosenId = ($event.target as HTMLSelectElement).value"
              >
                <option value="" disabled>Chọn phiên bản</option>
                <option v-for="item in layouts.data.value ?? []" :key="item.id" :value="item.id">
                  Phiên bản {{ item.layoutVersion }} ·
                  {{ item.status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản' }}
                </option>
              </select>
            </label>

            <p v-if="layouts.isError.value" class="layout-error" role="alert">
              {{ adminRoomErrorMessage(layouts.error.value, 'Không thể tải phiên bản sơ đồ.') }}
              <template v-if="layouts.data.value">
                Đang hiển thị danh sách từ lần tải trước.
              </template>
            </p>
            <p v-else-if="layouts.isFetching.value" class="layout-muted" role="status">
              Đang tải phiên bản…
            </p>
            <p
              v-else-if="layouts.isSuccess.value && !layouts.data.value?.length"
              class="layout-muted"
            >
              Phòng chưa có phiên bản sơ đồ. Tạo bản nháp để bắt đầu.
            </p>

            <AppButton
              variant="secondary"
              :disabled="editorLocked || draftOpen || !canRead"
              :loading="layouts.isFetching.value"
              @click="reloadVersions"
            >
              Tải lại phiên bản
            </AppButton>

            <AppButton
              variant="secondary"
              :disabled="editorLocked || draftOpen || !layoutId"
              :loading="contentQuery.isFetching.value"
              @click="contentQuery.refetch()"
            >
              Tải lại nội dung
            </AppButton>

            <p v-if="contentBlocked" class="layout-warning" role="status">
              Đóng form và tải lại nội dung trước khi thao tác tiếp.
            </p>

            <p v-if="creationBlocked" class="layout-warning" role="status">
              Đóng form và tải lại danh sách để kiểm tra kết quả tạo nháp trước khi thử lại.
            </p>

            <AppButton
              v-if="!draftOpen"
              variant="secondary"
              :disabled="!canCreate"
              @click="openDraftForm"
            >
              Tạo bản nháp mới
            </AppButton>

            <AdminRoomLayoutDraftForm
              v-if="draftOpen"
              :key="roomId"
              :room-id="roomId"
              :enabled="canCreate"
              @busy="draftBusy = $event"
              @created="onDraftCreated"
              @failed="creationBlocked = true"
              @cancel="draftOpen = false"
            />

            <dl v-if="content" class="layout-summary">
              <div>
                <dt>Số hàng</dt>
                <dd>{{ rowCount }}</dd>
              </div>
              <div>
                <dt>Tổng số ghế</dt>
                <dd>{{ content.seats.length }}</dd>
              </div>
              <div>
                <dt>Phần tử không gian</dt>
                <dd>{{ content.elements.length }}</dd>
              </div>
              <div>
                <dt>Canvas</dt>
                <dd>{{ content.layout.canvasWidth }} × {{ content.layout.canvasHeight }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>
