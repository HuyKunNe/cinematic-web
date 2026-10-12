<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminRoomSeatsQuery, useCreateAdminSeatRangeMutation } from '../api/admin-seat-queries'
import {
  adminSeatRangeSchema,
  adminSeatTypeOptions,
  createAdminSeatRangeValues,
  type AdminSeatRangeField,
} from '../schemas/admin-seat-range.schema'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'

const props = defineProps<{
  roomId: string
  roomName: string
  cinemaName: string
  returnFocusId: string
}>()

const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const seats = useAdminRoomSeatsQuery(() => props.roomId, canManage)
const mutation = useCreateAdminSeatRangeMutation()
const formElement = ref<HTMLFormElement | null>(null)
const requestError = ref('')
const successMessage = ref('')
const touched = ref<Partial<Record<AdminSeatRangeField, boolean>>>({})
const serverErrors = ref<Partial<Record<AdminSeatRangeField, string>>>({})

const fields: AdminSeatRangeField[] = ['rowLabel', 'startNumber', 'endNumber', 'seatType']

const textFields = [
  { name: 'rowLabel', label: 'Hàng ghế', maxLength: 10 },
  { name: 'startNumber', label: 'Số đầu', maxLength: 3 },
  { name: 'endNumber', label: 'Số cuối', maxLength: 3 },
] as const

const {
  values,
  errors,
  submitCount,
  isSubmitting,
  setFieldValue,
  validateField,
  resetForm,
  handleSubmit,
} = useForm({
  validationSchema: toTypedSchema(adminSeatRangeSchema),
  initialValues: createAdminSeatRangeValues(),
  validateOnMount: false,
})

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

const canCreate = computed(
  () => canManage.value && !busy.value && seats.isSuccess.value && !seats.isFetching.value,
)

const visibleErrors = computed(() => {
  const result: Partial<Record<AdminSeatRangeField, string>> = {}

  for (const field of fields) {
    result[field] =
      serverErrors.value[field] ??
      (touched.value[field] || submitCount.value > 0 ? errors.value[field] : undefined)
  }

  return result
})

watch(
  () => values,
  () => {
    requestError.value = ''
    serverErrors.value = {}
  },
  { deep: true },
)

const collator = new Intl.Collator('vi', { numeric: true })

const rows = computed(() =>
  [...(seats.data.value ?? [])].sort(
    (a, b) =>
      collator.compare(a.rowLabel ?? '', b.rowLabel ?? '') ||
      collator.compare(a.seatNumber ?? '', b.seatNumber ?? ''),
  ),
)

const preview = computed(() => {
  const parsed = adminSeatRangeSchema.safeParse(values)
  if (!parsed.success) return ''

  const { rowLabel, startNumber, endNumber } = parsed.data
  return `Sẽ tạo ${endNumber - startNumber + 1} ghế: ${rowLabel}${startNumber}–${rowLabel}${endNumber}.`
})

function shouldValidate(field: AdminSeatRangeField) {
  return Boolean(touched.value[field] || submitCount.value > 0)
}

function blurField(field: AdminSeatRangeField) {
  touched.value[field] = true
  void validateField(field)
}

function updateInput(field: (typeof textFields)[number]['name'], event: Event) {
  setFieldValue(field, (event.target as HTMLInputElement).value, shouldValidate(field))
}

function changeSeatType(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const option = adminSeatTypeOptions.find((item) => item.value === value)
  if (!option) return

  touched.value.seatType = true
  setFieldValue('seatType', option.value, true)
}

function seatTypeLabel(value?: string) {
  return adminSeatTypeOptions.find((item) => item.value === value)?.label ?? value ?? '—'
}

function close() {
  if (!busy.value) emit('close')
}

function preventDuringSave(event: Event) {
  if (busy.value) event.preventDefault()
}

function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  void nextTick(() => {
    document.getElementById('admin-room-seats-close')?.focus()
  })
}

function restoreFocus(event: Event) {
  event.preventDefault()
  void nextTick(() => {
    const target =
      document.getElementById(props.returnFocusId) ?? document.getElementById('admin-rooms-title')
    target?.focus()
  })
}

async function focusError() {
  await nextTick()
  const target =
    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
    document.getElementById('admin-room-seats-request-error')
  target?.focus()
}

const save = handleSubmit(async (validatedValues) => {
  if (!canManage.value || mutation.isPending.value || !seats.isSuccess.value) return

  try {
    const created = await mutation.mutateAsync({
      roomId: props.roomId,
      input: validatedValues,
    })

    resetForm({
      values: {
        ...createAdminSeatRangeValues(),
        seatType: validatedValues.seatType,
      },
    })
    touched.value = {}
    serverErrors.value = {}
    successMessage.value = `Đã tạo ${created.length} ghế.`
  } catch (error) {
    if (isAdminRoomApiError(error)) {
      for (const item of error.fieldErrors) {
        const field =
          item.field === 'rangeValid'
            ? 'endNumber'
            : fields.find((candidate) => candidate === item.field)

        if (field) serverErrors.value[field] = item.message
      }

      const messages: Record<string, string> = {
        INVENTORY_SEAT_NUMBER_ALREADY_EXISTS: 'Dãy ghế có số đã tồn tại. Hãy chọn khoảng số khác.',
        INVENTORY_ROOM_INACTIVE:
          'Phòng đã ngừng hoạt động. Hãy đóng dialog và tải lại danh sách phòng.',
        INVENTORY_ROOM_NOT_FOUND: 'Phòng không còn tồn tại. Hãy tải lại danh sách phòng.',
      }
      requestError.value = messages[error.code ?? ''] ?? ''
    }

    if (!requestError.value && !Object.values(serverErrors.value).some(Boolean)) {
      requestError.value = adminRoomErrorMessage(error, 'Không thể tạo dãy ghế.')
    }

    await focusError()
  }
}, focusError)

function submit(event: Event) {
  event.preventDefault()
  if (!canCreate.value) return

  requestError.value = ''
  serverErrors.value = {}
  successMessage.value = ''
  return save(event)
}
</script>

<template>
  <DialogRoot
    :open="true"
    @update:open="
      (open) => {
        if (!open) close()
      }
    "
  >
    <DialogPortal>
      <DialogOverlay class="admin-room-dialog__overlay" />

      <DialogContent
        class="admin-room-dialog admin-room-seats-dialog"
        @open-auto-focus="onOpenAutoFocus"
        @close-auto-focus="restoreFocus"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
      >
        <header class="admin-room-dialog__heading">
          <div>
            <DialogTitle class="admin-room-dialog__title"> Ghế của {{ roomName }} </DialogTitle>
            <DialogDescription class="admin-rooms__muted">
              {{ cinemaName }} · Ghế đang hoạt động
            </DialogDescription>
          </div>

          <AppButton
            id="admin-room-seats-close"
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="close"
          >
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-rooms__error" role="alert">
          Tài khoản không còn quyền quản lý ghế.
        </p>

        <form ref="formElement" class="admin-room-form" novalidate @submit="submit">
          <h2 class="admin-room-seats__heading">Thêm dãy ghế</h2>

          <fieldset
            class="admin-room-form__fields admin-room-seats__fields"
            :disabled="busy || !canManage"
          >
            <div v-for="field in textFields" :key="field.name" class="admin-rooms__field">
              <label :for="`admin-seat-range-${field.name}`">{{ field.label }} *</label>
              <input
                :id="`admin-seat-range-${field.name}`"
                class="admin-rooms__input"
                type="text"
                :value="values[field.name] ?? ''"
                :maxlength="field.maxLength"
                :inputmode="field.name === 'rowLabel' ? 'text' : 'numeric'"
                :aria-invalid="Boolean(visibleErrors[field.name])"
                :aria-describedby="
                  visibleErrors[field.name] ? `admin-seat-range-${field.name}-error` : undefined
                "
                autocomplete="off"
                required
                @input="updateInput(field.name, $event)"
                @blur="blurField(field.name)"
              />
              <p
                v-if="visibleErrors[field.name]"
                :id="`admin-seat-range-${field.name}-error`"
                class="admin-rooms__error"
                role="alert"
              >
                {{ visibleErrors[field.name] }}
              </p>
            </div>

            <div class="admin-rooms__field">
              <label for="admin-seat-range-type">Loại ghế *</label>
              <select
                id="admin-seat-range-type"
                class="admin-rooms__input"
                :value="values.seatType"
                :aria-invalid="Boolean(visibleErrors.seatType)"
                :aria-describedby="
                  visibleErrors.seatType ? 'admin-seat-range-type-error' : undefined
                "
                required
                @change="changeSeatType"
                @blur="blurField('seatType')"
              >
                <option v-for="item in adminSeatTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <p
                v-if="visibleErrors.seatType"
                id="admin-seat-range-type-error"
                class="admin-rooms__error"
                role="alert"
              >
                {{ visibleErrors.seatType }}
              </p>
            </div>
          </fieldset>

          <p v-if="preview" class="admin-rooms__muted">{{ preview }}</p>
          <p v-if="successMessage" class="admin-rooms__success" role="status">
            {{ successMessage }}
          </p>
          <p
            v-if="requestError"
            id="admin-room-seats-request-error"
            class="admin-rooms__error"
            role="alert"
            tabindex="-1"
          >
            {{ requestError }}
          </p>

          <footer class="admin-room-form__actions">
            <AppButton type="submit" :loading="busy" :disabled="!canCreate">
              Tạo dãy ghế
            </AppButton>
          </footer>
        </form>

        <section class="admin-room-seats__list" aria-labelledby="admin-room-seats-list-title">
          <h2 id="admin-room-seats-list-title" class="admin-room-seats__heading">
            Ghế đang hoạt động
            <template v-if="seats.data.value"> · {{ rows.length }}</template>
          </h2>

          <div v-if="seats.isError.value" class="admin-rooms__feedback">
            <p class="admin-rooms__error" role="alert">
              {{ adminRoomErrorMessage(seats.error.value, 'Không thể tải danh sách ghế.') }}
            </p>
            <p v-if="seats.data.value" class="admin-rooms__muted">
              Đang hiển thị dữ liệu từ lần tải trước.
            </p>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="busy || !canManage"
              :loading="seats.isFetching.value"
              @click="seats.refetch()"
            >
              Tải lại ghế
            </AppButton>
          </div>

          <p v-else-if="seats.isFetching.value" class="admin-rooms__muted" role="status">
            Đang tải danh sách ghế…
          </p>

          <div
            class="admin-rooms__table-scroll"
            role="region"
            aria-label="Danh sách ghế của phòng"
            tabindex="0"
          >
            <table class="admin-rooms__table admin-room-seats__table">
              <caption class="admin-visually-hidden">
                Ghế đang hoạt động của phòng
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ghế</th>
                  <th scope="col">Hàng</th>
                  <th scope="col">Loại ghế</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(seat, index) in rows" :key="seat.id ?? index">
                  <td>{{ seat.seatNumber ?? '—' }}</td>
                  <td>{{ seat.rowLabel ?? '—' }}</td>
                  <td>{{ seatTypeLabel(seat.seatType) }}</td>
                </tr>
                <tr v-if="seats.isSuccess.value && !rows.length">
                  <td colspan="3">Phòng chưa có ghế đang hoạt động.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
