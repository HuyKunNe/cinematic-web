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
import type { RoomResponse } from '@/services/api/generated/inventory-service/model'
import { useAdminRoomDetailQuery, useSaveAdminRoomMutation } from '../api/admin-room-queries'
import {
  adminRoomErrorMessage,
  adminRoomSchema,
  adminRoomTypeOptions,
  createAdminRoomValues,
  isAdminRoomApiError,
  toAdminRoomRequest,
  type AdminRoomField,
} from '../schemas/admin-room.schema'

const props = defineProps<{
  cinemaId: string
  cinemaName: string
  roomId: string | null
  returnFocusId: string
}>()

const emit = defineEmits<{
  close: []
  saved: [room: RoomResponse]
}>()

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const detail = useAdminRoomDetailQuery(() => props.roomId ?? '', canManage)
const mutation = useSaveAdminRoomMutation()
const ready = ref(props.roomId === null)
const requestError = ref('')
const serverErrors = ref<Partial<Record<AdminRoomField, string>>>({})
const formElement = ref<HTMLFormElement | null>(null)
const fields: AdminRoomField[] = ['name', 'roomType']

const { errors, submitCount, isSubmitting, defineField, isFieldTouched, resetForm, handleSubmit } =
  useForm({
    validationSchema: toTypedSchema(adminRoomSchema),
    initialValues: createAdminRoomValues(),
    validateOnMount: false,
  })

function createField(field: AdminRoomField) {
  return defineField(field, (state) => ({
    validateOnBlur: true,
    validateOnInput: false,
    validateOnChange: false,
    validateOnModelUpdate: state.touched || submitCount.value > 0,
  }))
}

const [name, nameAttrs] = createField('name')
const [roomType, roomTypeAttrs] = createField('roomType')
const busy = computed(() => isSubmitting.value || mutation.isPending.value)

const visibleErrors = computed(() => {
  const result: Partial<Record<AdminRoomField, string>> = {}

  for (const field of fields) {
    result[field] =
      serverErrors.value[field] ??
      (isFieldTouched(field) || submitCount.value > 0 ? errors.value[field] : undefined)
  }

  return result
})

watch([name, roomType], () => {
  serverErrors.value = {}
  requestError.value = ''
})

async function focusName() {
  await nextTick()

  const input = document.getElementById('admin-room-name')

  if (input instanceof HTMLInputElement && !input.disabled) {
    input.focus()
  } else {
    document.getElementById('admin-room-close')?.focus()
  }
}

watch(
  [detail.data, detail.isFetching, detail.isSuccess],
  ([room, fetching, success]) => {
    if (
      ready.value ||
      !props.roomId ||
      fetching ||
      !success ||
      room?.id !== props.roomId ||
      room.cinemaId !== props.cinemaId ||
      typeof room.name !== 'string' ||
      typeof room.active !== 'boolean' ||
      !adminRoomSchema.shape.roomType.safeParse(room.roomType).success
    ) {
      return
    }

    resetForm({ values: createAdminRoomValues(room) })
    ready.value = true
    void focusName()
  },
  { immediate: true },
)

function close() {
  if (!busy.value) emit('close')
}

function preventDuringSave(event: Event) {
  if (busy.value) event.preventDefault()
}

function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  void focusName()
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
    document.getElementById('admin-room-request-error')

  target?.focus()
}

const save = handleSubmit(async (values) => {
  if (!ready.value || !canManage.value || mutation.isPending.value) return

  let room: RoomResponse

  try {
    room = await mutation.mutateAsync({
      cinemaId: props.cinemaId,
      roomId: props.roomId,
      input: toAdminRoomRequest(values),
    })
  } catch (error) {
    if (isAdminRoomApiError(error)) {
      for (const item of error.fieldErrors) {
        const field = fields.find((candidate) => candidate === item.field)
        if (field) serverErrors.value[field] = item.message
      }
    }

    if (!Object.values(serverErrors.value).some(Boolean)) {
      requestError.value = adminRoomErrorMessage(error, 'Không thể lưu phòng.')
    }

    await focusError()
    return
  }

  emit('saved', room)
}, focusError)

function submit(event: Event) {
  if (busy.value || !canManage.value) {
    event.preventDefault()
    return
  }

  requestError.value = ''
  serverErrors.value = {}
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
        class="admin-room-dialog"
        @open-auto-focus="onOpenAutoFocus"
        @close-auto-focus="restoreFocus"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
      >
        <header class="admin-room-dialog__heading">
          <div>
            <DialogTitle class="admin-room-dialog__title">
              {{ roomId ? 'Sửa thông tin phòng' : 'Thêm phòng chiếu' }}
            </DialogTitle>
            <DialogDescription class="admin-rooms__muted">
              {{ cinemaName }}
            </DialogDescription>
          </div>
          <AppButton
            id="admin-room-close"
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="close"
          >
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-rooms__error" role="alert">
          Tài khoản không còn quyền quản lý phòng.
        </p>

        <div v-if="!ready" class="admin-rooms__feedback">
          <p v-if="detail.isFetching.value" role="status">Đang tải thông tin phòng…</p>
          <template v-else-if="detail.isError.value">
            <p class="admin-rooms__error" role="alert">
              {{ adminRoomErrorMessage(detail.error.value) }}
            </p>
            <AppButton variant="secondary" :disabled="!canManage" @click="detail.refetch()">
              Thử lại
            </AppButton>
          </template>
          <p v-else-if="detail.isSuccess.value" class="admin-rooms__error" role="alert">
            Không nhận được thông tin phòng hợp lệ.
          </p>
        </div>

        <form v-if="ready" ref="formElement" class="admin-room-form" novalidate @submit="submit">
          <fieldset class="admin-room-form__fields" :disabled="busy || !canManage">
            <div class="admin-rooms__field">
              <label for="admin-room-name">Tên phòng *</label>
              <input
                id="admin-room-name"
                v-model="name"
                v-bind="nameAttrs"
                class="admin-rooms__input"
                type="text"
                maxlength="100"
                autocomplete="off"
                required
                :aria-invalid="Boolean(visibleErrors.name)"
                :aria-describedby="visibleErrors.name ? 'admin-room-name-error' : undefined"
              />
              <p
                v-if="visibleErrors.name"
                id="admin-room-name-error"
                class="admin-rooms__error"
                role="alert"
              >
                {{ visibleErrors.name }}
              </p>
            </div>

            <div class="admin-rooms__field">
              <label for="admin-room-type">Loại phòng *</label>
              <select
                id="admin-room-type"
                v-model="roomType"
                v-bind="roomTypeAttrs"
                class="admin-rooms__input"
                required
                :aria-invalid="Boolean(visibleErrors.roomType)"
                :aria-describedby="visibleErrors.roomType ? 'admin-room-type-error' : undefined"
              >
                <option v-for="item in adminRoomTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <p
                v-if="visibleErrors.roomType"
                id="admin-room-type-error"
                class="admin-rooms__error"
                role="alert"
              >
                {{ visibleErrors.roomType }}
              </p>
            </div>
          </fieldset>

          <p v-if="roomId" class="admin-rooms__muted">
            Lưu thông tin sẽ giữ nguyên trạng thái hoạt động hiện tại của phòng.
          </p>

          <p
            v-if="requestError"
            id="admin-room-request-error"
            class="admin-rooms__error"
            role="alert"
            tabindex="-1"
          >
            {{ requestError }}
          </p>

          <footer class="admin-room-form__actions">
            <AppButton variant="secondary" :disabled="busy" @click="close">Hủy</AppButton>
            <AppButton type="submit" :loading="busy" :disabled="!canManage">
              {{ roomId ? 'Lưu thay đổi' : 'Thêm phòng' }}
            </AppButton>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
