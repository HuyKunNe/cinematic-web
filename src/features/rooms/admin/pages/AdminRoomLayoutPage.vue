<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutGeometryResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import { RoomLayoutElementInputKind } from '@/services/api/generated/inventory-service/model'
import { useAuthStore } from '@/stores/auth.store'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import {
  useAdminRoomLayoutContentQuery,
  useAdminRoomLayoutsQuery,
  usePublishAdminRoomLayoutMutation,
  useReplaceAdminRoomLayoutContentMutation,
} from '../api/admin-room-layout-queries'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import AdminRoomLayoutDraftForm from '../components/AdminRoomLayoutDraftForm.vue'
import AdminRoomLayoutElementForm from '../components/AdminRoomLayoutElementForm.vue'
import AdminRoomLayoutRuler from '../components/AdminRoomLayoutRuler.vue'
import { useRoomLayoutElementDrag } from '../composables/use-room-layout-element-drag'
import { toAdminRoomLayoutContentRequest } from '../mappers/admin-room-layout-content.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'
import AdminSeatLayoutInitializeForm from '../components/AdminSeatLayoutInitializeForm.vue'
import {
  createSeatRowMovePlan,
  moveSeatRows,
  type SeatRowMovePlan,
} from '../mappers/admin-seat-row-move.mapper'
import {
  ADMIN_SEAT_MATRIX_STEP,
  buildAdminSeatMatrixRequest,
  readAdminSeatMatrix,
} from '../mappers/admin-seat-layout.mapper'
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
const seatLayoutOpen = ref(false)
const seatLayoutBusy = ref(false)
const seatLayoutForm = ref<InstanceType<typeof AdminSeatLayoutInitializeForm> | null>(null)
const svgCanvas = ref<SVGSVGElement | null>(null)
const elementPreview = ref<RoomLayoutGeometryResponse | null>(null)
const dragTargetId = ref('')
const dragPreview = ref<RoomLayoutGeometryResponse | null>(null)
const selectedSeatIds = ref<string[]>([])
const multiSeatMode = ref(false)
const seatMovePreview = ref<Map<string, RoomLayoutGeometryResponse>>(new Map())
const dropBusy = ref(false)
const dropError = ref('')
const dropMutation = useReplaceAdminRoomLayoutContentMutation()
const publishMutation = usePublishAdminRoomLayoutMutation()
const publishError = ref('')
const matrixPatternId = `seat-matrix-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
type GeometrySnapshot = Pick<ReplaceRoomLayoutContentRequest, 'seats' | 'elements'>

type MoveHistoryEntry = {
  before: GeometrySnapshot
  after: GeometrySnapshot
}

const HISTORY_LIMIT = 20
const undoMoves = ref<MoveHistoryEntry[]>([])
const redoMoves = ref<MoveHistoryEntry[]>([])
const historyAction = ref<'undo' | 'redo' | null>(null)
const historyBusy = computed(() => historyAction.value !== null)
const historyMutation = useReplaceAdminRoomLayoutContentMutation()

function snapshot(input: GeometrySnapshot): GeometrySnapshot {
  return {
    seats: input.seats.map((seat) => ({
      seatId: seat.seatId,
      geometry: { ...seat.geometry },
    })),
    elements: input.elements.map((element) => ({
      kind: element.kind,
      label: element.label,
      geometry: { ...element.geometry },
    })),
  }
}

function snapshotKey(input: GeometrySnapshot) {
  const geometryKey = (geometry: RoomLayoutGeometryResponse) => [
    geometry.x,
    geometry.y,
    geometry.width,
    geometry.height,
    geometry.rotationDegrees,
  ]

  return JSON.stringify({
    seats: input.seats
      .map((seat) => JSON.stringify([seat.seatId, geometryKey(seat.geometry)]))
      .sort(),
    elements: input.elements
      .map((element) =>
        JSON.stringify([element.kind, element.label ?? '', geometryKey(element.geometry)]),
      )
      .sort(),
  })
}

function resetMoveHistory() {
  undoMoves.value = []
  redoMoves.value = []
}

function recordMove(before: GeometrySnapshot, after: GeometrySnapshot) {
  if (snapshotKey(before) === snapshotKey(after)) return

  undoMoves.value = [
    ...undoMoves.value,
    { before: snapshot(before), after: snapshot(after) },
  ].slice(-HISTORY_LIMIT)

  redoMoves.value = []
}

type DropBaseline = {
  roomId: string
  layoutId: string
  input: ReplaceRoomLayoutContentRequest
} & (
  | {
      kind: 'element'
      elementId: string
      index: number
    }
  | {
      kind: 'seats'
      plan: SeatRowMovePlan
    }
)

let dropBaseline: DropBaseline | null = null

function clearDropPreview() {
  dropBaseline = null
  dragTargetId.value = ''
  dragPreview.value = null
  seatMovePreview.value = new Map()
}

const elementTools = [
  { kind: RoomLayoutElementInputKind.SCREEN, label: '+ Màn hình' },
  { kind: RoomLayoutElementInputKind.AISLE, label: '+ Lối đi' },
  { kind: RoomLayoutElementInputKind.EXIT, label: '+ Lối ra' },
] as const

const editorLocked = computed(
  () =>
    draftBusy.value ||
    elementBusy.value ||
    elementKind.value !== null ||
    dragTargetId.value !== '' ||
    historyBusy.value ||
    publishMutation.isPending.value ||
    seatLayoutOpen.value ||
    seatLayoutBusy.value ||
    dropBusy.value,
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
  resetMoveHistory()
  await nextTick()
  document.getElementById('room-layout-version')?.focus()
}

async function reloadVersions() {
  if (editorLocked.value || draftOpen.value || !canRead.value) return

  const requestedRoomId = roomId.value
  const result = await layouts.refetch()

  if (result.isSuccess && requestedRoomId === roomId.value) {
    creationBlocked.value = false
    resetMoveHistory()
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

async function openSeatLayoutForm() {
  if (!canAppend.value || editorLocked.value || !content.value || content.value.seats.length) {
    return
  }

  seatLayoutOpen.value = true
  selectedKey.value = ''
  saveMessage.value = ''

  await nextTick()
  document.querySelector<HTMLElement>('.layout-seat-initialize input')?.focus()
}

function closeSeatLayoutForm() {
  if (seatLayoutBusy.value) return
  seatLayoutOpen.value = false
}

function onSeatLayoutSaved(count: number) {
  seatLayoutOpen.value = false
  selectedKey.value = ''
  contentBlocked.value = false
  publishError.value = ''
  dropError.value = ''
  resetMoveHistory()
  saveMessage.value = `Đã lưu geometry cho ${count} ghế.`
}

function saveInspector() {
  if (!canAppend.value) return

  if (seatLayoutOpen.value) {
    void seatLayoutForm.value?.submit()
  } else {
    void elementForm.value?.submit()
  }
}

const hasLayoutSeats = computed(() => Boolean(content.value?.seats.length))

const hasLayoutScreen = computed(() =>
  Boolean(content.value?.elements.some((element) => element.kind === 'SCREEN')),
)

const canPublish = computed(
  () => canAppend.value && !editorLocked.value && hasLayoutSeats.value && hasLayoutScreen.value,
)

const publishHint = computed(() => {
  if (!content.value) return ''
  if (content.value.layout.status === 'PUBLISHED') {
    return 'Phiên bản đã xuất bản chỉ được xem.'
  }

  if (!hasLayoutSeats.value && !hasLayoutScreen.value) {
    return 'Xuất bản cần ít nhất một ghế có geometry và một màn hình.'
  }
  if (!hasLayoutSeats.value) {
    return 'Chưa có ghế trong phiên bản layout này.'
  }
  if (!hasLayoutScreen.value) {
    return 'Chưa có màn hình trong phiên bản layout này.'
  }

  return ''
})

async function publishLayout() {
  const baseline = content.value?.layout
  if (!baseline || !canPublish.value) return

  const requestedRoomId = roomId.value
  const requestedLayoutId = baseline.id
  const expectedVersion = baseline.version

  publishError.value = ''
  saveMessage.value = ''
  dropError.value = ''

  try {
    const published = await publishMutation.mutateAsync({
      roomId: requestedRoomId,
      layoutId: requestedLayoutId,
      expectedVersion,
    })

    if (requestedRoomId !== roomId.value || requestedLayoutId !== layoutId.value) {
      return
    }

    resetMoveHistory()
    selectedKey.value = ''
    draftMessage.value = ''
    saveMessage.value = `Đã xuất bản phiên bản ${published.layoutVersion}.`
  } catch (error) {
    if (requestedRoomId !== roomId.value || requestedLayoutId !== layoutId.value) {
      return
    }

    const messages: Record<string, string> = {
      INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT:
        'Sơ đồ đã thay đổi ở nơi khác. Hãy tải lại trước khi xuất bản.',
      INVENTORY_ROOM_LAYOUT_NOT_DRAFT: 'Phiên bản này không còn là bản nháp.',
      INVENTORY_ROOM_LAYOUT_NOT_FOUND: 'Phiên bản sơ đồ không còn tồn tại.',
      INVENTORY_ROOM_LAYOUT_INCOMPLETE: 'Sơ đồ cần ít nhất một ghế và một màn hình.',
      INVENTORY_ROOM_LAYOUT_OUTSIDE_CANVAS: 'Có đối tượng vượt giới hạn canvas sau khi xoay.',
      INVENTORY_ROOM_LAYOUT_GEOMETRY_OVERLAP:
        'Geometry ghế đang chồng lên ghế khác hoặc phần tử không gian.',
      INVENTORY_ROOM_LAYOUT_GEOMETRY_INVALID: 'Geometry chưa hợp lệ để xuất bản.',
      INVENTORY_ROOM_LAYOUT_SEAT_ROOM_MISMATCH: 'Có ghế không thuộc phòng của sơ đồ.',
    }

    publishError.value = isAdminRoomApiError(error)
      ? (messages[error.code ?? ''] ??
        adminRoomErrorMessage(error, 'Không thể xác nhận kết quả xuất bản.'))
      : adminRoomErrorMessage(error, 'Không thể xác nhận kết quả xuất bản.')

    // A lost response may follow a successful publication.
    // Reload before allowing further writes.
    contentBlocked.value = true
  }
}

const canUndo = computed(() => {
  const entry = undoMoves.value.at(-1)

  return Boolean(
    entry &&
    content.value &&
    canAppend.value &&
    !editorLocked.value &&
    snapshotKey(toAdminRoomLayoutContentRequest(content.value)) === snapshotKey(entry.after),
  )
})

const canRedo = computed(() => {
  const entry = redoMoves.value.at(-1)

  return Boolean(
    entry &&
    content.value &&
    canAppend.value &&
    !editorLocked.value &&
    snapshotKey(toAdminRoomLayoutContentRequest(content.value)) === snapshotKey(entry.before),
  )
})

async function applyMoveHistory(direction: 'undo' | 'redo') {
  if (!content.value || !(direction === 'undo' ? canUndo.value : canRedo.value)) {
    return
  }

  const entry = direction === 'undo' ? undoMoves.value.at(-1) : redoMoves.value.at(-1)

  if (!entry) return

  const target = direction === 'undo' ? entry.before : entry.after
  const requestedRoomId = roomId.value
  const requestedLayoutId = layoutId.value
  const expectedVersion = content.value.layout.version

  historyAction.value = direction
  dropError.value = ''
  saveMessage.value = ''

  try {
    const saved = await historyMutation.mutateAsync({
      roomId: requestedRoomId,
      layoutId: requestedLayoutId,
      input: {
        expectedVersion,
        ...snapshot(target),
      },
    })

    if (requestedRoomId !== roomId.value || requestedLayoutId !== layoutId.value) {
      return
    }

    if (snapshotKey(toAdminRoomLayoutContentRequest(saved)) !== snapshotKey(target)) {
      throw new Error('Không thể xác nhận nội dung sau khi hoàn tác/làm lại.')
    }

    if (direction === 'undo') {
      undoMoves.value = undoMoves.value.slice(0, -1)
      redoMoves.value = [...redoMoves.value, entry]
    } else {
      redoMoves.value = redoMoves.value.slice(0, -1)
      undoMoves.value = [...undoMoves.value, entry]
    }

    selectedKey.value = ''
    saveMessage.value =
      direction === 'undo' ? 'Đã hoàn tác vị trí phần tử.' : 'Đã làm lại vị trí phần tử.'
  } catch (error) {
    if (requestedRoomId === roomId.value && requestedLayoutId === layoutId.value) {
      contentBlocked.value = true
      dropError.value =
        adminRoomErrorMessage(error, 'Không thể hoàn tác/làm lại vị trí.') +
        ' Hãy tải lại nội dung trước khi thao tác tiếp.'
    }
  } finally {
    historyAction.value = null
  }
}

const canDirectDrag = computed(
  () =>
    canAppend.value &&
    !elementKind.value &&
    !dropBusy.value &&
    !historyBusy.value &&
    !seatLayoutOpen.value &&
    !seatLayoutBusy.value,
)

const drag = useRoomLayoutElementDrag(svgCanvas, {
  enabled: () => canDirectDrag.value,
  onPosition: (geometry) => {
    if (dropBaseline?.kind === 'seats') {
      seatMovePreview.value = moveSeatRows(dropBaseline.plan, geometry)
    } else {
      dragPreview.value = geometry
    }
  },
  onDrop: (geometry) => {
    void saveDroppedPosition(geometry)
  },
  onCancel: clearDropPreview,
})

function canDragObject(key: string) {
  if (!canDirectDrag.value) return false
  if (dragTargetId.value) return isMovingObject(key)

  const seat = content.value?.seats.find((item) => `seat:${item.id}` === key)
  if (seat) return !multiSeatMode.value

  return Boolean(content.value?.elements.some((element) => `element:${element.id}` === key))
}

function isMovingObject(key: string) {
  if (key === `element:${dragTargetId.value}`) return true

  const seat = content.value?.seats.find((item) => `seat:${item.id}` === key)
  return Boolean(seat && seatMovePreview.value.has(seat.seatId))
}

function toggleSeatSelection(seatId: string, key: string) {
  selectedSeatIds.value = selectedSeatIds.value.includes(seatId)
    ? selectedSeatIds.value.filter((id) => id !== seatId)
    : [...selectedSeatIds.value, seatId]

  selectedKey.value = selectedSeatIds.value.includes(seatId) ? key : ''
}

function clearSeatSelection() {
  if (editorLocked.value) return
  selectedSeatIds.value = []
  selectedKey.value = ''
}

function toggleMultiSeatMode() {
  if (!canDirectDrag.value || editorLocked.value) return
  multiSeatMode.value = !multiSeatMode.value
}

function startObjectDrag(event: PointerEvent, key: string) {
  if (
    event.button !== 0 ||
    !event.isPrimary ||
    editorLocked.value ||
    !canDirectDrag.value ||
    !content.value
  ) {
    return
  }

  const currentContent = content.value
  const seat = currentContent.seats.find((item) => `seat:${item.id}` === key)

  if (seat) {
    if (multiSeatMode.value || event.ctrlKey || event.metaKey || event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      toggleSeatSelection(seat.seatId, key)
      return
    }

    const selection = selectedSeatIds.value.includes(seat.seatId)
      ? selectedSeatIds.value
      : [seat.seatId]

    let plan: SeatRowMovePlan

    try {
      plan = createSeatRowMovePlan(currentContent, seat.seatId, selection)
    } catch (error) {
      dropError.value = adminRoomErrorMessage(error, 'Không thể bắt đầu kéo hàng ghế.')
      return
    }

    selectedSeatIds.value = [...selection]
    selectedKey.value = key
    dropError.value = ''
    saveMessage.value = ''

    dropBaseline = {
      kind: 'seats',
      roomId: roomId.value,
      layoutId: layoutId.value,
      input: toAdminRoomLayoutContentRequest(currentContent),
      plan,
    }

    dragTargetId.value = key
    seatMovePreview.value = moveSeatRows(plan, plan.anchor)

    if (!drag.start(event, plan.anchor)) clearDropPreview()
    return
  }

  if (!canDragObject(key)) return

  const index = currentContent.elements.findIndex((element) => `element:${element.id}` === key)
  const element = currentContent.elements[index]
  if (!element) return

  dropBaseline = {
    kind: 'element',
    roomId: roomId.value,
    layoutId: layoutId.value,
    elementId: element.id,
    index,
    input: toAdminRoomLayoutContentRequest(currentContent),
  }
  selectedSeatIds.value = []
  dragTargetId.value = element.id
  dragPreview.value = { ...element.geometry }
  selectedKey.value = key
  dropError.value = ''
  saveMessage.value = ''

  if (!drag.start(event, element.geometry)) {
    clearDropPreview()
  }
}

const seatMatrix = computed(() => {
  if (!content.value?.seats.length) return { grid: null, error: '' }

  try {
    const { matrix, anchor } = readAdminSeatMatrix(content.value)
    const geometry = seatMovePreview.value.get(anchor.seatId) ?? anchor.geometry

    return {
      grid: {
        x: Math.round(geometry.x),
        y: Math.round(geometry.y),
        columns: matrix.columnCount,
        rows: matrix.rows.length,
        width: matrix.columnCount * ADMIN_SEAT_MATRIX_STEP.x,
        height: matrix.rows.length * ADMIN_SEAT_MATRIX_STEP.y,
      },
      error: '',
    }
  } catch (error) {
    return {
      grid: null,
      error: adminRoomErrorMessage(error, 'Không thể dựng ma trận theo A1.'),
    }
  }
})

async function alignSeatMatrix() {
  const currentContent = content.value

  if (!currentContent || !canDirectDrag.value || editorLocked.value) return

  const baseline = toAdminRoomLayoutContentRequest(currentContent)
  let input: ReplaceRoomLayoutContentRequest
  let anchorSeatId: string

  dropError.value = ''
  saveMessage.value = ''

  try {
    anchorSeatId = readAdminSeatMatrix(currentContent).anchor.seatId
    input = buildAdminSeatMatrixRequest(currentContent, baseline)
  } catch (error) {
    dropError.value = adminRoomErrorMessage(error, 'Không thể căn ma trận theo A1.')
    return
  }

  if (snapshotKey(input) === snapshotKey(baseline)) {
    saveMessage.value = 'Ghế đã nằm đúng ma trận theo A1.'
    return
  }

  const requestedRoomId = roomId.value
  const requestedLayoutId = layoutId.value

  dropBusy.value = true
  seatMovePreview.value = new Map(input.seats.map((seat) => [seat.seatId, { ...seat.geometry }]))

  try {
    const saved = await dropMutation.mutateAsync({
      roomId: requestedRoomId,
      layoutId: requestedLayoutId,
      input,
    })

    if (requestedRoomId !== roomId.value || requestedLayoutId !== layoutId.value) {
      return
    }

    if (snapshotKey(toAdminRoomLayoutContentRequest(saved)) !== snapshotKey(input)) {
      throw new Error('Nội dung trả về không khớp ma trận vừa lưu.')
    }

    recordMove(baseline, toAdminRoomLayoutContentRequest(saved))

    const anchor = saved.seats.find((seat) => seat.seatId === anchorSeatId)
    selectedKey.value = anchor ? `seat:${anchor.id}` : ''
    saveMessage.value = 'Đã căn và lưu toàn bộ ma trận theo A1.'
  } catch (error) {
    if (requestedRoomId === roomId.value && requestedLayoutId === layoutId.value) {
      contentBlocked.value = true
      dropError.value = adminRoomErrorMessage(error, 'Không thể xác nhận ma trận đã lưu.')
      ;(' Hãy tải lại nội dung trước khi thao tác tiếp.')
    }
  } finally {
    seatMovePreview.value = new Map()
    dropBusy.value = false
  }
}

function formatGeometryValue(
  geometry: RoomLayoutGeometryResponse,
  field: keyof RoomLayoutGeometryResponse,
) {
  const value = geometry[field]

  return (field === 'x' || field === 'y') && Number.isInteger(value)
    ? value.toFixed(2)
    : String(value)
}

async function saveDroppedPosition(geometry: RoomLayoutGeometryResponse) {
  const baseline = dropBaseline
  if (!baseline) return
  const movedSeats = baseline.kind === 'seats' ? moveSeatRows(baseline.plan, geometry) : null

  const input: ReplaceRoomLayoutContentRequest = {
    expectedVersion: baseline.input.expectedVersion,
    seats: baseline.input.seats.map((seat) => ({
      ...seat,
      geometry: movedSeats?.get(seat.seatId) ?? seat.geometry,
    })),
    elements: baseline.input.elements.map((element, index) =>
      baseline.kind === 'element' && index === baseline.index
        ? { ...element, geometry: { ...geometry } }
        : element,
    ),
  }

  if (snapshotKey(input) === snapshotKey(baseline.input)) {
    clearDropPreview()
    return
  }

  dropBusy.value = true

  try {
    const saved = await dropMutation.mutateAsync({
      roomId: baseline.roomId,
      layoutId: baseline.layoutId,
      input,
    })
    if (roomId.value === baseline.roomId && layoutId.value === baseline.layoutId) {
      if (snapshotKey(toAdminRoomLayoutContentRequest(saved)) !== snapshotKey(input)) {
        throw new Error('Nội dung trả về không khớp vị trí vừa lưu.')
      }
      recordMove(baseline.input, toAdminRoomLayoutContentRequest(saved))

      if (baseline.kind === 'seats') {
        const anchor = saved.seats.find((seat) => seat.seatId === baseline.plan.anchorSeatId)
        selectedKey.value = anchor ? `seat:${anchor.id}` : ''
        saveMessage.value = `Đã lưu vị trí ${baseline.plan.seats.length} ghế thuộc ${baseline.plan.rowLabels.length} hàng.`
      } else {
        selectedKey.value = ''
        saveMessage.value = 'Đã lưu vị trí phần tử.'
      }
    }
  } catch (error) {
    if (roomId.value === baseline.roomId && layoutId.value === baseline.layoutId) {
      contentBlocked.value = true
      dropError.value =
        adminRoomErrorMessage(error, 'Không thể xác nhận vị trí đã lưu.') +
        ' Hãy tải lại nội dung trước khi kéo tiếp.'
    }
  } finally {
    if (dropBaseline === baseline) clearDropPreview()
    dropBusy.value = false
  }
}

async function openElementForm(kind: RoomLayoutElementInputKind) {
  if (!canAppend.value || editorLocked.value) return
  editingElementId.value = ''
  elementPreview.value = null
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
  elementPreview.value = null
  resetMoveHistory()
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
    dropError.value = ''
    resetMoveHistory()
    publishError.value = ''
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
    seatId: seat.seatId,
    name: seat.seatNumberSnapshot,
    kind: 'SEAT',
    type: seat.seatTypeSnapshot as string,
    row: seat.rowLabelSnapshot,
    geometry: seatMovePreview.value.get(seat.seatId) ?? seat.geometry,
  })),
  ...(content.value?.elements ?? []).map((element) => ({
    key: `element:${element.id}`,
    seatId: '',
    name: element.label?.trim() || kindLabel(element.kind),
    kind: element.kind as string,
    type: element.kind as string,
    row: '',
    geometry:
      element.id === dragTargetId.value && dragPreview.value
        ? dragPreview.value
        : element.id === editingElementId.value && elementPreview.value
          ? elementPreview.value
          : element.geometry,
  })),
])

const selected = computed(() => objects.value.find((object) => object.key === selectedKey.value))

const selectedElement = computed(() =>
  content.value?.elements.find((element) => `element:${element.id}` === selectedKey.value),
)

async function openEditElementForm() {
  const element = selectedElement.value
  if (!element || !canAppend.value || editorLocked.value) return

  elementPreview.value = null
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
  elementPreview.value = null
}

function selectObject(key: string) {
  if (editorLocked.value) return
  const object = objects.value.find((item) => item.key === key)
  if (!object) return

  // Ghế có thể kéo được đã xử lý chọn tại pointerdown.
  // Không xử lý lần nữa khi trình duyệt phát click sau pointerup.
  if (object.kind === 'SEAT' && canDirectDrag.value) return

  selectedKey.value = key
  selectedSeatIds.value = object.seatId ? [object.seatId] : []
}

function activateObject(event: KeyboardEvent, key: string) {
  if (editorLocked.value) return
  const object = objects.value.find((item) => item.key === key)
  if (!object) return

  if (
    object.seatId &&
    canDirectDrag.value &&
    (multiSeatMode.value || event.ctrlKey || event.metaKey || event.shiftKey)
  ) {
    toggleSeatSelection(object.seatId, key)
    return
  }

  selectedKey.value = key
  selectedSeatIds.value = object.seatId ? [object.seatId] : []
}

function isObjectSelected(key: string) {
  const object = objects.value.find((item) => item.key === key)
  if (!object) return false

  return object.seatId
    ? selectedSeatIds.value.includes(object.seatId) || seatMovePreview.value.has(object.seatId)
    : selectedKey.value === key
}

const selectedSeatRowCount = computed(
  () =>
    new Set(
      content.value?.seats
        .filter((seat) => selectedSeatIds.value.includes(seat.seatId))
        .map((seat) => seat.rowLabelSnapshot) ?? [],
    ).size,
)

watch(
  () => content.value?.seats,
  (seats) => {
    if (!seats) return
    const existing = new Set(seats.map((seat) => seat.seatId))
    selectedSeatIds.value = selectedSeatIds.value.filter((id) => existing.has(id))
  },
)

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
    selectedSeatIds.value = []
    multiSeatMode.value = false
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
    elementPreview.value = null
    drag.cancel()
    dropError.value = ''
    resetMoveHistory()
    seatLayoutOpen.value = false
    seatLayoutBusy.value = false
  },
  { flush: 'sync' },
)

watch(layoutId, () => {
  selectedSeatIds.value = []
  multiSeatMode.value = false
  saveMessage.value = ''
  selectedKey.value = ''
  zoom.value = 100
  elementPreview.value = null
  drag.cancel()
  dropError.value = ''
  resetMoveHistory()
  seatLayoutOpen.value = false
  seatLayoutBusy.value = false
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
          :disabled="
            seatLayoutOpen
              ? !seatLayoutForm?.canSave
              : !elementKind || !canAppend || !elementForm?.canSave
          "
          :loading="elementBusy || seatLayoutBusy"
          @click="saveInspector"
        >
          Lưu nháp
        </AppButton>
        <AppButton
          :disabled="!canPublish"
          :loading="publishMutation.isPending.value"
          @click="publishLayout"
        >
          Xuất bản layout
        </AppButton>
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
      <aside
        class="layout-draft-notice"
        role="status"
        :class="{ 'is-published': layout?.status === 'PUBLISHED' }"
      >
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

      <p class="layout-muted">
        A1 là gốc ma trận. Kéo A1 để dịch toàn bộ ma trận; kéo ghế khác để dịch cả hàng theo bước ô.
        Ghế đôi chiếm hai ô ngang. Giữ Ctrl, ⌘ hoặc Shift để chọn nhiều ghế. Thả để tự lưu; nhấn
        Escape khi đang kéo để hủy.
      </p>

      <p v-if="multiSeatMode" class="layout-muted" role="status">
        Chạm từng ghế để chọn hoặc bỏ chọn. Bấm Hoàn tất chọn rồi kéo một ghế đã chọn.
      </p>

      <p v-if="selectedSeatIds.length" class="layout-muted" role="status">
        Đã chọn {{ selectedSeatIds.length }} ghế. Khi nhóm chọn chứa A1, toàn bộ ma trận sẽ dịch.
        Các nhóm khác dịch {{ selectedSeatRowCount }} hàng đang chọn.
      </p>

      <p v-if="dropBusy" class="layout-muted" role="status">Đang lưu vị trí…</p>
      <p v-if="historyBusy" class="layout-muted" role="status">
        {{ historyAction === 'undo' ? 'Đang hoàn tác vị trí…' : 'Đang làm lại vị trí…' }}
      </p>
      <p v-if="publishHint" class="layout-muted" role="status">
        {{ publishHint }}
      </p>

      <p v-if="publishMutation.isPending.value" class="layout-muted" role="status">
        Đang kiểm tra và xuất bản sơ đồ…
      </p>

      <div v-if="publishError" class="layout-feedback">
        <p class="layout-error" role="alert">
          {{ publishError }}
          Tải lại nội dung để xác nhận trạng thái trước khi thao tác tiếp.
        </p>
        <AppButton
          variant="secondary"
          :disabled="editorLocked || draftOpen"
          :loading="contentQuery.isFetching.value"
          @click="reloadContent"
        >
          Tải lại nội dung
        </AppButton>
      </div>
      <div v-if="dropError" class="layout-feedback">
        <p class="layout-error" role="alert">{{ dropError }}</p>
        <AppButton
          variant="secondary"
          :disabled="editorLocked || draftOpen"
          :loading="contentQuery.isFetching.value"
          @click="reloadContent"
        >
          Tải lại nội dung
        </AppButton>
      </div>
      <p v-if="saveMessage" class="layout-muted" role="status">
        {{ saveMessage }}
      </p>
      <p v-if="editingElementId" class="layout-muted">
        Chỉnh thuộc tính trong inspector rồi bấm Lưu nháp. Đóng form để bỏ các thay đổi đang nhập.
      </p>
      <section class="layout-toolbar layout-panel" aria-label="Công cụ thiết kế">
        <div class="layout-tools" role="group" aria-label="Công cụ đặt đối tượng">
          <button class="layout-tool" type="button" @click="backToSeats" :disabled="editorLocked">
            Xếp ghế theo hàng
          </button>
          <button
            class="layout-tool"
            type="button"
            :disabled="editorLocked || !canDirectDrag || !seatMatrix.grid"
            @click="alignSeatMatrix"
          >
            Căn ma trận theo A1
          </button>
          <button
            class="layout-tool"
            type="button"
            :class="{ 'is-active': multiSeatMode }"
            :aria-pressed="multiSeatMode"
            :disabled="editorLocked || !canDirectDrag"
            @click="toggleMultiSeatMode"
          >
            {{ multiSeatMode ? 'Hoàn tất chọn' : 'Chọn nhiều ghế' }}
          </button>
          <button
            class="layout-tool"
            type="button"
            :disabled="editorLocked || !selectedSeatIds.length"
            @click="clearSeatSelection"
          >
            Bỏ chọn ghế
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
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Hoàn tác vị trí"
            title="Hoàn tác lần kéo đã lưu"
            :disabled="!canUndo"
            :aria-busy="historyAction === 'undo'"
            @click="applyMoveHistory('undo')"
          >
            ↶
          </button>

          <button
            class="layout-icon-button"
            type="button"
            aria-label="Làm lại vị trí"
            title="Làm lại lần kéo đã hoàn tác"
            :disabled="!canRedo"
            :aria-busy="historyAction === 'redo'"
            @click="applyMoveHistory('redo')"
          >
            ↷
          </button>
          <span class="layout-toolbar__divider" aria-hidden="true"></span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Thu nhỏ sơ đồ"
            :disabled="
              drag.active.value ||
              dropBusy ||
              historyBusy ||
              publishMutation.isPending.value ||
              !content ||
              zoom <= 50
            "
            @click="zoom = Math.max(50, zoom - 25)"
          >
            −
          </button>
          <span class="layout-zoom" aria-live="polite">{{ zoom }}%</span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Phóng to sơ đồ"
            :disabled="
              drag.active.value ||
              dropBusy ||
              historyBusy ||
              publishMutation.isPending.value ||
              !content ||
              zoom >= 200
            "
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

          <p v-if="seatMatrix.error" class="layout-warning" role="status">
            {{ seatMatrix.error }}
          </p>
          <p v-if="seatMatrix.grid" class="layout-muted">
            Ma trận {{ seatMatrix.grid.rows }} hàng × {{ seatMatrix.grid.columns }} ô ngang.
            Capacity: ghế thường 1 ô, ghế đôi 2 ô.
          </p>

          <AdminRoomLayoutRuler
            v-if="content"
            :canvas-width="content.layout.canvasWidth"
            :canvas-height="content.layout.canvasHeight"
            :zoom="zoom"
          >
            <svg
              ref="svgCanvas"
              class="layout-preview-svg"
              :viewBox="`0 0 ${content.layout.canvasWidth} ${content.layout.canvasHeight}`"
              :width="content.layout.canvasWidth"
              :height="content.layout.canvasHeight"
              aria-label="Đối tượng trong sơ đồ phòng"
              @pointermove="drag.move"
              @pointerup="drag.end"
              @pointercancel="drag.cancel"
              @lostpointercapture="drag.cancel"
            >
              <defs>
                <pattern
                  :id="matrixPatternId"
                  patternUnits="userSpaceOnUse"
                  :x="seatMatrix.grid?.x ?? 0"
                  :y="seatMatrix.grid?.y ?? 0"
                  :width="ADMIN_SEAT_MATRIX_STEP.x"
                  :height="ADMIN_SEAT_MATRIX_STEP.y"
                >
                  <path
                    class="layout-seat-matrix-line"
                    :d="`M ${ADMIN_SEAT_MATRIX_STEP.x} 0 H 0 V ${ADMIN_SEAT_MATRIX_STEP.y}`"
                    vector-effect="non-scaling-stroke"
                  />
                </pattern>
              </defs>

              <g v-if="seatMatrix.grid" class="layout-seat-matrix-grid" aria-hidden="true">
                <rect
                  :x="seatMatrix.grid.x"
                  :y="seatMatrix.grid.y"
                  :width="seatMatrix.grid.width"
                  :height="seatMatrix.grid.height"
                  :fill="`url(#${matrixPatternId})`"
                />
                <rect
                  class="layout-seat-matrix-line"
                  :x="seatMatrix.grid.x"
                  :y="seatMatrix.grid.y"
                  :width="seatMatrix.grid.width"
                  :height="seatMatrix.grid.height"
                  vector-effect="non-scaling-stroke"
                />
              </g>
              <g
                v-for="object in objects"
                :key="object.key"
                class="layout-preview-object"
                :class="{
                  'is-vip': object.type === 'VIP',
                  'is-screen': object.kind === 'SCREEN',
                  'is-aisle': object.kind === 'AISLE',
                  'is-exit': object.kind === 'EXIT',
                  'is-selected': isObjectSelected(object.key),
                  'is-draggable': canDragObject(object.key),
                  'is-dragging': drag.active.value && isMovingObject(object.key),
                }"
                :transform="rotation(object.geometry)"
                role="button"
                :tabindex="editorLocked ? -1 : 0"
                :aria-disabled="editorLocked"
                @click="selectObject(object.key)"
                @keydown.enter.prevent="activateObject($event, object.key)"
                @keydown.space.prevent="activateObject($event, object.key)"
                :aria-label="`${kindLabel(object.type)} ${object.name}`"
                :aria-pressed="isObjectSelected(object.key)"
                @pointerdown="startObjectDrag($event, object.key)"
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
          </AdminRoomLayoutRuler>
          <p v-else class="layout-muted">
            {{ layoutId ? 'Chưa có nội dung để hiển thị.' : 'Chọn phiên bản để xem sơ đồ phòng.' }}
          </p>
          <p v-if="content && !objects.length" class="layout-muted">
            Phiên bản này chưa có ghế hoặc phần tử không gian.
          </p>

          <footer class="layout-canvas-footer">
            <span>
              {{ content?.seats.length ?? 0 }} ghế · {{ content?.elements.length ?? 0 }} phần tử
            </span>
            <span>Thước dùng đơn vị layout · Thả đối tượng để tự lưu vị trí</span>
          </footer>
        </section>

        <aside class="layout-inspector">
          <section
            class="layout-inspector-panel layout-panel"
            :aria-labelledby="seatLayoutOpen || elementKind ? undefined : 'layout-object-title'"
            :aria-label="
              seatLayoutOpen
                ? 'Khởi tạo geometry ghế'
                : elementKind
                  ? editingElementId
                    ? 'Sửa phần tử không gian'
                    : 'Thêm phần tử không gian'
                  : undefined
            "
          >
            <AdminSeatLayoutInitializeForm
              v-if="seatLayoutOpen && content"
              ref="seatLayoutForm"
              class="layout-seat-initialize"
              :key="`${roomId}:${layoutId}`"
              :content="content"
              :enabled="canAppend"
              @busy="seatLayoutBusy = $event"
              @saved="onSeatLayoutSaved"
              @failed="contentBlocked = true"
              @cancel="closeSeatLayoutForm"
            />
            <AdminRoomLayoutElementForm
              v-else-if="elementKind && content"
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
              :dragging="drag.active.value"
              @geometry="elementPreview = $event"
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
                  <input
                    type="text"
                    :value="formatGeometryValue(selected.geometry, field.key)"
                    readonly
                  />
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
              @click="reloadContent"
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
            <AppButton
              v-if="content && !content.seats.length && !seatLayoutOpen"
              variant="secondary"
              :disabled="editorLocked || !canAppend"
              @click="openSeatLayoutForm"
            >
              Khởi tạo geometry ghế
            </AppButton>
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
              <div v-if="content.layout.status === 'PUBLISHED'">
                <dt>Xuất bản lúc</dt>
                <dd>{{ formatDate(content.layout.publishedAt) }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>
