<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import type { RoomLayoutResponse } from '@/services/api/generated/inventory-service/model'
import { useCreateAdminRoomLayoutDraftMutation } from '../api/admin-room-layout-queries'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'

const props = defineProps<{
  roomId: string
  enabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
  created: [layout: RoomLayoutResponse]
  failed: []
  cancel: []
}>()

const dimension = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d{1,3})?$/, 'Nhập tối đa 9 chữ số phần nguyên và 3 chữ số thập phân.')
  .transform(Number)
  .refine((value) => value > 0, 'Kích thước phải lớn hơn 0.')

const schema = z.object({
  canvasWidth: dimension,
  canvasHeight: dimension,
})

const fields = [
  { key: 'canvasWidth', label: 'Chiều rộng canvas' },
  { key: 'canvasHeight', label: 'Chiều cao canvas' },
] as const

type Field = (typeof fields)[number]['key']

const prefix = useId()
const form = ref<HTMLFormElement | null>(null)
const values = reactive({ canvasWidth: '', canvasHeight: '' })
const errors = ref<Partial<Record<Field, string>>>({})
const requestError = ref('')
const blocked = ref(false)

const mutation = useCreateAdminRoomLayoutDraftMutation()
const busy = computed(() => mutation.isPending.value)

// Component được mount với key roomId.
const targetRoomId = props.roomId

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

      if (field === 'canvasWidth' || field === 'canvasHeight') {
        errors.value[field] ??= issue.message
      }
    }

    await focusError()
    return
  }

  try {
    const created = await mutation.mutateAsync({
      roomId: targetRoomId,
      ...parsed.data,
    })

    emit('created', created)
  } catch (error) {
    blocked.value = true
    requestError.value = adminRoomErrorMessage(error, 'Không thể tạo bản nháp.')
    emit('failed')
    await focusError()
  }
}
</script>

<template>
  <form
    ref="form"
    class="layout-draft-form"
    aria-label="Tạo bản nháp sơ đồ"
    novalidate
    @submit.prevent="submit"
  >
    <p class="layout-muted">
      Tạo một phiên bản trống. Nhập kích thước theo đơn vị layout của Backend.
    </p>

    <fieldset class="layout-draft-fields" :disabled="busy || blocked || !enabled">
      <label v-for="field in fields" :key="field.key" class="layout-field">
        <span>{{ field.label }} *</span>
        <input
          :id="`${prefix}-${field.key}`"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          required
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

    <p class="layout-muted">Dùng dấu chấm cho phần thập phân, tối đa 3 chữ số.</p>

    <p v-if="requestError" class="layout-error" role="alert" tabindex="-1" data-request-error>
      {{ requestError }}
      Nội dung nhập vẫn được giữ. Đóng form, tải lại và kiểm tra danh sách phiên bản trước khi thử
      lại.
    </p>

    <AppButton type="submit" :disabled="blocked || !enabled" :loading="busy">
      Tạo bản nháp
    </AppButton>
    <AppButton variant="secondary" :disabled="busy" @click="emit('cancel')"> Đóng form </AppButton>
  </form>
</template>
