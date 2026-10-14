<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import type {
  RoomLayoutContentResponse,
  RoomLayoutElementInput,
  RoomLayoutElementInputKind,
  RoomLayoutGeometryResponse,
} from '@/services/api/generated/inventory-service/model'
import { useReplaceAdminRoomLayoutContentMutation } from '../api/admin-room-layout-queries'
import { toAdminRoomLayoutContentRequest } from '../mappers/admin-room-layout-content.mapper'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'
import { snapAisleToGrid } from '../mappers/admin-seat-row-move.mapper'

type SaveAction = 'created' | 'updated' | 'deleted'

const props = defineProps<{
  content: RoomLayoutContentResponse
  kind: RoomLayoutElementInputKind
  elementId?: string
  dragging?: boolean
  enabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
  geometry: [value: RoomLayoutGeometryResponse | null]
  saved: [action: SaveAction]
  failed: []
  cancel: []
}>()

const names: Record<RoomLayoutElementInputKind, string> = {
  SCREEN: 'Màn hình',
  AISLE: 'Lối đi',
  EXIT: 'Lối ra',
}

function decimal(integerDigits: number, signed = false) {
  return z
    .string()
    .trim()
    .regex(
      new RegExp(`^${signed ? '-?' : ''}\\d{1,${integerDigits}}(?:\\.\\d{1,3})?$`),
      `Nhập tối đa ${integerDigits} chữ số phần nguyên và 3 chữ số thập phân.`,
    )
    .transform(Number)
}

const coordinateSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d+)?$/, 'Nhập tọa độ không âm, tối đa 9 chữ số phần nguyên.')
  .transform(Number)
  .refine(Number.isFinite, 'Tọa độ không hợp lệ.')
  .transform(Math.round)
  .refine((value) => value <= 999999999, 'Tọa độ sau làm tròn không được vượt 999999999.')

function initialCoordinate(value: number) {
  const parsed = coordinateSchema.safeParse(String(value))
  return parsed.success ? parsed.data.toFixed(2) : String(value)
}

const schema = z.object({
  label: z.string().trim().max(150, 'Nhãn tối đa 150 ký tự.'),
  x: coordinateSchema,
  y: coordinateSchema,
  width: decimal(9).refine((value) => value > 0, 'Chiều rộng phải lớn hơn 0.'),
  height: decimal(9).refine((value) => value > 0, 'Chiều cao phải lớn hơn 0.'),
  rotationDegrees: decimal(6, true),
})

type Field = keyof z.input<typeof schema>

const fields = [
  { key: 'label', label: 'Nhãn', numeric: false, required: false },
  { key: 'x', label: 'Vị trí X', numeric: true, required: true },
  { key: 'y', label: 'Vị trí Y', numeric: true, required: true },
  { key: 'width', label: 'Chiều rộng', numeric: true, required: true },
  { key: 'height', label: 'Chiều cao', numeric: true, required: true },
  { key: 'rotationDegrees', label: 'Góc xoay (độ)', numeric: true, required: true },
] as const

// Baseline và vị trí phần tử được chụp một lần khi mở form.
const baseline = toAdminRoomLayoutContentRequest(props.content)
const roomId = props.content.layout.roomId
const layoutId = props.content.layout.id
const editing = Boolean(props.elementId)
const targetIndex = props.content.elements.findIndex((element) => element.id === props.elementId)
const target = targetIndex >= 0 ? props.content.elements[targetIndex] : undefined
const kind = target?.kind ?? props.kind
const missingTarget = editing && !target

const prefix = useId()
const form = ref<HTMLFormElement | null>(null)
const values = reactive({
  label: target?.label ?? '',
  x: initialCoordinate(target?.geometry.x ?? 0),
  y: initialCoordinate(target?.geometry.y ?? 0),
  width: target ? String(target.geometry.width) : '',
  height: target ? String(target.geometry.height) : '',
  rotationDegrees: String(target?.geometry.rotationDegrees ?? 0),
})

const errors = ref<Partial<Record<Field, string>>>({})
const requestError = ref(
  missingTarget ? 'Không tìm thấy phần tử đang sửa. Hãy đóng form và tải lại.' : '',
)
const blocked = ref(missingTarget)
const deleteArmed = ref(false)
const mutation = useReplaceAdminRoomLayoutContentMutation()
const busy = computed(() => mutation.isPending.value)

const canMove = computed(() => props.enabled && !busy.value && !blocked.value && !deleteArmed.value)

const canSave = computed(() => canMove.value && !props.dragging)

const canDelete = computed(
  () => editing && props.enabled && !busy.value && !blocked.value && !props.dragging,
)

const previewGeometry = computed<RoomLayoutGeometryResponse | null>(() => {
  const parsed = schema.safeParse(values)
  if (!parsed.success) return null

  const { x, y, width, height, rotationDegrees } = parsed.data
  return { x, y, width, height, rotationDegrees }
})

watch(previewGeometry, (geometry) => emit('geometry', geometry), { immediate: true, flush: 'sync' })

function getGeometry() {
  return previewGeometry.value ? { ...previewGeometry.value } : null
}

function setPosition(x: number, y: number) {
  if (!canMove.value) return

  const parsedX = coordinateSchema.safeParse(String(x))
  const parsedY = coordinateSchema.safeParse(String(y))

  if (!parsedX.success || !parsedY.success) return

  values.x = parsedX.data.toFixed(2)
  values.y = parsedY.data.toFixed(2)
  delete errors.value.x
  delete errors.value.y
}

function normalizeCoordinate(field: Field) {
  if (field !== 'x' && field !== 'y') return

  const parsed = coordinateSchema.safeParse(values[field])

  if (parsed.success) {
    values[field] = parsed.data.toFixed(2)
    delete errors.value[field]
  } else {
    errors.value[field] = parsed.error.issues[0]?.message ?? 'Tọa độ không hợp lệ.'
  }
}

watch(busy, (value) => emit('busy', value), { flush: 'sync' })
onBeforeUnmount(() => emit('busy', false))

function update(field: Field, event: Event) {
  values[field] = (event.target as HTMLInputElement).value
  delete errors.value[field]
}

async function focusError() {
  await nextTick()
  form.value?.querySelector<HTMLElement>('[aria-invalid="true"], [data-request-error]')?.focus()
}

async function save(action: SaveAction, elements: RoomLayoutElementInput[]) {
  errors.value = {}
  requestError.value = ''

  try {
    await mutation.mutateAsync({
      roomId,
      layoutId,
      input: {
        expectedVersion: baseline.expectedVersion,
        seats: baseline.seats,
        elements,
      },
    })

    emit('saved', action)
  } catch (error) {
    blocked.value = true

    const messages: Record<string, string> = {
      INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT:
        'Sơ đồ đã thay đổi ở nơi khác. Không thể lưu bằng phiên bản đang mở.',
      INVENTORY_ROOM_LAYOUT_NOT_DRAFT: 'Phiên bản này không còn là bản nháp.',
      INVENTORY_ROOM_LAYOUT_NOT_FOUND: 'Phiên bản sơ đồ không còn tồn tại.',
    }

    requestError.value = isAdminRoomApiError(error)
      ? (messages[error.code ?? ''] ?? adminRoomErrorMessage(error, 'Không thể cập nhật phần tử.'))
      : adminRoomErrorMessage(error, 'Không thể cập nhật phần tử.')

    emit('failed')
    await focusError()
  }
}

async function submit() {
  if (!canSave.value) return

  errors.value = {}
  requestError.value = ''

  const parsed = schema.safeParse(values)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]

      if (fields.some((item) => item.key === field)) {
        errors.value[field as Field] ??= issue.message
      }
    }

    await focusError()
    return
  }

  const { label, x, y, width, height, rotationDegrees } = parsed.data
  values.x = x.toFixed(2)
  values.y = y.toFixed(2)
  let geometry: RoomLayoutGeometryResponse = {
    x,
    y,
    width,
    height,
    rotationDegrees,
  }

  if (kind === 'AISLE') {
    try {
      geometry = snapAisleToGrid(props.content, geometry, props.elementId)
    } catch (error) {
      requestError.value = adminRoomErrorMessage(error, 'Không thể đặt lối đi vào các ô này.')
      await focusError()
      return
    }

    values.x = geometry.x.toFixed(2)
    values.y = geometry.y.toFixed(2)
    values.width = String(geometry.width)
    values.height = String(geometry.height)
    values.rotationDegrees = '0'
    emit('geometry', { ...geometry })
  }

  const replacement: RoomLayoutElementInput = {
    kind,
    label: label || undefined,
    geometry,
  }

  const elements = editing
    ? baseline.elements.map((element, index) => (index === targetIndex ? replacement : element))
    : [...baseline.elements, replacement]

  await save(editing ? 'updated' : 'created', elements)
}

async function requestDelete() {
  if (!canDelete.value) return

  if (!deleteArmed.value) {
    deleteArmed.value = true
    return
  }

  // Chỉ bỏ phần tử đích khỏi baseline. Giữ toàn bộ ghế và phần tử khác.
  await save(
    'deleted',
    baseline.elements.filter((_, index) => index !== targetIndex),
  )
}

defineExpose({ submit, canSave, canMove, getGeometry, setPosition })
</script>

<template>
  <form
    ref="form"
    class="layout-draft-form"
    :aria-label="`${editing ? 'Sửa' : 'Thêm'} ${names[kind]}`"
    novalidate
    @submit.prevent="submit"
  >
    <header class="layout-canvas-heading">
      <div>
        <p class="layout-inspector__eyebrow">
          {{ editing ? 'SỬA PHẦN TỬ' : 'THÊM PHẦN TỬ' }}
        </p>
        <h2>{{ names[kind] }}</h2>
      </div>
    </header>

    <fieldset
      class="layout-draft-fields"
      :disabled="busy || blocked || !enabled || deleteArmed || dragging"
    >
      <label v-for="field in fields" :key="field.key" class="layout-field">
        <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
        <input
          :id="`${prefix}-${field.key}`"
          type="text"
          :inputmode="field.numeric ? 'decimal' : 'text'"
          autocomplete="off"
          :required="field.required"
          :value="values[field.key]"
          :aria-invalid="Boolean(errors[field.key])"
          :aria-describedby="errors[field.key] ? `${prefix}-${field.key}-error` : undefined"
          @input="update(field.key, $event)"
          @blur="normalizeCoordinate(field.key)"
        />
        <span
          v-if="errors[field.key]"
          :id="`${prefix}-${field.key}-error`"
          class="layout-error"
          role="alert"
        >
          {{ errors[field.key] }}
        </span>
      </label>
    </fieldset>

    <p class="layout-muted">Tối đa 3 chữ số thập phân. Góc dương xoay theo chiều kim đồng hồ.</p>
    <p class="layout-muted">
      X/Y tự làm tròn về số nguyên không âm. Kích thước và góc xoay cho phép tối đa 3 chữ số thập
      phân.
    </p>
    <p v-if="requestError" class="layout-error" role="alert" tabindex="-1" data-request-error>
      {{ requestError }}
      Nội dung nhập vẫn được giữ. Đóng form và tải lại nội dung trước khi thử lại.
    </p>

    <p v-if="deleteArmed" class="layout-warning" role="status">
      Xóa “{{ target?.label?.trim() || names[kind] }}” khỏi bản nháp? Các thay đổi đang nhập cho
      phần tử này sẽ bị bỏ.
    </p>

    <AppButton type="submit" :disabled="!canSave" :loading="busy">
      {{ editing ? 'Áp dụng vị trí' : 'Lưu phần tử' }}
    </AppButton>

    <AppButton v-if="editing" variant="secondary" :disabled="!canDelete" @click="requestDelete">
      {{ deleteArmed ? 'Xác nhận xóa' : 'Xóa phần tử' }}
    </AppButton>

    <AppButton
      v-if="deleteArmed"
      variant="secondary"
      :disabled="busy || blocked || dragging"
      @click="deleteArmed = false"
    >
      Giữ phần tử
    </AppButton>

    <AppButton variant="secondary" :disabled="busy || blocked || dragging" @click="emit('cancel')">
      Đóng form
    </AppButton>
  </form>
</template>
