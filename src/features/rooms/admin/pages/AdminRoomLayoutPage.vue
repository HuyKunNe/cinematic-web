<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import AppAutocomplete from '@/components/ui/AppAutocomplete.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import type {
  RoomLayoutContentResponse,
  RoomLayoutElementInput,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import { useAdminRoomCinemaQuery, useAdminRoomDetailQuery } from '../api/admin-room-queries'
import { useAdminRoomSeatsQuery } from '../api/admin-seat-queries'
import {
  useAdminRoomLayoutContentQuery,
  useAdminRoomLayoutMutations,
  useAdminRoomLayoutsQuery,
} from '../api/admin-room-layout-queries'
import AdminRoomLayoutCanvas from '../components/AdminRoomLayoutCanvas.vue'
import AdminRoomSeatsDialog from '../components/AdminRoomSeatsDialog.vue'
import { isAdminRoomApiError } from '../schemas/admin-room.schema'
import {
  arrangeActiveSeats,
  cloneLayoutState,
  elementLabels,
  fromLayoutContent,
  geometryFields,
  initialSeatGeometry,
  isLayoutSeat,
  isPhysicalSeat,
  itemLabel,
  layoutErrorMessage,
  layoutSignature,
  makeLayoutElement,
  placeSeat,
  readGeometry,
  readLayoutNumber,
  seatTypeLabel,
  toLayoutRequest,
  validateLayoutState,
  type GeometryKey,
  type LayoutState,
} from '../models/admin-room-layout'

const props = defineProps<{ roomId: string }>()
const router = useRouter()
const auth = useAuthStore()

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const room = useAdminRoomDetailQuery(() => props.roomId, canManage)
const cinemas = useAdminRoomCinemaQuery(canManage)
const enabled = computed(
  () => canManage.value && room.data.value?.id === props.roomId && !room.isError.value,
)
const cinemaName = computed(
  () =>
    cinemas.data.value?.find((cinema) => cinema.id === room.data.value?.cinemaId)?.name ||
    'Rạp chiếu',
)

const layouts = useAdminRoomLayoutsQuery(() => props.roomId, enabled)
const roster = useAdminRoomSeatsQuery(() => props.roomId, enabled)
const layoutId = ref('')
const content = useAdminRoomLayoutContentQuery(layoutId, enabled)
const mutations = useAdminRoomLayoutMutations()

const layout = ref<RoomLayoutResponse | null>(null)
const state = ref<LayoutState>({ seats: [], elements: [] })
const baseline = ref('')
const selectedKey = ref('')
const selectedSeatId = ref('')
const past = ref<LayoutState[]>([])
const future = ref<LayoutState[]>([])
const zoom = ref(1)

const working = ref<'' | 'create' | 'save' | 'publish' | 'reload'>('')
const conflict = ref(false)
const message = ref('')
const success = ref('')
const propertyError = ref('')
const showCreate = ref(false)
const showSeats = ref(false)
const canvasWidth = ref('1000')
const canvasHeight = ref('600')

const form = reactive<Record<GeometryKey, string> & { label: string }>({
  x: '',
  y: '',
  width: '',
  height: '',
  rotationDegrees: '',
  label: '',
})

const selected = computed(
  () =>
    [...state.value.seats, ...state.value.elements].find(
      (item) => item.key === selectedKey.value,
    ) ?? null,
)
const contentChanged = computed(
  () => Boolean(layout.value) && layoutSignature(state.value) !== baseline.value,
)
const formChanged = computed(() => {
  const item = selected.value
  if (!item) return false

  return (
    geometryFields.some(({ key }) => form[key] !== String(item.geometry[key])) ||
    (!isLayoutSeat(item) && form.label !== (item.label ?? ''))
  )
})
const dirty = computed(() => contentChanged.value || formChanged.value)
const ready = computed(
  () =>
    enabled.value &&
    content.isSuccess.value &&
    !content.isFetching.value &&
    content.data.value?.layout.id === layoutId.value &&
    layout.value?.id === layoutId.value,
)
const editable = computed(
  () => ready.value && layout.value?.status === 'DRAFT' && !working.value && !conflict.value,
)

const versions = computed(() =>
  (layouts.data.value ?? []).filter((item) => item.roomId === props.roomId),
)
const versionOptions = computed(() =>
  versions.value.map((item) => ({
    value: item.id,
    label: `Phiên bản ${item.layoutVersion} · ${
      item.status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản'
    }`,
  })),
)
const physicalSeats = computed(() =>
  (roster.data.value ?? []).filter((seat) => isPhysicalSeat(seat, props.roomId)),
)
const availableSeats = computed(() => {
  const placed = new Set(state.value.seats.map((seat) => seat.seatId))
  return physicalSeats.value.filter((seat) => !placed.has(seat.id))
})
const seatOptions = computed(() =>
  availableSeats.value.map((seat) => ({
    value: seat.id,
    label: `${seat.seatNumber} · ${seatTypeLabel(seat.seatType)}${
      seat.active === false ? ' · Tạm ngưng' : ''
    }`,
  })),
)
const itemOptions = computed(() =>
  [...state.value.seats, ...state.value.elements].map((item, index) => ({
    value: item.key,
    label: `${itemLabel(item)}${isLayoutSeat(item) ? '' : ` · ${index + 1}`}`,
  })),
)
const rowCount = computed(
  () => new Set(state.value.seats.map((seat) => seat.rowLabelSnapshot)).size,
)
const canArrange = computed(
  () =>
    editable.value &&
    roster.isSuccess.value &&
    !roster.isFetching.value &&
    !state.value.seats.length &&
    !state.value.elements.length &&
    physicalSeats.value.some((seat) => seat.active === true),
)

function resetForm() {
  const item = selected.value
  for (const { key } of geometryFields) {
    form[key] = item ? String(item.geometry[key]) : ''
  }
  form.label = item && !isLayoutSeat(item) ? (item.label ?? '') : ''
  propertyError.value = ''
}

function adopt(response: RoomLayoutContentResponse) {
  if (response.layout.id !== layoutId.value || response.layout.roomId !== props.roomId) return

  selectedKey.value = ''
  layout.value = { ...response.layout }
  state.value = fromLayoutContent(response)
  baseline.value = layoutSignature(state.value)
  past.value = []
  future.value = []
  conflict.value = false
  resetForm()
}

watch(selected, resetForm, { flush: 'sync' })

watch(
  layoutId,
  () => {
    layout.value = null
    state.value = { seats: [], elements: [] }
    baseline.value = ''
    selectedKey.value = ''
    selectedSeatId.value = ''
    past.value = []
    future.value = []
    conflict.value = false
    message.value = ''
    success.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => props.roomId,
  () => {
    layoutId.value = ''
    showSeats.value = false
    showCreate.value = false
  },
  { flush: 'sync' },
)

watch(
  versions,
  (items) => {
    if (!layoutId.value && items.length && !working.value) {
      layoutId.value = (items.find((item) => item.status === 'DRAFT') ?? items[0])!.id
    }
  },
  { immediate: true },
)

watch(
  content.data,
  (response) => {
    if (response && !dirty.value && !working.value) adopt(response)
  },
  { immediate: true },
)

function commit(next: LayoutState) {
  if (layoutSignature(next) === layoutSignature(state.value)) return

  past.value = [...past.value, cloneLayoutState(state.value)].slice(-50)
  future.value = []
  state.value = cloneLayoutState(next)
  success.value = ''
  message.value = ''
}

function applyProperties() {
  const item = selected.value
  if (!item || !formChanged.value) return true
  if (!editable.value) return false

  try {
    const geometry = readGeometry(form)
    const label = form.label.trim()
    if (!isLayoutSeat(item) && label.length > 150) {
      throw new Error('Nhãn đối tượng tối đa 150 ký tự.')
    }

    const next = cloneLayoutState(state.value)
    const target = [...next.seats, ...next.elements].find((entry) => entry.key === item.key)
    if (!target) return false

    target.geometry = geometry
    if (!isLayoutSeat(target)) target.label = label

    commit(next)
    resetForm()
    return true
  } catch (error) {
    propertyError.value = layoutErrorMessage(error)
    return false
  }
}

function selectItem(key: string) {
  if (working.value || !applyProperties()) return
  selectedKey.value = key
}

function changeVersion(id: string) {
  if (!id || id === layoutId.value || working.value) return
  if (dirty.value && !window.confirm('Bỏ thay đổi chưa lưu để mở phiên bản khác?')) return
  layoutId.value = id
}

function undo() {
  if (!editable.value) return
  if (formChanged.value) return resetForm()

  const previous = past.value.at(-1)
  if (!previous) return

  future.value = [...future.value, cloneLayoutState(state.value)]
  past.value = past.value.slice(0, -1)
  selectedKey.value = ''
  state.value = cloneLayoutState(previous)
}

function redo() {
  if (!editable.value || formChanged.value) return

  const next = future.value.at(-1)
  if (!next) return

  past.value = [...past.value, cloneLayoutState(state.value)]
  future.value = future.value.slice(0, -1)
  selectedKey.value = ''
  state.value = cloneLayoutState(next)
}

function addSeat() {
  if (!editable.value || !layout.value || !applyProperties()) return

  const seat = availableSeats.value.find((item) => item.id === selectedSeatId.value)
  if (!seat) return

  const next = cloneLayoutState(state.value)
  const placed = placeSeat(seat, initialSeatGeometry(layout.value))
  next.seats.push(placed)
  commit(next)
  selectedKey.value = placed.key
  selectedSeatId.value = ''
}

function addElement(kind: RoomLayoutElementInput['kind']) {
  if (!editable.value || !layout.value || !applyProperties()) return

  const next = cloneLayoutState(state.value)
  const element = makeLayoutElement(layout.value, kind)
  next.elements.push(element)
  commit(next)
  selectedKey.value = element.key
}

function removeSelected() {
  if (!editable.value || !selected.value) return

  const key = selected.value.key
  selectedKey.value = ''
  commit({
    seats: state.value.seats.filter((item) => item.key !== key),
    elements: state.value.elements.filter((item) => item.key !== key),
  })
}

function arrange() {
  if (!canArrange.value || !layout.value) return

  try {
    commit(arrangeActiveSeats(layout.value, physicalSeats.value))
  } catch (error) {
    message.value = layoutErrorMessage(error)
  }
}

function prepareSave() {
  if (!applyProperties()) return false

  try {
    validateLayoutState(state.value)
    return true
  } catch (error) {
    message.value = layoutErrorMessage(error)
    return false
  }
}

function handleMutationError(error: unknown) {
  message.value = layoutErrorMessage(error)
  if (isAdminRoomApiError(error) && error.status === 409) conflict.value = true
}

async function createDraft() {
  if (!enabled.value || working.value || dirty.value) return

  let width: number
  let height: number
  message.value = ''
  success.value = ''

  try {
    width = readLayoutNumber(canvasWidth.value, 'Chiều rộng khung', true)
    height = readLayoutNumber(canvasHeight.value, 'Chiều cao khung', true)
  } catch (error) {
    message.value = layoutErrorMessage(error)
    return
  }

  working.value = 'create'
  try {
    const created = await mutations.create.mutateAsync({
      roomId: props.roomId,
      canvasWidth: width,
      canvasHeight: height,
    })
    layoutId.value = created.id
    adopt({ layout: created, seats: [], elements: [] })
    showCreate.value = false
    success.value = 'Đã tạo bản nháp trống.'
  } catch (error) {
    message.value = layoutErrorMessage(error)
  } finally {
    working.value = ''
  }
}

async function saveDraft() {
  const current = layout.value
  if (!editable.value || !current || !prepareSave() || !contentChanged.value) return

  working.value = 'save'
  message.value = ''
  success.value = ''

  try {
    const saved = await mutations.save.mutateAsync({
      layoutId: current.id,
      input: toLayoutRequest(state.value, current.version),
    })
    adopt(saved)
    success.value = 'Đã lưu bản nháp.'
  } catch (error) {
    handleMutationError(error)
  } finally {
    working.value = ''
  }
}

async function publishDraft() {
  let current = layout.value
  if (!editable.value || !current || !prepareSave()) return

  if (!state.value.seats.length || !state.value.elements.some((item) => item.kind === 'SCREEN')) {
    message.value = 'Cần ít nhất một ghế và một màn hình để xuất bản.'
    return
  }

  working.value = 'publish'
  message.value = ''
  success.value = ''

  try {
    if (contentChanged.value) {
      const saved = await mutations.save.mutateAsync({
        layoutId: current.id,
        input: toLayoutRequest(state.value, current.version),
      })
      adopt(saved)
      current = saved.layout
    }

    const published = await mutations.publish.mutateAsync({
      layoutId: current.id,
      expectedVersion: current.version,
    })
    layout.value = published
    success.value = 'Đã xuất bản sơ đồ phòng.'
  } catch (error) {
    handleMutationError(error)
  } finally {
    working.value = ''
  }
}

async function reloadContent() {
  if (!layoutId.value || working.value) return
  if (dirty.value && !window.confirm('Bỏ thay đổi chưa lưu và tải lại sơ đồ?')) return

  working.value = 'reload'
  message.value = ''
  success.value = ''
  try {
    const result = await content.refetch()
    if (result.isSuccess && result.data) adopt(result.data)
    else message.value = layoutErrorMessage(result.error)
  } finally {
    working.value = ''
  }
}

function backToRooms() {
  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOMS,
    query: room.data.value?.cinemaId ? { cinemaId: room.data.value.cinemaId } : {},
  })
}

function canLeave() {
  if (working.value) return false
  return !dirty.value || window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')
}

onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate((to, from) => (to.params.roomId === from.params.roomId ? true : canLeave()))

function beforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value && !working.value) return
  event.preventDefault()
  event.returnValue = ''
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

function displayTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')
}
</script>

<template>
  <section class="room-layout-page" aria-labelledby="room-layout-title">
    <header class="layout-heading">
      <div>
        <p class="admin-rooms__eyebrow">
          {{ cinemaName }} · {{ room.data.value?.name || 'Phòng chiếu' }}
        </p>
        <h1 id="room-layout-title">Thiết kế sơ đồ ghế</h1>
        <p>Thiết lập vị trí ghế, màn hình và lối đi trước khi xuất bản.</p>
      </div>
      <div class="layout-heading__actions">
        <AppButton variant="secondary" :disabled="Boolean(working)" @click="backToRooms">
          Quay lại phòng
        </AppButton>
        <AppButton
          variant="secondary"
          :disabled="!editable || !dirty"
          :loading="working === 'save'"
          @click="saveDraft"
        >
          Lưu nháp
        </AppButton>
        <AppButton :disabled="!editable" :loading="working === 'publish'" @click="publishDraft">
          {{ dirty ? 'Lưu & xuất bản' : 'Xuất bản sơ đồ' }}
        </AppButton>
      </div>
    </header>

    <p v-if="!canManage" class="layout-error" role="alert">
      Tài khoản không có quyền quản lý sơ đồ phòng.
    </p>
    <p v-else-if="room.isFetching.value && !room.data.value" role="status">
      Đang tải thông tin phòng…
    </p>
    <div v-else-if="room.isError.value" class="layout-panel">
      <p class="layout-error" role="alert">{{ layoutErrorMessage(room.error.value) }}</p>
      <AppButton variant="secondary" @click="room.refetch()">Tải lại phòng</AppButton>
    </div>

    <template v-if="enabled">
      <p v-if="message" class="layout-error" role="alert">{{ message }}</p>
      <p v-if="success" class="layout-success" role="status">{{ success }}</p>

      <section class="layout-panel layout-version-controls" aria-label="Phiên bản sơ đồ">
        <AppAutocomplete
          id="room-layout-version"
          label="Phiên bản sơ đồ"
          all-label="Chọn phiên bản"
          content-class="admin-reference-autocomplete"
          :model-value="layoutId"
          :options="versionOptions"
          :loading="layouts.isFetching.value"
          :disabled="Boolean(working)"
          @update:model-value="changeVersion"
        />
        <AppButton
          variant="secondary"
          :disabled="Boolean(working) || dirty"
          @click="showCreate = !showCreate"
        >
          Tạo bản nháp trống
        </AppButton>
        <AppButton
          variant="secondary"
          :disabled="!layoutId || Boolean(working)"
          :loading="working === 'reload'"
          @click="reloadContent"
        >
          Tải lại sơ đồ
        </AppButton>
        <AppButton variant="secondary" :disabled="Boolean(working)" @click="showSeats = true">
          Quản lý ghế
        </AppButton>
      </section>

      <div v-if="layouts.isError.value" class="layout-panel">
        <p class="layout-error" role="alert">{{ layoutErrorMessage(layouts.error.value) }}</p>
        <AppButton variant="secondary" :disabled="Boolean(working)" @click="layouts.refetch()">
          Tải lại phiên bản
        </AppButton>
      </div>

      <form
        v-if="showCreate || (layouts.isSuccess.value && !versions.length)"
        class="layout-panel layout-create"
        novalidate
        @submit.prevent="createDraft"
      >
        <div class="layout-create__intro">
          <h2>Tạo bản nháp trống</h2>
          <p>Kích thước dùng đơn vị sơ đồ. Sau khi tạo, kích thước khung được giữ cố định.</p>
        </div>
        <label class="layout-field">
          <span>Chiều rộng khung</span>
          <input
            v-model="canvasWidth"
            type="number"
            min="0.001"
            step="0.001"
            required
            :disabled="Boolean(working)"
            @input="message = ''"
          />
        </label>
        <label class="layout-field">
          <span>Chiều cao khung</span>
          <input
            v-model="canvasHeight"
            type="number"
            min="0.001"
            step="0.001"
            required
            :disabled="Boolean(working)"
            @input="message = ''"
          />
        </label>
        <AppButton
          type="submit"
          :disabled="Boolean(working) || dirty"
          :loading="working === 'create'"
        >
          Tạo bản nháp
        </AppButton>
      </form>

      <p v-if="content.isFetching.value" class="layout-muted" role="status">Đang tải sơ đồ…</p>
      <p v-if="content.isError.value" class="layout-error" role="alert">
        {{ layoutErrorMessage(content.error.value) }}
      </p>

      <template v-if="layout">
        <aside class="layout-draft-notice" role="status">
          <strong>{{ layout.status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản' }}</strong>
          <span>
            {{
              conflict
                ? 'Cần tải lại để tiếp tục'
                : dirty
                  ? 'Có thay đổi chưa lưu'
                  : layout.status === 'DRAFT'
                    ? 'Đã lưu các thay đổi'
                    : 'Phiên bản chỉ cho xem'
            }}
          </span>
          <span class="layout-draft-notice__meta">
            Cập nhật: {{ displayTime(layout.updatedAt) }}
          </span>
        </aside>

        <section class="layout-panel layout-toolbar" aria-label="Công cụ thiết kế">
          <div class="layout-tools">
            <AppButton variant="secondary" size="sm" :disabled="!canArrange" @click="arrange">
              Xếp ghế hoạt động theo hàng
            </AppButton>
            <AppButton
              v-for="(label, kind) in elementLabels"
              :key="kind"
              variant="ghost"
              size="sm"
              :disabled="!editable"
              @click="addElement(kind)"
            >
              + {{ label }}
            </AppButton>
          </div>
          <div class="layout-tools">
            <AppButton
              variant="ghost"
              size="sm"
              :disabled="!editable || (!past.length && !formChanged)"
              @click="undo"
              >Hoàn tác</AppButton
            >
            <AppButton
              variant="ghost"
              size="sm"
              :disabled="!editable || !future.length || formChanged"
              @click="redo"
              >Làm lại</AppButton
            >
            <AppButton
              variant="ghost"
              size="sm"
              aria-label="Thu nhỏ sơ đồ"
              :disabled="zoom <= 0.5"
              @click="zoom = Math.max(0.5, zoom - 0.25)"
              >−</AppButton
            >
            <span class="layout-zoom">{{ Math.round(zoom * 100) }}%</span>
            <AppButton
              variant="ghost"
              size="sm"
              aria-label="Phóng to sơ đồ"
              :disabled="zoom >= 2"
              @click="zoom = Math.min(2, zoom + 0.25)"
              >+</AppButton
            >
          </div>
        </section>

        <div class="layout-workspace">
          <section class="layout-panel layout-canvas-panel" aria-labelledby="layout-canvas-title">
            <header class="layout-canvas-heading">
              <div>
                <h2 id="layout-canvas-title">Sơ đồ phòng</h2>
                <p>Chọn đối tượng để xem hoặc chỉnh vị trí.</p>
              </div>
              <span class="layout-seat-count">{{ state.seats.length }} ghế</span>
            </header>

            <div class="layout-legend" aria-label="Chú thích loại ghế">
              <span v-for="type in ['STANDARD', 'VIP', 'COUPLE', 'ACCESSIBLE']" :key="type">
                <i :class="`layout-legend__swatch layout-legend__swatch--${type.toLowerCase()}`" />
                {{ seatTypeLabel(type) }}
              </span>
            </div>

            <AdminRoomLayoutCanvas
              :layout="layout"
              :state="state"
              :selected-key="selectedKey"
              :zoom="zoom"
              :disabled="!ready || Boolean(working)"
              @select="selectItem"
            />

            <p v-if="!state.seats.length && !state.elements.length" class="layout-muted">
              Sơ đồ trống. Xếp ghế theo hàng hoặc thêm từng đối tượng.
            </p>
            <footer class="layout-canvas-footer">
              <span>{{ rowCount }} hàng · {{ state.elements.length }} đối tượng phụ</span>
              <span>{{ layout.canvasWidth }} × {{ layout.canvasHeight }} đơn vị</span>
            </footer>
          </section>

          <aside class="layout-inspector" aria-label="Thuộc tính sơ đồ">
            <section class="layout-panel layout-inspector-panel">
              <AppAutocomplete
                id="room-layout-object"
                label="Đối tượng"
                all-label="Chọn ghế hoặc đối tượng"
                content-class="admin-reference-autocomplete"
                :model-value="selectedKey"
                :options="itemOptions"
                :disabled="Boolean(working) || !ready"
                @update:model-value="selectItem"
              />

              <form
                v-if="selected"
                class="layout-property-form"
                novalidate
                @submit.prevent="applyProperties"
              >
                <h2>{{ itemLabel(selected) }}</h2>
                <p v-if="isLayoutSeat(selected)" class="layout-muted">
                  Hàng {{ selected.rowLabelSnapshot }} ·
                  {{ seatTypeLabel(selected.seatTypeSnapshot) }}
                </p>

                <label v-if="!isLayoutSeat(selected)" class="layout-field">
                  <span>Nhãn đối tượng</span>
                  <input
                    v-model="form.label"
                    type="text"
                    maxlength="150"
                    :readonly="!editable"
                    @input="propertyError = ''"
                  />
                </label>

                <div class="layout-geometry-fields">
                  <label v-for="field in geometryFields" :key="field.key" class="layout-field">
                    <span>{{ field.label }}</span>
                    <input
                      v-model="form[field.key]"
                      type="number"
                      step="0.001"
                      required
                      :readonly="!editable"
                      :aria-describedby="propertyError ? 'layout-property-error' : undefined"
                      @input="propertyError = ''"
                    />
                  </label>
                </div>
                <p
                  v-if="propertyError"
                  id="layout-property-error"
                  class="layout-error"
                  role="alert"
                >
                  {{ propertyError }}
                </p>

                <div class="layout-tools">
                  <AppButton type="submit" :disabled="!editable || !formChanged">
                    Áp dụng vị trí
                  </AppButton>
                  <AppButton variant="ghost" :disabled="!editable" @click="removeSelected">
                    Bỏ khỏi sơ đồ
                  </AppButton>
                </div>
              </form>
              <p v-else class="layout-muted">Chọn một đối tượng trên sơ đồ hoặc trong danh sách.</p>
            </section>

            <section class="layout-panel layout-inspector-panel">
              <h2>Thêm ghế vào sơ đồ</h2>
              <p v-if="roster.isError.value" class="layout-error" role="alert">
                {{ layoutErrorMessage(roster.error.value) }}
              </p>
              <AppButton
                v-if="roster.isError.value"
                variant="secondary"
                :disabled="Boolean(working)"
                @click="roster.refetch()"
                >Tải lại ghế</AppButton
              >
              <AppAutocomplete
                id="room-layout-add-seat"
                v-model="selectedSeatId"
                label="Ghế chưa được đặt"
                all-label="Chọn ghế"
                content-class="admin-reference-autocomplete"
                :options="seatOptions"
                :loading="roster.isFetching.value"
                :disabled="!editable || !roster.isSuccess.value"
              />
              <AppButton
                variant="secondary"
                :disabled="
                  !editable || !selectedSeatId || roster.isFetching.value || roster.isError.value
                "
                @click="addSeat"
                >Thêm ghế</AppButton
              >
              <p class="layout-muted">
                Chỉnh loại ghế và trạng thái trong “Quản lý ghế”. Bỏ ghế khỏi sơ đồ không xóa ghế
                của phòng.
              </p>
            </section>

            <section class="layout-panel layout-inspector-panel">
              <h2>Tổng quan sơ đồ</h2>
              <dl class="layout-summary">
                <div>
                  <dt>Phiên bản</dt>
                  <dd>{{ layout.layoutVersion }}</dd>
                </div>
                <div>
                  <dt>Số hàng</dt>
                  <dd>{{ rowCount }}</dd>
                </div>
                <div>
                  <dt>Số ghế</dt>
                  <dd>{{ state.seats.length }}</dd>
                </div>
                <div>
                  <dt>Đối tượng phụ</dt>
                  <dd>{{ state.elements.length }}</dd>
                </div>
              </dl>
              <p class="layout-muted">
                {{
                  layout.status === 'DRAFT'
                    ? 'Lưu nháp cập nhật thông tin ghế theo danh sách phòng. Xuất bản kiểm tra vị trí và phần chồng lấn.'
                    : 'Thông tin ghế thuộc phiên bản đã xuất bản. Tạo bản nháp mới để thiết kế lại.'
                }}
              </p>
            </section>
          </aside>
        </div>
      </template>
    </template>

    <AdminRoomSeatsDialog
      v-if="showSeats && enabled"
      :room-id="roomId"
      :room-name="room.data.value?.name || 'Phòng chiếu'"
      :room-active="room.data.value?.active === true"
      :cinema-name="cinemaName"
      return-focus-id="room-layout-title"
      @close="showSeats = false"
    />
  </section>
</template>
