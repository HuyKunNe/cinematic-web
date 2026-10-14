<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import type {
  RoomLayoutContentResponse,
  RoomLayoutElementInputKind,
} from '@/services/api/generated/inventory-service/model'
import { useReplaceAdminRoomLayoutContentMutation } from '../api/admin-room-layout-queries'
import { toAdminRoomLayoutContentRequest } from '../mappers/admin-room-layout-content.mapper'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'

const props = defineProps<{
  content: RoomLayoutContentResponse
  kind: RoomLayoutElementInputKind
  enabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
  saved: []
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

const prefix = useId()
const form = ref<HTMLFormElement | null>(null)
const values = reactive({
  label: '',
  x: '0',
  y: '0',
  width: '',
  height: '',
  rotationDegrees: '0',
})
const errors = ref<Partial<Record<Field, string>>>({})
const requestError = ref('')
const blocked = ref(false)
const mutation = useReplaceAdminRoomLayoutContentMutation()
const busy = computed(() => mutation.isPending.value)

// Baseline cố định từ lúc mở form.
// Không thay expectedVersion bằng dữ liệu refetch mới.
const baseline = toAdminRoomLayoutContentRequest(props.content)
const roomId = props.content.layout.roomId
const layoutId = props.content.layout.id
const kind = props.kind

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

async function submit() {
  if (!props.enabled || busy.value || blocked.value) return

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

  try {
    await mutation.mutateAsync({
      roomId,
      layoutId,
      input: {
        expectedVersion: baseline.expectedVersion,
        seats: baseline.seats,
        elements: [
          ...baseline.elements,
          {
            kind,
            label: label || undefined,
            geometry: { x, y, width, height, rotationDegrees },
          },
        ],
      },
    })

    emit('saved')
  } catch (error) {
    blocked.value = true

    const messages: Record<string, string> = {
      INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT:
        'Sơ đồ đã thay đổi ở nơi khác. Không thể lưu bằng phiên bản đang mở.',
      INVENTORY_ROOM_LAYOUT_NOT_DRAFT: 'Phiên bản này không còn là bản nháp.',
      INVENTORY_ROOM_LAYOUT_NOT_FOUND: 'Phiên bản sơ đồ không còn tồn tại.',
    }

    requestError.value = isAdminRoomApiError(error)
      ? (messages[error.code ?? ''] ?? adminRoomErrorMessage(error, 'Không thể lưu phần tử.'))
      : adminRoomErrorMessage(error, 'Không thể lưu phần tử.')

    emit('failed')
    await focusError()
  }
}

defineExpose({ submit })
</script>

<template>
  <form
    ref="form"
    class="layout-draft-form"
    :aria-label="`Thêm ${names[kind]}`"
    novalidate
    @submit.prevent="submit"
  >
    <header class="layout-canvas-heading">
      <div>
        <p class="layout-inspector__eyebrow">THÊM PHẦN TỬ</p>
        <h2>{{ names[kind] }}</h2>
      </div>
    </header>

    <fieldset class="layout-draft-fields" :disabled="busy || blocked || !enabled">
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

    <AppButton type="submit" :disabled="blocked || !enabled" :loading="busy">
      Lưu phần tử
    </AppButton>
    <AppButton variant="secondary" :disabled="busy" @click="emit('cancel')"> Đóng form </AppButton>
  </form>
</template>
