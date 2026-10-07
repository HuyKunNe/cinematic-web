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
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model'
import { useAdminCinemaDetailQuery, useSaveAdminCinemaMutation } from '../api/admin-cinema-queries'
import {
  adminCinemaErrorMessage,
  adminCinemaSchema,
  createAdminCinemaValues,
  isAdminCinemaApiError,
  toAdminCinemaRequest,
  type AdminCinemaField,
} from '../schemas/admin-cinema.schema'

const props = defineProps<{
  cinemaId: string | null
  returnFocusId: string
}>()

const emit = defineEmits<{
  close: []
  saved: [cinema: CinemaResponse]
}>()

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const detail = useAdminCinemaDetailQuery(() => props.cinemaId ?? '', canManage)
const mutation = useSaveAdminCinemaMutation()
const ready = ref(props.cinemaId === null)
const requestError = ref('')
const serverErrors = ref<Partial<Record<AdminCinemaField, string>>>({})
const formElement = ref<HTMLFormElement | null>(null)

const { errors, submitCount, isSubmitting, defineField, isFieldTouched, resetForm, handleSubmit } =
  useForm({
    validationSchema: toTypedSchema(adminCinemaSchema),
    initialValues: createAdminCinemaValues(),
    validateOnMount: false,
  })

function createField(field: AdminCinemaField) {
  return defineField(field, (state) => ({
    validateOnBlur: true,
    validateOnInput: false,
    validateOnChange: false,
    validateOnModelUpdate: state.touched || submitCount.value > 0,
  }))
}

const [name, nameAttrs] = createField('name')
const [address, addressAttrs] = createField('address')
const [city, cityAttrs] = createField('city')

const models = { name, address, city }
const attributes = { name: nameAttrs, address: addressAttrs, city: cityAttrs }

const fields: {
  name: AdminCinemaField
  label: string
  maxLength: number
  autocomplete: string
}[] = [
  { name: 'name', label: 'Tên rạp', maxLength: 150, autocomplete: 'organization' },
  { name: 'address', label: 'Địa chỉ', maxLength: 500, autocomplete: 'street-address' },
  { name: 'city', label: 'Thành phố', maxLength: 100, autocomplete: 'address-level2' },
]

const visibleErrors = computed(() => {
  const result: Partial<Record<AdminCinemaField, string>> = {}

  for (const field of fields) {
    result[field.name] =
      serverErrors.value[field.name] ??
      (isFieldTouched(field.name) || submitCount.value > 0 ? errors.value[field.name] : undefined)
  }

  return result
})

watch([name, address, city], () => {
  requestError.value = ''
  serverErrors.value = {}
})

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

async function focusName() {
  await nextTick()

  const input = document.getElementById('admin-cinema-name')
  if (input instanceof HTMLInputElement && !input.disabled) {
    input.focus()
  } else {
    document.getElementById('admin-cinema-close')?.focus()
  }
}

watch(
  [detail.data, detail.isFetching, detail.isSuccess],
  ([cinema, fetching, success]) => {
    if (
      ready.value ||
      !props.cinemaId ||
      fetching ||
      !success ||
      cinema?.id !== props.cinemaId ||
      typeof cinema.active !== 'boolean'
    ) {
      return
    }

    resetForm({ values: createAdminCinemaValues(cinema) })
    ready.value = true
    void focusName()
  },
  { immediate: true },
)

function close() {
  if (!busy.value) emit('close')
}

function onOpenChange(open: boolean) {
  if (!open) close()
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
      document.getElementById(props.returnFocusId) ?? document.getElementById('admin-cinemas-title')

    target?.focus()
  })
}

async function focusError() {
  await nextTick()

  const target =
    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
    document.getElementById('admin-cinema-request-error')

  target?.focus()
}

const save = handleSubmit(async (validatedValues) => {
  if (!ready.value || !canManage.value || mutation.isPending.value) return

  let cinema: CinemaResponse

  try {
    cinema = await mutation.mutateAsync({
      cinemaId: props.cinemaId,
      input: toAdminCinemaRequest(validatedValues),
    })
  } catch (error) {
    if (isAdminCinemaApiError(error)) {
      for (const item of error.fieldErrors) {
        const field = fields.find((candidate) => candidate.name === item.field)
        if (field) serverErrors.value[field.name] = item.message
      }
    }

    if (!Object.values(serverErrors.value).some(Boolean)) {
      requestError.value = adminCinemaErrorMessage(error, 'Không thể lưu rạp.')
    }

    await focusError()
    return
  }

  emit('saved', cinema)
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
  <DialogRoot :open="true" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="admin-cinema-dialog__overlay" />

      <DialogContent
        class="admin-cinema-dialog"
        @open-auto-focus="onOpenAutoFocus"
        @close-auto-focus="restoreFocus"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
      >
        <header class="admin-cinema-dialog__heading">
          <div>
            <DialogTitle class="admin-cinema-dialog__title">
              {{ cinemaId ? 'Sửa thông tin rạp' : 'Thêm rạp' }}
            </DialogTitle>
            <DialogDescription class="admin-cinemas__muted">
              Tên rạp, địa chỉ và thành phố.
            </DialogDescription>
          </div>

          <AppButton
            id="admin-cinema-close"
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="close"
          >
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-cinemas__error" role="alert">
          Tài khoản không còn quyền quản lý rạp.
        </p>

        <div v-if="!ready" class="admin-cinemas__feedback">
          <p v-if="detail.isFetching.value" role="status">Đang tải thông tin rạp…</p>
          <template v-else-if="detail.isError.value">
            <p class="admin-cinemas__error" role="alert">
              {{ adminCinemaErrorMessage(detail.error.value) }}
            </p>
            <AppButton variant="secondary" :disabled="!canManage" @click="detail.refetch()">
              Thử lại
            </AppButton>
          </template>
          <p v-else-if="detail.isSuccess.value" class="admin-cinemas__error" role="alert">
            Không nhận được thông tin rạp hợp lệ.
          </p>
        </div>

        <form v-if="ready" ref="formElement" class="admin-cinema-form" novalidate @submit="submit">
          <fieldset class="admin-cinema-form__fields" :disabled="busy || !canManage">
            <div v-for="field in fields" :key="field.name" class="admin-cinemas__field">
              <label :for="`admin-cinema-${field.name}`">
                {{ field.label }}
                <span class="admin-cinemas__error" aria-hidden="true">*</span>
              </label>

              <input
                v-bind="attributes[field.name].value"
                :id="`admin-cinema-${field.name}`"
                v-model="models[field.name].value"
                class="admin-cinemas__input"
                type="text"
                :maxlength="field.maxLength"
                :autocomplete="field.autocomplete"
                required
                :aria-invalid="Boolean(visibleErrors[field.name])"
                :aria-describedby="
                  visibleErrors[field.name] ? `admin-cinema-${field.name}-error` : undefined
                "
              />

              <p
                v-if="visibleErrors[field.name]"
                :id="`admin-cinema-${field.name}-error`"
                class="admin-cinemas__error"
                role="alert"
              >
                {{ visibleErrors[field.name] }}
              </p>
            </div>
          </fieldset>

          <p class="admin-cinemas__muted">
            {{
              cinemaId
                ? 'Lưu thông tin sẽ giữ nguyên trạng thái hoạt động của rạp.'
                : 'Rạp mới được tạo ở trạng thái đang hoạt động.'
            }}
          </p>

          <p
            v-if="requestError"
            id="admin-cinema-request-error"
            class="admin-cinemas__error"
            role="alert"
            tabindex="-1"
          >
            {{ requestError }}
          </p>

          <footer class="admin-cinema-form__actions">
            <AppButton variant="secondary" :disabled="busy" @click="close"> Hủy </AppButton>
            <AppButton type="submit" :loading="busy" :disabled="!canManage">
              {{ cinemaId ? 'Lưu thay đổi' : 'Thêm rạp' }}
            </AppButton>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
