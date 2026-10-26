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
import {
  CreateRoomRequestContentFormatsItem,
  type CreateRoomRequest,
  type RoomResponse,
} from '@/services/api/generated/inventory-service/model'
import { useAdminRoomDetailQuery, useSaveAdminRoomMutation } from '../api/admin-room-queries'
import {
  adminRoomContentFormatOptions,
  adminRoomCreateSchema,
  adminRoomErrorMessage,
  adminRoomSchema,
  adminRoomTypeLabel,
  adminRoomTypeOptions,
  createAdminRoomCreateValues,
  createAdminRoomValues,
  isAdminRoomApiError,
  toAdminRoomCreateRequest,
  toAdminRoomUpdateRequest,
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
type AdminRoomContentFormat = NonNullable<CreateRoomRequest['contentFormats']>[number]

const active = ref(true)
const contentFormats = ref<AdminRoomContentFormat[]>([CreateRoomRequestContentFormatsItem['2D']])
const contentFormatsError = ref('')
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

watch(contentFormats, () => {
  contentFormatsError.value = ''
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
    document.getElementById('admin-room-content-formats') ??
    document.getElementById('admin-room-request-error')

  target?.focus()
}

const save = handleSubmit(async (values) => {
  if (!ready.value || !canManage.value || mutation.isPending.value) return

  let room: RoomResponse

  try {
    if (props.roomId) {
      room = await mutation.mutateAsync({
        operation: 'update',
        cinemaId: props.cinemaId,
        roomId: props.roomId,
        input: toAdminRoomUpdateRequest(values),
      })
    } else {
      const parsed = adminRoomCreateSchema.safeParse({
        ...values,
        active: active.value,
        contentFormats: contentFormats.value,
      })

      if (!parsed.success) {
        contentFormatsError.value =
          parsed.error.issues.find((issue) => issue.path[0] === 'contentFormats')?.message ??
          'Chọn ít nhất một định dạng phòng hỗ trợ.'
        await focusError()
        return
      }

      room = await mutation.mutateAsync({
        operation: 'create',
        cinemaId: props.cinemaId,
        input: toAdminRoomCreateRequest(parsed.data),
      })
    }
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
        class="admin-room-dialog is-room-editor"
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
          <div class="admin-room-form__layout">
            <fieldset class="admin-room-form__fields" :disabled="busy || !canManage">
              <div class="admin-rooms__field">
                <label for="admin-room-cinema-name">Cụm rạp</label>
                <input
                  id="admin-room-cinema-name"
                  class="admin-rooms__input"
                  type="text"
                  :value="cinemaName"
                  readonly
                />
              </div>

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
                  placeholder="Nhập tên phòng"
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
                  <option
                    v-for="item in adminRoomTypeOptions"
                    :key="item.value"
                    :value="item.value"
                  >
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
              <div v-if="!roomId" class="admin-rooms__field">
                <label for="admin-room-active">Trạng thái</label>
                <select id="admin-room-active" v-model="active" class="admin-rooms__input">
                  <option :value="true">Đang hoạt động</option>
                  <option :value="false">Tạm ngưng</option>
                </select>
              </div>

              <fieldset
                v-if="!roomId"
                id="admin-room-content-formats"
                class="admin-room-form__formats"
                tabindex="-1"
                :aria-invalid="Boolean(contentFormatsError)"
              >
                <legend>Định dạng phòng hỗ trợ *</legend>

                <label
                  v-for="format in adminRoomContentFormatOptions"
                  :key="format.value"
                  class="admin-room-form__format"
                >
                  <input v-model="contentFormats" type="checkbox" :value="format.value" />
                  <span>{{ format.label }}</span>
                </label>

                <p v-if="contentFormatsError" class="admin-rooms__error" role="alert">
                  {{ contentFormatsError }}
                </p>
              </fieldset>
            </fieldset>

            <aside class="admin-room-preview" aria-labelledby="admin-room-preview-title">
              <p class="admin-room-preview__eyebrow">Xem trước</p>
              <h2 id="admin-room-preview-title">Thông tin phòng</h2>

              <dl>
                <div>
                  <dt>Cụm rạp</dt>
                  <dd>{{ cinemaName }}</dd>
                </div>
                <div>
                  <dt>Tên phòng</dt>
                  <dd>{{ name?.trim() || 'Chưa nhập' }}</dd>
                </div>
                <div>
                  <dt>Loại phòng</dt>
                  <dd>{{ adminRoomTypeLabel(roomType) }}</dd>
                </div>
                <div v-if="!roomId">
                  <dt>Trạng thái</dt>
                  <dd>{{ active ? 'Đang hoạt động' : 'Tạm ngưng' }}</dd>
                </div>
                <div v-if="!roomId">
                  <dt>Định dạng</dt>
                  <dd>
                    {{ contentFormats.length ? contentFormats.join(' · ') : 'Chưa chọn định dạng' }}
                  </dd>
                </div>
              </dl>

              <p class="admin-room-preview__hint">
                Quản lý ghế và thiết kế sơ đồ từ danh sách phòng.
              </p>
            </aside>
          </div>

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
