<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import type {
  RoomLayoutContentResponse,
  RoomLayoutElementInput,
  RoomLayoutElementInputKind,
} from '@/services/api/generated/inventory-service/model'
import { useReplaceAdminRoomLayoutContentMutation } from '../api/admin-room-layout-queries'
import { toAdminRoomLayoutContentRequest } from '../mappers/admin-room-layout-content.mapper'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'

type SaveAction = 'created' | 'updated' | 'deleted'

const props = defineProps<{
  content: RoomLayoutContentResponse
  kind: RoomLayoutElementInputKind
  elementId?: string
  enabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
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

const schema = z.object({
  label: z.string().trim().max(150, 'Nhãn tối đa 150 ký tự.'),
  x: decimal(9),
  y: decimal(9),
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
  x: String(target?.geometry.x ?? 0),
  y: String(target?.geometry.y ?? 0),
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

const canSave = computed(() => props.enabled && !busy.value && !blocked.value && !deleteArmed.value)
const canDelete = computed(() => editing && props.enabled && !busy.value && !blocked.value)

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
  const replacement: RoomLayoutElementInput = {
    kind,
    label: label || undefined,
    geometry: { x, y, width, height, rotationDegrees },
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

defineExpose({ submit, canSave })
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

    <fieldset class="layout-draft-fields" :disabled="busy || blocked || !enabled || deleteArmed">
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
      :disabled="busy || blocked"
      @click="deleteArmed = false"
    >
      Giữ phần tử
    </AppButton>

    <AppButton variant="secondary" :disabled="busy" @click="emit('cancel')"> Đóng form </AppButton>
  </form>
</template>
