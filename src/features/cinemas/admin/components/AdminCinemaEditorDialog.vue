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
import AppCreatableAutocomplete from '@/components/ui/AppCreatableAutocomplete.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model'
import {
  useAdminCinemaCatalogQuery,
  useAdminCinemaDetailQuery,
  useSaveAdminCinemaMutation,
} from '../api/admin-cinema-queries'

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
const cityCatalog = useAdminCinemaCatalogQuery(canManage)
const mutation = useSaveAdminCinemaMutation()
const ready = ref(props.cinemaId === null)
const requestError = ref('')
const serverErrors = ref<Partial<Record<AdminCinemaField, string>>>({})
const formElement = ref<HTMLFormElement | null>(null)
const interactionStarted = ref(false)
const touchedFields = ref<Partial<Record<AdminCinemaField, boolean>>>({})
const {
  errors,
  submitCount,
  isSubmitting,
  defineField,
  setFieldTouched,
  validateField,
  resetForm,
  handleSubmit,
} = useForm({
  validationSchema: toTypedSchema(adminCinemaSchema),
  initialValues: createAdminCinemaValues(),
  validateOnMount: false,
})

function createField(field: AdminCinemaField) {
  return defineField(field, () => ({
    validateOnBlur: false,
    validateOnInput: false,
    validateOnChange: false,
    validateOnModelUpdate: Boolean(touchedFields.value[field] || submitCount.value > 0),
  }))
}

const [name, nameAttrs] = createField('name')
const [address, addressAttrs] = createField('address')
const [city, cityAttrs] = createField('city')

function cleanCity(value: string) {
  return value.normalize('NFC').trim().replace(/\s/g, ' ')
}

function cityKey(value: string) {
  return cleanCity(value).toLocaleLowerCase('vi-VN')
}

const cityOptions = computed(() => {
  const unique = new Map<string, string>()
  const currentCity = detail.data.value?.id === props.cinemaId ? detail.data.value?.city : undefined

  const candidates = [currentCity, ...(cityCatalog.data.value ?? []).map((cinema) => cinema.city)]

  for (const candidate of candidates) {
    if (!candidate) continue
    const label = cleanCity(candidate)
    if (label && !unique.has(cityKey(label))) unique.set(cityKey(label), label)
  }

  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'))
})

function canonicalCity(value: string) {
  const normalized = cleanCity(value)
  return cityOptions.value.find((option) => cityKey(option) === cityKey(normalized)) ?? normalized
}

function onFieldBlur(field: AdminCinemaField) {
  if (!interactionStarted.value && submitCount.value === 0) return

  touchedFields.value[field] = true
  setFieldTouched(field, true)
  void validateField(field)
}

function onCityBlur() {
  onFieldBlur('city')
}

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
      (touchedFields.value[field.name] || submitCount.value > 0
        ? errors.value[field.name]
        : undefined)
  }

  return result
})

watch([name, address, city], () => {
  requestError.value = ''
  serverErrors.value = {}
})

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

async function focusDialog() {
  await nextTick()

  document.getElementById('admin-cinema-close')?.focus()
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
    touchedFields.value = {}
    interactionStarted.value = false
    serverErrors.value = {}
    requestError.value = ''
    ready.value = true
    void focusDialog()
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
  void focusDialog()
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
      input: {
        ...toAdminCinemaRequest(validatedValues),
        city: canonicalCity(validatedValues.city),
      },
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

        <form
          v-if="ready"
          ref="formElement"
          class="admin-cinema-form"
          novalidate
          @pointerdown.capture="interactionStarted = true"
          @keydown.capture="interactionStarted = true"
          @input.capture="interactionStarted = true"
          @submit="submit"
        >
          <fieldset class="admin-cinema-form__fields" :disabled="busy || !canManage">
            <div v-for="field in fields" :key="field.name" class="admin-cinemas__field">
              <label v-if="field.name !== 'city'" :for="`admin-cinema-${field.name}`">
                {{ field.label }}
                <span class="admin-cinemas__error" aria-hidden="true">*</span>
              </label>
              <AppCreatableAutocomplete
                v-if="field.name === 'city'"
                id="admin-cinema-city"
                :model-value="city ?? ''"
                @update:model-value="city = $event"
                label="Thành phố"
                :options="cityOptions"
                :loading="cityCatalog.isFetching.value"
                :disabled="busy || !canManage"
                :error="visibleErrors.city"
                :maxlength="100"
                content-class="admin-reference-autocomplete admin-cinema-city-dropdown"
                helper-text="Chọn thành phố đã có hoặc nhập mới. Tên mới được lưu cùng rạp."
                required
                @blur="onCityBlur"
              />
              <input
                v-else
                v-bind="attributes[field.name].value"
                :id="`admin-cinema-${field.name}`"
                v-model="models[field.name].value"
                @blur="onFieldBlur(field.name)"
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
                v-if="field.name !== 'city' && visibleErrors[field.name]"
                :id="`admin-cinema-${field.name}-error`"
                class="admin-cinemas__error"
                role="alert"
              >
                {{ visibleErrors[field.name] }}
              </p>
            </div>
          </fieldset>
          <div v-if="cityCatalog.isError.value" class="admin-movies__feedback">
            <p class="admin-cinemas__muted">
              Chưa tải được gợi ý thành phố. Bạn vẫn có thể nhập tên trực tiếp.
            </p>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="busy || !canManage"
              :loading="cityCatalog.isFetching.value"
              @click="cityCatalog.refetch()"
            >
              Tải lại gợi ý
            </AppButton>
          </div>
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
