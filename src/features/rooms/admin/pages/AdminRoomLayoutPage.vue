<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { RoomLayoutResponse } from '@/services/api/generated/inventory-service/model'
import { useAuthStore } from '@/stores/auth.store'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useCopyAdminRoomMatrixDraftMutation } from '../api/admin-room-matrix-copy.ts'
import { usePublishAdminRoomMatrixMutation } from '../api/admin-room-matrix-publication'
import {
  useAdminRoomMatrixContentQuery,
  useAdminRoomMatrixLayoutsQuery,
  useCreateAdminRoomMatrixDraftMutation,
  useSaveAdminRoomMatrixMutation,
} from '../api/admin-room-matrix-queries'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import AdminSeatMatrixEditor from '../components/AdminSeatMatrixEditor.vue'
import {
  createEmptySeatMatrix,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'
import {
  adminRoomMatrixKey,
  readAdminRoomMatrix,
  toAdminRoomMatrixRequest,
  type AdminRoomMatrixDocument,
} from '../mappers/admin-room-matrix.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'
import { readRoomLayoutLocation } from '../schemas/admin-room-layout-location'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const roomId = computed(() =>
  typeof route.params.roomId === 'string' ? route.params.roomId.toLowerCase() : '',
)

const validRoom = computed(() => isRoomSeatUuid(roomId.value))
const layoutLink = computed(() => readRoomLayoutLocation(route.query.layoutId))

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const context = useAdminRoomSeatContext(roomId, canManage)

const current = computed(() => {
  if (!canManage.value || !validRoom.value) return undefined

  const value = context.data.value
  return value?.room.id === roomId.value ? value : undefined
})

const ready = computed(
  () =>
    Boolean(current.value) &&
    !layoutLink.value.invalid &&
    !context.isFetching.value &&
    !context.isError.value,
)

const cinemaId = computed(() => {
  if (current.value?.cinema.id) return current.value.cinema.id

  return isRoomSeatUuid(route.query.cinemaId) ? route.query.cinemaId.toLowerCase() : ''
})

const pickedId = ref('')
const queryLayoutId = ref('')
const loadedLayout = ref<RoomLayoutResponse | null>(null)

const initialDocument = ref<AdminRoomMatrixDocument | null>(null)
const workingDocument = ref<AdminRoomMatrixDocument | null>(null)
const baselineKey = ref('')
const pendingInput = ref(false)

const editor = ref<InstanceType<typeof AdminSeatMatrixEditor> | null>(null)
const editorGeneration = ref(0)

const opening = ref(false)
const reloadRequired = ref(false)
const creationBlocked = ref(false)
const errorMessage = ref('')
const notice = ref('')
const matrixConversionBlocked = ref(false)

let scope = 0
let handledLayoutLink = ''

const versions = useAdminRoomMatrixLayoutsQuery(roomId, ready)

// Chỉ đọc nội dung khi người dùng chọn mở hoặc tải lại.
// Cache cập nhật sau khi lưu không tự nạp lại editor.
const content = useAdminRoomMatrixContentQuery(roomId, queryLayoutId, false)

const createDraft = useCreateAdminRoomMatrixDraftMutation()
const saveMatrix = useSaveAdminRoomMatrixMutation()

const publishMatrix = usePublishAdminRoomMatrixMutation()
const copyDraft = useCopyAdminRoomMatrixDraftMutation()

const layouts = computed(() => (current.value ? (versions.data.value ?? []) : []))

const busy = computed(
  () =>
    opening.value ||
    createDraft.isPending.value ||
    saveMatrix.isPending.value ||
    publishMatrix.isPending.value ||
    copyDraft.isPending.value,
)

const dirty = computed(() => {
  if (pendingInput.value) return true
  if (!workingDocument.value) return false

  try {
    return adminRoomMatrixKey(workingDocument.value) !== baselineKey.value
  } catch {
    return true
  }
})

const canCreate = computed(
  () =>
    ready.value &&
    !busy.value &&
    !versions.isFetching.value &&
    !versions.isError.value &&
    !creationBlocked.value,
)

const canCopyPublished = computed(
  () =>
    canCreate.value &&
    !reloadRequired.value &&
    !dirty.value &&
    loadedLayout.value?.status === 'PUBLISHED' &&
    Boolean(initialDocument.value),
)

const canSave = computed(
  () =>
    ready.value &&
    !busy.value &&
    !reloadRequired.value &&
    !matrixConversionBlocked.value &&
    loadedLayout.value?.status === 'DRAFT' &&
    Boolean(workingDocument.value) &&
    dirty.value,
)

const hasSeats = computed(
  () => workingDocument.value?.rows.some((row) => row.some((seat) => seat !== null)) ?? false,
)

const canPublish = computed(
  () =>
    ready.value &&
    !busy.value &&
    !reloadRequired.value &&
    !matrixConversionBlocked.value &&
    loadedLayout.value?.status === 'DRAFT' &&
    Boolean(workingDocument.value) &&
    hasSeats.value &&
    !dirty.value,
)

const publishHint = computed(() => {
  if (loadedLayout.value?.status === 'PUBLISHED') {
    return 'Phiên bản này đã xuất bản.'
  }

  if (reloadRequired.value) {
    return 'Tải lại phiên bản trước khi xuất bản.'
  }

  if (dirty.value) {
    return 'Lưu bản nháp trước khi xuất bản.'
  }

  if (!hasSeats.value) {
    return 'Thêm và lưu ít nhất một ghế trước khi xuất bản.'
  }

  return 'Xuất bản phiên bản đã lưu.'
})

function resetRoomState() {
  scope += 1
  handledLayoutLink = ''
  pickedId.value = ''
  queryLayoutId.value = ''
  loadedLayout.value = null
  initialDocument.value = null
  workingDocument.value = null
  baselineKey.value = ''
  pendingInput.value = false
  opening.value = false
  reloadRequired.value = false
  creationBlocked.value = false
  errorMessage.value = ''
  notice.value = ''
  matrixConversionBlocked.value = false
}

watch([roomId, canManage], resetRoomState, { flush: 'sync' })

function confirmDiscard() {
  return !dirty.value || window.confirm('Bỏ các thay đổi sơ đồ chưa lưu để tiếp tục?')
}

function onMatrixChanged(value: SeatMatrixDocument) {
  workingDocument.value = value
  notice.value = ''
}

function uncertainWrite(error: unknown) {
  if (!isAdminRoomApiError(error)) return true

  return error.status === null || error.status === 408 || error.status >= 500
}

function requiresLayoutReload(error: unknown) {
  if (!isAdminRoomApiError(error)) return true

  if (uncertainWrite(error) || error.status === 404 || error.status === 409) {
    return true
  }

  return [
    'INVENTORY_ROOM_LAYOUT_NOT_FOUND',
    'INVENTORY_ROOM_LAYOUT_NOT_DRAFT',
    'INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT',
    'INVENTORY_ROOM_LAYOUT_MATRIX_CONVERSION_REQUIRED',
  ].includes(error.code ?? '')
}

async function loadVersion(layoutId: string, minimumLayout?: RoomLayoutResponse): Promise<boolean> {
  if (!ready.value || !isRoomSeatUuid(layoutId)) return false

  const requestedRoomId = roomId.value
  const token = ++scope

  const minimum = minimumLayout ?? (loadedLayout.value?.id === layoutId ? loadedLayout.value : null)

  opening.value = true
  errorMessage.value = ''
  notice.value = ''
  queryLayoutId.value = layoutId

  try {
    await nextTick()

    if (token !== scope || requestedRoomId !== roomId.value) return false

    const result = await content.refetch({ throwOnError: true })

    if (token !== scope || requestedRoomId !== roomId.value) return false

    if (!result.data) {
      throw new Error('Không nhận được nội dung sơ đồ.')
    }

    const storedDocument = readAdminRoomMatrix(result.data, requestedRoomId, layoutId)

    if (
      minimum &&
      (result.data.layout.version < minimum.version ||
        (minimum.status === 'PUBLISHED' && result.data.layout.status !== 'PUBLISHED'))
    ) {
      throw new Error('Nội dung trả về chưa khớp phiên bản hiện tại. Hãy tải lại.')
    }

    // minimumLayout được truyền sau khi publish sơ đồ thành công.
    if (minimumLayout && storedDocument === null) {
      throw new Error('Chưa nhận được nội dung sơ đồ đã xuất bản. Hãy tải lại.')
    }

    if (result.data.layout.status === 'PUBLISHED' && storedDocument) {
      const containsSeats = storedDocument.rows.some((row) => row.some((seat) => seat !== null))

      const allSeatsBound = storedDocument.rows.every((row) =>
        row.every((seat) => seat === null || isRoomSeatUuid(seat.seatId)),
      )

      if (!containsSeats || !allSeatsBound) {
        throw new Error('Sơ đồ đã xuất bản chưa có đầy đủ liên kết ghế. Hãy tải lại.')
      }
    }

    const useDefaultMatrix = storedDocument === null && result.data.layout.status === 'DRAFT'

    const conversionBlocked =
      useDefaultMatrix && (result.data.seats.length > 0 || result.data.elements.length > 0)

    const document = useDefaultMatrix ? createEmptySeatMatrix() : storedDocument

    const defaultNeedsSaving = useDefaultMatrix && !conversionBlocked

    loadedLayout.value = result.data.layout
    pickedId.value = layoutId
    initialDocument.value = document
    workingDocument.value = document
    matrixConversionBlocked.value = conversionBlocked

    baselineKey.value = document && !defaultNeedsSaving ? adminRoomMatrixKey(document) : ''

    pendingInput.value = false
    reloadRequired.value = false
    editorGeneration.value += 1

    if (conversionBlocked) {
      notice.value =
        'Phiên bản này có sơ đồ cũ đã chứa dữ liệu. ' +
        'Sơ đồ 6 × 6 đang hiển thị chỉ là bản xem trước. ' +
        'Hãy tạo bản nháp mới để thiết kế sơ đồ.'
    } else {
      notice.value = useDefaultMatrix
        ? `Đã mở phiên bản ${result.data.layout.layoutVersion} với sơ đồ mặc định 6 × 6.`
        : `Đã mở phiên bản ${result.data.layout.layoutVersion}.`
    }

    return true
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return false

    errorMessage.value = adminRoomErrorMessage(error, 'Không thể mở sơ đồ.')

    return false
  } finally {
    if (token === scope) opening.value = false
  }
}

async function openVersion(layoutId: string) {
  if (!ready.value || busy.value || !isRoomSeatUuid(layoutId)) return
  if (!confirmDiscard()) return

  await loadVersion(layoutId)
}

async function onVersionChange(event: Event) {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) return

  const requestedId = select.value

  // Giữ dropdown khớp với nội dung hiện tại cho đến khi mở thành công.
  select.value = pickedId.value

  if (!ready.value || busy.value || versions.isFetching.value || !isRoomSeatUuid(requestedId)) {
    return
  }

  await openVersion(requestedId)

  // Bao gồm trường hợp hủy xác nhận hoặc tải phiên bản thất bại.
  if (select.isConnected) {
    select.value = pickedId.value
  }
}

async function createVersion() {
  if (!canCreate.value || !confirmDiscard()) return

  const requestedRoomId = roomId.value
  const token = scope

  errorMessage.value = ''
  notice.value = ''

  try {
    const created = await createDraft.mutateAsync(requestedRoomId)

    if (token !== scope || requestedRoomId !== roomId.value) return

    // Bản nháp vừa tạo đã được thêm vào danh sách.
    // Chỉ cập nhật lựa chọn sau khi đọc nội dung thành công.
    await loadVersion(created.id)
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return

    creationBlocked.value = uncertainWrite(error)
    errorMessage.value = adminRoomErrorMessage(error, 'Không thể tạo bản nháp.')
  }
}

async function copyPublishedVersion() {
  if (!canCopyPublished.value || !loadedLayout.value || !initialDocument.value) {
    return
  }

  const requestedRoomId = roomId.value
  const source = loadedLayout.value
  const document = initialDocument.value
  const token = scope

  errorMessage.value = ''
  notice.value = ''

  try {
    const copied = await copyDraft.mutateAsync({
      roomId: requestedRoomId,
      source,
      document,
    })

    if (token !== scope || requestedRoomId !== roomId.value) return

    // API đã trả đầy đủ content được kiểm tra.
    // Mở trực tiếp bản sao, không cần thêm một GET.
    scope += 1

    loadedLayout.value = copied.content.layout
    pickedId.value = copied.content.layout.id
    queryLayoutId.value = copied.content.layout.id

    initialDocument.value = copied.document
    workingDocument.value = copied.document
    baselineKey.value = adminRoomMatrixKey(copied.document)

    pendingInput.value = false
    reloadRequired.value = false
    matrixConversionBlocked.value = false
    creationBlocked.value = false
    editorGeneration.value += 1

    notice.value =
      `Đã tạo bản nháp phiên bản ${copied.content.layout.layoutVersion} ` +
      `từ phiên bản ${source.layoutVersion}.`
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return

    creationBlocked.value = uncertainWrite(error)

    if (requiresLayoutReload(error)) {
      reloadRequired.value = true
    }

    errorMessage.value = adminRoomErrorMessage(
      error,
      'Không thể tạo bản nháp từ phiên bản đã xuất bản.',
    )

    if (creationBlocked.value) {
      notice.value =
        'Chưa xác nhận được kết quả tạo bản sao. ' +
        'Tải danh sách phiên bản và kiểm tra trước khi tạo thêm.'
    }
  }
}

async function refreshVersions(): Promise<RoomLayoutResponse[] | null> {
  if (!ready.value || busy.value || versions.isFetching.value) {
    return null
  }

  const requestedRoomId = roomId.value
  const token = scope

  errorMessage.value = ''
  notice.value = ''

  try {
    const result = await versions.refetch({ throwOnError: true })

    if (token !== scope || requestedRoomId !== roomId.value) {
      return null
    }

    if (!result.data) {
      throw new Error('Không nhận được danh sách phiên bản.')
    }

    creationBlocked.value = false

    const opened = loadedLayout.value

    if (opened && !busy.value) {
      const latest = result.data.find((layout) => layout.id === opened.id)

      if (!latest) {
        reloadRequired.value = true
        notice.value =
          'Phiên bản đang mở không còn trong danh sách. ' +
          'Nội dung đang chỉnh được giữ lại. ' +
          'Hãy chọn phiên bản khác hoặc tạo bản nháp mới.'

        return result.data
      }

      if (latest.version > opened.version || latest.status !== opened.status) {
        reloadRequired.value = true
        notice.value =
          'Phiên bản đang mở đã thay đổi trên máy chủ. ' + 'Mở lại phiên bản trước khi lưu tiếp.'

        return result.data
      }
    }

    notice.value = 'Đã cập nhật danh sách phiên bản.'
    return result.data
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) {
      return null
    }

    errorMessage.value = adminRoomErrorMessage(error, 'Không thể tải danh sách phiên bản.')

    return null
  }
}

async function onRefreshVersions() {
  if (!ready.value || busy.value || versions.isFetching.value) return

  const requestedRoomId = roomId.value
  const token = scope
  const openedId = loadedLayout.value?.id ?? ''
  const shouldReopen = reloadRequired.value && openedId !== ''

  const refreshed = await refreshVersions()

  if (
    !refreshed ||
    !shouldReopen ||
    token !== scope ||
    requestedRoomId !== roomId.value ||
    loadedLayout.value?.id !== openedId
  ) {
    return
  }

  if (!refreshed.some((layout) => layout.id === openedId)) return

  await openVersion(openedId)
}

async function saveDraft() {
  if (!canSave.value || !loadedLayout.value) return

  const document = editor.value?.prepareSave()
  if (!document) return

  workingDocument.value = document

  const requestedRoomId = roomId.value
  const requestedLayout = loadedLayout.value
  const token = scope

  let submittedKey: string

  try {
    toAdminRoomMatrixRequest(document, requestedLayout.version)
    submittedKey = adminRoomMatrixKey(document)
  } catch (error) {
    errorMessage.value = adminRoomErrorMessage(error, 'Sơ đồ chưa hợp lệ.')
    return
  }

  if (submittedKey === baselineKey.value) {
    notice.value = 'Không có thay đổi cần lưu.'
    return
  }

  errorMessage.value = ''
  notice.value = ''

  try {
    const saved = await saveMatrix.mutateAsync({
      roomId: requestedRoomId,
      layoutId: requestedLayout.id,
      expectedVersion: requestedLayout.version,
      document,
    })

    if (token !== scope || requestedRoomId !== roomId.value) return

    loadedLayout.value = saved.layout
    baselineKey.value = submittedKey
    reloadRequired.value = false
    notice.value = 'Đã lưu bản nháp.'

    // Giữ nguyên editor và lịch sử undo/redo sau khi lưu.
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return

    reloadRequired.value = requiresLayoutReload(error)
    errorMessage.value = adminRoomErrorMessage(error, 'Không thể lưu bản nháp.')
  }
}

async function publishDraft() {
  if (!canPublish.value || !loadedLayout.value) return

  const requestedRoomId = roomId.value
  const requestedLayout = loadedLayout.value
  const token = scope

  errorMessage.value = ''
  notice.value = ''

  try {
    const document = editor.value?.prepareSave()
    if (!document) return

    workingDocument.value = document

    const input = toAdminRoomMatrixRequest(document, requestedLayout.version)

    if (!input.matrix || input.matrix.seats.length === 0) {
      errorMessage.value = 'Thêm ít nhất một ghế trước khi xuất bản.'
      return
    }

    if (adminRoomMatrixKey(document) !== baselineKey.value) {
      notice.value = 'Có thay đổi chưa lưu. Lưu bản nháp trước khi xuất bản.'
      return
    }
  } catch (error) {
    errorMessage.value = adminRoomErrorMessage(error, 'Sơ đồ chưa hợp lệ.')
    return
  }

  try {
    const published = await publishMatrix.mutateAsync({
      roomId: requestedRoomId,
      layoutId: requestedLayout.id,
      expectedVersion: requestedLayout.version,
    })

    if (token !== scope || requestedRoomId !== roomId.value) return

    // Ghi nhận trạng thái đã publish trước khi đọc lại content.
    // Nếu GET thất bại, editor vẫn giữ trạng thái chỉ đọc.
    loadedLayout.value = published
    reloadRequired.value = true

    const reloadScope = scope + 1
    const reloaded = await loadVersion(published.id, published)

    if (
      reloadScope !== scope ||
      requestedRoomId !== roomId.value ||
      loadedLayout.value?.id !== published.id
    ) {
      return
    }

    notice.value = reloaded
      ? `Đã xuất bản phiên bản ${published.layoutVersion}.`
      : `Đã xuất bản phiên bản ${published.layoutVersion}, ` +
        'nhưng chưa tải được nội dung mới. Chọn “Tải lại phiên bản” để tiếp tục.'
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return

    reloadRequired.value = requiresLayoutReload(error)

    errorMessage.value =
      isAdminRoomApiError(error) && error.code === 'INVENTORY_ROOM_LAYOUT_MATRIX_EMPTY'
        ? 'Thêm và lưu ít nhất một ghế trước khi xuất bản.'
        : adminRoomErrorMessage(error, 'Không thể xuất bản sơ đồ.')

    if (uncertainWrite(error)) {
      notice.value =
        'Chưa xác nhận được kết quả xuất bản. ' + 'Tải lại phiên bản trước khi thử tiếp.'
    }
  }
}

async function onSaveKeyDown(event: KeyboardEvent) {
  if (
    event.isComposing ||
    event.altKey ||
    event.shiftKey ||
    !(event.ctrlKey || event.metaKey) ||
    event.key.toLowerCase() !== 's'
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.repeat || !canSave.value) return

  const source = event.target
  const requestedLayoutId = loadedLayout.value?.id

  await saveDraft()
  await nextTick()

  // Editor bị vô hiệu hóa trong lúc lưu có thể làm mất focus.
  // Khôi phục khi người dùng vẫn ở phiên bản hiện tại
  // và chưa chuyển focus sang điều khiển khác.
  if (
    source instanceof HTMLElement &&
    source.isConnected &&
    !source.matches(':disabled') &&
    loadedLayout.value?.id === requestedLayoutId &&
    source.ownerDocument.activeElement === source.ownerDocument.body
  ) {
    source.focus()
  }
}

function backToRooms() {
  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOMS,
    query: cinemaId.value ? { cinemaId: cinemaId.value } : {},
  })
}

function backToSeats() {
  if (!validRoom.value || busy.value) return

  const layoutId = loadedLayout.value?.status === 'PUBLISHED' ? loadedLayout.value.id : ''

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: roomId.value },
    query: {
      ...(cinemaId.value ? { cinemaId: cinemaId.value } : {}),
      ...(layoutId ? { layoutId } : {}),
    },
  })
}

function confirmLeave() {
  if (busy.value) return false
  return confirmDiscard()
}

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  () => dirty.value || busy.value,
  (value) => {
    if (value) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  scope += 1
  window.removeEventListener('beforeunload', preventUnload)
})

watch(
  [roomId, () => layoutLink.value.id, () => layoutLink.value.invalid, ready, busy],
  () => {
    const requestedId = layoutLink.value.id

    if (!requestedId || layoutLink.value.invalid) {
      handledLayoutLink = ''
      return
    }

    if (!ready.value || busy.value) return

    const key = `${roomId.value}:${requestedId}`

    if (handledLayoutLink === key) return

    // Đánh dấu trước khi tải để thay đổi busy không tạo vòng gọi lại.
    // Nếu tải lỗi, người dùng vẫn có thể chọn lại từ dropdown.
    handledLayoutLink = key

    void loadVersion(requestedId)
  },
  { immediate: true },
)

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
</script>

<template>
  <section
    class="room-matrix-page"
    data-reference="admin-room-layout"
    aria-labelledby="room-matrix-title"
    @keydown="onSaveKeyDown"
  >
    <header class="room-matrix-page__heading">
      <div>
        <p class="room-matrix-page__eyebrow">
          {{ current ? `${current.cinema.name} · ${current.room.name}` : 'Cấu hình sơ đồ phòng' }}
        </p>

        <h1 id="room-matrix-title">Thiết kế sơ đồ ghế</h1>
        <p>Tạo ghế và bố trí các hàng, cột trong sơ đồ phòng chiếu.</p>
      </div>

      <div class="room-matrix-page__actions">
        <AppButton variant="secondary" :disabled="busy" @click="backToRooms">
          Quay lại phòng
        </AppButton>

        <AppButton
          v-if="validRoom && canManage"
          variant="secondary"
          :disabled="busy"
          @click="backToSeats"
        >
          Ghế của phòng
        </AppButton>

        <AppButton
          variant="secondary"
          :disabled="!canSave"
          :loading="saveMatrix.isPending.value"
          @click="saveDraft"
        >
          Lưu nháp
        </AppButton>

        <AppButton
          :disabled="!canPublish"
          :loading="publishMatrix.isPending.value"
          :title="publishHint"
          @click="publishDraft"
        >
          Xuất bản
        </AppButton>
      </div>
    </header>

    <p v-if="!canManage" class="room-matrix-page__error" role="alert">
      Bạn không có quyền quản lý sơ đồ phòng.
    </p>

    <p v-else-if="!validRoom" class="room-matrix-page__error" role="alert">
      Mã phòng trong đường dẫn không hợp lệ.
    </p>

    <p v-else-if="layoutLink.invalid" class="room-matrix-page__error" role="alert">
      Mã phiên bản trong liên kết không hợp lệ.
    </p>

    <template v-else>
      <div v-if="context.isError.value" class="room-matrix-page__feedback">
        <p class="room-matrix-page__error" role="alert">
          {{ adminRoomErrorMessage(context.error.value, 'Không thể tải thông tin phòng.') }}
        </p>

        <AppButton
          variant="secondary"
          :disabled="busy"
          :loading="context.isFetching.value"
          @click="context.refetch()"
        >
          Tải lại thông tin phòng
        </AppButton>
      </div>

      <template v-if="current">
        <div class="room-matrix-page__versions">
          <label for="room-layout-version">Phiên bản sơ đồ</label>

          <div class="room-matrix-page__actions">
            <select
              id="room-layout-version"
              :value="pickedId"
              :disabled="!ready || busy || versions.isFetching.value"
              @change="onVersionChange"
            >
              <option value="" disabled>Chọn phiên bản</option>
              <option
                v-if="loadedLayout && !layouts.some((layout) => layout.id === loadedLayout?.id)"
                :value="loadedLayout.id"
                disabled
              >
                Phiên bản {{ loadedLayout.layoutVersion }} · Không còn trong danh sách
              </option>
              <option v-for="layout in layouts" :key="layout.id" :value="layout.id">
                Phiên bản {{ layout.layoutVersion }} ·
                {{ layout.status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản' }}
              </option>
            </select>

            <AppButton
              variant="secondary"
              :disabled="!ready || busy || versions.isFetching.value"
              :loading="versions.isFetching.value"
              @click="onRefreshVersions"
            >
              {{ reloadRequired && loadedLayout ? 'Tải lại phiên bản' : 'Tải danh sách' }}
            </AppButton>

            <AppButton
              :disabled="!canCreate"
              :loading="createDraft.isPending.value"
              @click="createVersion"
            >
              Tạo bản nháp trống
            </AppButton>

            <AppButton
              v-if="loadedLayout?.status === 'PUBLISHED' && initialDocument"
              variant="secondary"
              :disabled="!canCopyPublished"
              :loading="copyDraft.isPending.value"
              @click="copyPublishedVersion"
            >
              Tạo bản nháp từ phiên bản này
            </AppButton>
          </div>
        </div>

        <p v-if="versions.isError.value" class="room-matrix-page__error" role="alert">
          {{ adminRoomErrorMessage(versions.error.value, 'Không thể tải danh sách phiên bản.') }}
        </p>

        <p
          v-else-if="!versions.isFetching.value && layouts.length === 0"
          class="room-matrix-page__muted"
        >
          Phòng chưa có sơ đồ. Chọn “Tạo bản nháp” để bắt đầu.
        </p>

        <p v-if="errorMessage" class="room-matrix-page__error" role="alert">
          {{ errorMessage }}
        </p>

        <p v-if="notice" class="room-matrix-page__muted" role="status">
          {{ notice }}
        </p>

        <aside v-if="creationBlocked" class="room-matrix-page__notice">
          <strong>Chưa xác nhận được kết quả tạo bản nháp</strong>
          <p>Tải danh sách phiên bản và kiểm tra bản nháp vừa tạo trước khi tạo thêm.</p>
        </aside>

        <aside v-if="reloadRequired" class="room-matrix-page__notice">
          <strong>Cần tải lại trước khi lưu tiếp</strong>
          <p>
            Nội dung đang chỉnh được giữ trên trang. Mở lại phiên bản để đọc dữ liệu hiện tại từ máy
            chủ; trang sẽ hỏi trước khi bỏ thay đổi chưa lưu.
          </p>
        </aside>

        <p v-if="opening" class="room-matrix-page__muted" role="status">Đang mở sơ đồ…</p>

        <AdminSeatMatrixEditor
          v-if="initialDocument && loadedLayout"
          :key="`${roomId}:${editorGeneration}`"
          ref="editor"
          :initial-document="initialDocument"
          :disabled="!ready || busy || matrixConversionBlocked || loadedLayout.status !== 'DRAFT'"
          @change="onMatrixChanged"
          @pending="pendingInput = $event"
        />
      </template>

      <p v-else-if="!context.isError.value" class="room-matrix-page__muted" role="status">
        Đang tải thông tin phòng…
      </p>
    </template>
  </section>
</template>

<style scoped>
.room-matrix-page {
  display: grid;
  min-width: 0;
  gap: var(--space-5);
}

.room-matrix-page__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.room-matrix-page__heading h1 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: var(--admin-movies-heading-size);
  line-height: var(--line-height-heading);
}

.room-matrix-page__heading > div:first-child > p:last-child {
  margin: var(--space-2) 0 0;
  color: var(--color-text-secondary);
}

.room-matrix-page__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.room-matrix-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.room-matrix-page__notice {
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.room-matrix-page__notice strong {
  color: var(--color-warning);
}

.room-matrix-page__notice p {
  margin: var(--space-2) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.room-matrix-page__feedback {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.room-matrix-page__error {
  margin: 0;
  color: var(--color-error);
}

.room-matrix-page__muted {
  color: var(--color-text-secondary);
}

.room-matrix-page__versions {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.room-matrix-page__versions select {
  max-width: 100%;
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  background: var(--color-surface);
  font: inherit;
}

.room-matrix-page__versions select:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
