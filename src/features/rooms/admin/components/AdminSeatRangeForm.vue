<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import AppButton from '@/components/ui/AppButton.vue'
import { useCreateAdminSeatRangeMutation } from '../api/admin-seat-queries'
import {
  adminSeatRangeSchema,
  adminSeatTypeOptions,
  createAdminSeatRangeValues,
  type AdminSeatRangeField,
} from '../schemas/admin-seat-range.schema'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'

const props = defineProps<{
  roomId: string
  disabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
}>()

const form = ref<HTMLFormElement | null>(null)
const requestError = ref('')
const successMessage = ref('')
const mutation = useCreateAdminSeatRangeMutation()

const { errors, defineField, handleSubmit, resetForm, setFieldError, isSubmitting } = useForm({
  validationSchema: toTypedSchema(adminSeatRangeSchema),
  initialValues: createAdminSeatRangeValues(),
  validateOnMount: false,
})

const fieldOptions = {
  validateOnModelUpdate: false,
}

const [rowLabel, rowAttrs] = defineField('rowLabel', fieldOptions)
const [startNumber, startAttrs] = defineField('startNumber', fieldOptions)
const [endNumber, endAttrs] = defineField('endNumber', fieldOptions)
const [seatType, typeAttrs] = defineField('seatType', fieldOptions)

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

watch(busy, (value) => emit('busy', value), { flush: 'sync' })

const fields: AdminSeatRangeField[] = ['rowLabel', 'startNumber', 'endNumber', 'seatType']

async function focusError() {
  await nextTick()
  form.value?.querySelector<HTMLElement>('[aria-invalid="true"], [data-request-error]')?.focus()
}

const submit = handleSubmit(async (input) => {
  if (props.disabled || mutation.isPending.value) return

  requestError.value = ''
  successMessage.value = ''

  try {
    const created = await mutation.mutateAsync({
      roomId: props.roomId,
      input,
    })

    resetForm({
      values: {
        ...createAdminSeatRangeValues(),
        seatType: input.seatType,
      },
    })

    successMessage.value = `Đã tạo ${created.length} ghế.`
  } catch (error) {
    if (isAdminRoomApiError(error)) {
      for (const item of error.fieldErrors) {
        const field = item.field === 'rangeValid' ? 'endNumber' : item.field

        if (fields.includes(field as AdminSeatRangeField)) {
          setFieldError(field as AdminSeatRangeField, item.message)
        }
      }

      const messages: Record<string, string> = {
        INVENTORY_SEAT_NUMBER_ALREADY_EXISTS: 'Dãy ghế có số đã tồn tại. Hãy chọn khoảng số khác.',
        INVENTORY_ROOM_INACTIVE: 'Phòng đã tạm ngưng. Hãy tải lại thông tin phòng.',
      }

      requestError.value =
        messages[error.code ?? ''] ?? adminRoomErrorMessage(error, 'Không thể tạo dãy ghế.')
    } else {
      requestError.value = adminRoomErrorMessage(error, 'Không thể tạo dãy ghế.')
    }

    await focusError()
  }
}, focusError)

function onSubmit(event: Event) {
  event.preventDefault()
  if (props.disabled || busy.value) return
  return submit(event)
}
</script>

<template>
  <form ref="form" class="seatmap-create" novalidate aria-label="Tạo dãy ghế" @submit="onSubmit">
    <h2>Tạo dãy ghế</h2>

    <fieldset :disabled="disabled || busy">
      <label class="seatmap-field">
        <span>Hàng ghế *</span>
        <input
          v-model="rowLabel"
          v-bind="rowAttrs"
          maxlength="10"
          autocomplete="off"
          required
          :aria-invalid="Boolean(errors.rowLabel)"
          aria-describedby="seat-range-row-error"
        />
        <small id="seat-range-row-error" class="seatmap-error">
          {{ errors.rowLabel }}
        </small>
      </label>

      <label class="seatmap-field">
        <span>Số đầu *</span>
        <input
          v-model="startNumber"
          v-bind="startAttrs"
          inputmode="numeric"
          maxlength="3"
          required
          :aria-invalid="Boolean(errors.startNumber)"
          aria-describedby="seat-range-start-error"
        />
        <small id="seat-range-start-error" class="seatmap-error">
          {{ errors.startNumber }}
        </small>
      </label>

      <label class="seatmap-field">
        <span>Số cuối *</span>
        <input
          v-model="endNumber"
          v-bind="endAttrs"
          inputmode="numeric"
          maxlength="3"
          required
          :aria-invalid="Boolean(errors.endNumber)"
          aria-describedby="seat-range-end-error"
        />
        <small id="seat-range-end-error" class="seatmap-error">
          {{ errors.endNumber }}
        </small>
      </label>

      <label class="seatmap-field">
        <span>Loại ghế *</span>
        <select
          v-model="seatType"
          v-bind="typeAttrs"
          required
          :aria-invalid="Boolean(errors.seatType)"
          aria-describedby="seat-range-type-error"
        >
          <option v-for="option in adminSeatTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <small id="seat-range-type-error" class="seatmap-error">
          {{ errors.seatType }}
        </small>
      </label>
    </fieldset>

    <p v-if="requestError" class="seatmap-error" role="alert" tabindex="-1" data-request-error>
      {{ requestError }}
    </p>

    <p v-if="successMessage" role="status">{{ successMessage }}</p>

    <AppButton type="submit" :disabled="disabled" :loading="busy"> Tạo dãy ghế </AppButton>
  </form>
</template>
