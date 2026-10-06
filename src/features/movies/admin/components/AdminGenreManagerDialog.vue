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
import { useAdminMovieGenresQuery } from '../api/admin-movie-queries'
import { useAdminGenreDetailQuery, useSaveAdminGenreMutation } from '../api/admin-genre-queries'
import {
  adminGenreErrorMessage,
  adminGenreSchema,
  createAdminGenreValues,
  toAdminGenreRequest,
} from '../schemas/admin-genre.schema'
import { isApiError } from '../schemas/admin-movie.schema'

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.MOVIE_MANAGE),
)

const selectedGenreId = ref<string | null>(null)
const draftReady = ref(true)
const requestError = ref('')
const successMessage = ref('')
const formElement = ref<HTMLFormElement | null>(null)

const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const genresQuery = useAdminMovieGenresQuery(canManage)

const detailQuery = useAdminGenreDetailQuery(() => selectedGenreId.value ?? '', canManage)

const mutation = useSaveAdminGenreMutation()

const { errors, isSubmitting, submitCount, resetForm, defineField, isFieldTouched, handleSubmit } =
  useForm({
    validationSchema: toTypedSchema(adminGenreSchema),
    initialValues: createAdminGenreValues(),
    validateOnMount: false,
  })

type GenreField = 'name' | 'description'
const serverFieldErrors = ref<Partial<Record<GenreField, string>>>({})

const [name, nameAttrs] = defineField('name', (state) => ({
  validateOnBlur: true,
  validateOnInput: false,
  validateOnChange: false,
  validateOnModelUpdate: state.touched || submitCount.value > 0,
}))

const [description, descriptionAttrs] = defineField('description', (state) => ({
  validateOnBlur: true,
  validateOnInput: false,
  validateOnChange: false,
  validateOnModelUpdate: state.touched || submitCount.value > 0,
}))

const visibleErrors = computed(() => ({
  name:
    serverFieldErrors.value.name ??
    (isFieldTouched('name') || submitCount.value > 0 ? errors.value.name : undefined),
  description:
    serverFieldErrors.value.description ??
    (isFieldTouched('description') || submitCount.value > 0 ? errors.value.description : undefined),
}))

watch([name, description], ([newName, newDescription], [oldName, oldDescription]) => {
  requestError.value = ''

  if (newName !== oldName) serverFieldErrors.value.name = undefined
  if (newDescription !== oldDescription) serverFieldErrors.value.description = undefined
})

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

const genreRows = computed(() =>
  (genresQuery.data.value ?? [])
    .map((genre) => ({
      id: genre.id ?? '',
      name: genre.name ?? '',
      description: genre.description ?? '',
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'vi')),
)

async function focusName() {
  await nextTick()

  const input = document.getElementById('admin-genre-name')

  if (input instanceof HTMLInputElement && !input.disabled) {
    input.focus()
  } else {
    document.getElementById('admin-genre-close')?.focus()
  }
}

function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  void focusName()
}

watch(
  [detailQuery.data, detailQuery.isFetching, detailQuery.isSuccess, selectedGenreId],
  ([genre, fetching, success, id]) => {
    if (draftReady.value || !id || fetching || !success || genre?.id !== id) {
      return
    }

    resetForm({ values: createAdminGenreValues(genre) })
    draftReady.value = true
    void focusName()
  },
)

function resetDraft() {
  selectedGenreId.value = null
  draftReady.value = true
  serverFieldErrors.value = {}
  requestError.value = ''
  successMessage.value = ''
  resetForm({ values: createAdminGenreValues() })
}

function startCreate() {
  if (busy.value || !canManage.value) return

  resetDraft()
  void focusName()
}

function startEdit(id: string) {
  if (!id || busy.value || !canManage.value) return

  const sameGenre = selectedGenreId.value === id

  serverFieldErrors.value = {}
  requestError.value = ''
  successMessage.value = ''
  draftReady.value = false
  resetForm({ values: createAdminGenreValues() })
  selectedGenreId.value = id

  if (sameGenre) void detailQuery.refetch()
}

function close() {
  if (!busy.value) emit('close')
}

function onOpenChange(open: boolean) {
  if (!open) close()
}

function preventDuringSave(event: Event) {
  if (busy.value) event.preventDefault()
}

function restoreFocus(event: Event) {
  event.preventDefault()

  const target = returnFocus?.isConnected
    ? returnFocus
    : document.getElementById('admin-movies-title')

  target?.focus()
}

const save = handleSubmit(
  async (validatedValues) => {
    requestError.value = ''
    successMessage.value = ''

    if (!canManage.value || !draftReady.value || mutation.isPending.value) {
      requestError.value = 'Chưa đủ điều kiện để lưu thể loại.'
      return
    }

    const genreId = selectedGenreId.value

    try {
      await mutation.mutateAsync({
        genreId,
        input: toAdminGenreRequest(validatedValues),
      })
    } catch (error) {
      let hasFieldError = false

      if (isApiError(error)) {
        if (error.code === 'GENRE_ALREADY_EXISTS') {
          serverFieldErrors.value.name = 'Tên thể loại đã được sử dụng.'
          hasFieldError = true
        }

        for (const item of error.fieldErrors) {
          if ((item.field === 'name' || item.field === 'description') && item.message) {
            serverFieldErrors.value[item.field] = item.message
            hasFieldError = true
          }
        }
      }
      if (!hasFieldError) {
        requestError.value = adminGenreErrorMessage(error, 'Không thể lưu thể loại.')
      }

      await nextTick()
      formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    resetDraft()

    successMessage.value = genreId ? 'Đã cập nhật thể loại.' : 'Đã thêm thể loại.'

    await focusName()
  },
  async () => {
    await nextTick()

    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  },
)

function submit(event: Event) {
  requestError.value = ''
  successMessage.value = ''
  serverFieldErrors.value = {}
  return save(event)
}
</script>

<template>
  <DialogRoot :open="true" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="admin-movie-dialog__overlay" />

      <DialogContent
        class="admin-movie-dialog admin-genre-manager"
        @open-auto-focus="onOpenAutoFocus"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
        @close-auto-focus="restoreFocus"
      >
        <div class="admin-movie-dialog__heading">
          <div>
            <DialogTitle class="admin-movie-dialog__title"> Quản lý thể loại </DialogTitle>

            <DialogDescription class="admin-movies__muted">
              Tạo và cập nhật thể loại để sử dụng khi quản lý phim.
            </DialogDescription>
          </div>

          <AppButton
            id="admin-genre-close"
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="close"
          >
            Đóng
          </AppButton>
        </div>

        <p v-if="!canManage" class="admin-movies__error" role="alert">
          Tài khoản không còn quyền quản lý thể loại.
        </p>

        <p v-if="successMessage" class="admin-movies__success" role="status">
          {{ successMessage }}
        </p>

        <section class="admin-genre-manager__editor" aria-labelledby="admin-genre-editor-title">
          <div class="admin-genre-manager__toolbar">
            <h2 id="admin-genre-editor-title" class="admin-genre-manager__subheading">
              {{ selectedGenreId ? 'Sửa thể loại' : 'Thêm thể loại' }}
            </h2>

            <AppButton
              v-if="selectedGenreId"
              variant="secondary"
              size="sm"
              :disabled="busy || !canManage"
              @click="startCreate"
            >
              Thêm mới
            </AppButton>
          </div>

          <div v-if="!draftReady" class="admin-movies__feedback">
            <p v-if="detailQuery.isFetching.value" role="status">Đang tải chi tiết thể loại…</p>

            <template v-else-if="detailQuery.isError.value">
              <p class="admin-movies__error" role="alert">
                {{ adminGenreErrorMessage(detailQuery.error.value) }}
              </p>

              <AppButton variant="secondary" :disabled="!canManage" @click="detailQuery.refetch()">
                Thử lại
              </AppButton>
            </template>

            <p v-else-if="detailQuery.isSuccess.value" class="admin-movies__error" role="alert">
              Không nhận được chi tiết thể loại hợp lệ.
            </p>
          </div>

          <form
            v-if="draftReady"
            ref="formElement"
            class="admin-genre-manager__form"
            novalidate
            @submit="submit"
          >
            <fieldset class="admin-movie-form__fields" :disabled="busy || !canManage">
              <div class="admin-movie-form__field">
                <label for="admin-genre-name">
                  Tên thể loại
                  <span class="admin-movies__error" aria-hidden="true">*</span>
                </label>

                <input
                  id="admin-genre-name"
                  class="admin-movie-form__input"
                  type="text"
                  maxlength="100"
                  required
                  v-model="name"
                  v-bind="nameAttrs"
                  :aria-invalid="Boolean(visibleErrors.name)"
                  :aria-describedby="visibleErrors.name ? 'admin-genre-name-error' : undefined"
                />

                <p
                  v-if="visibleErrors.name"
                  id="admin-genre-name-error"
                  class="admin-movies__error"
                  role="alert"
                >
                  {{ visibleErrors.name }}
                </p>
              </div>

              <div class="admin-movie-form__field">
                <label for="admin-genre-description">Mô tả</label>

                <textarea
                  id="admin-genre-description"
                  class="admin-movie-form__input admin-movie-form__textarea"
                  maxlength="500"
                  v-model="description"
                  v-bind="descriptionAttrs"
                  :aria-invalid="Boolean(visibleErrors.description)"
                  :aria-describedby="
                    visibleErrors.description ? 'admin-genre-description-error' : undefined
                  "
                />

                <p
                   v-if="visibleErrors.description"
                  id="admin-genre-description-error"
                  class="admin-movies__error"
                  role="alert"
                >
                   {{ visibleErrors.description }}
                </p>
              </div>
            </fieldset>

            <p v-if="requestError" class="admin-movies__error" role="alert">
              {{ requestError }}
            </p>

            <div class="admin-movie-form__actions">
              <AppButton variant="secondary" :disabled="busy || !canManage" @click="startCreate">
                {{ selectedGenreId ? 'Bỏ sửa' : 'Nhập lại' }}
              </AppButton>

              <AppButton
                type="submit"
                :loading="busy"
                :disabled="!canManage || !draftReady || busy"
              >
                {{ selectedGenreId ? 'Lưu thay đổi' : 'Thêm thể loại' }}
              </AppButton>
            </div>
          </form>
        </section>

        <section class="admin-genre-manager__list" aria-labelledby="admin-genre-list-title">
          <div class="admin-genre-manager__toolbar">
            <h2 id="admin-genre-list-title" class="admin-genre-manager__subheading">
              Danh sách thể loại
            </h2>

            <AppButton
              variant="ghost"
              size="sm"
              :loading="genresQuery.isFetching.value"
              :disabled="busy || !canManage"
              @click="genresQuery.refetch()"
            >
              Tải lại
            </AppButton>
          </div>

          <p v-if="genresQuery.isFetching.value" role="status">Đang tải danh sách thể loại…</p>

          <div v-if="genresQuery.isError.value" class="admin-movies__feedback">
            <p class="admin-movies__error" role="alert">
              {{ adminGenreErrorMessage(genresQuery.error.value) }}
            </p>

            <p v-if="genresQuery.data.value" class="admin-movies__muted">
              Đang hiển thị danh sách từ lần tải trước.
            </p>
          </div>

          <div
            v-if="genresQuery.data.value"
            class="admin-movies__table-container"
            role="region"
            aria-label="Danh sách thể loại"
            tabindex="0"
            :aria-busy="genresQuery.isFetching.value"
          >
            <table class="admin-movies__table">
              <caption>
                {{
                  genreRows.length
                }}
                thể loại
              </caption>

              <thead>
                <tr>
                  <th scope="col">Tên thể loại</th>
                  <th scope="col">Mô tả</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(genre, index) in genreRows" :key="genre.id || `missing-genre-${index}`">
                  <th scope="row" class="admin-genre-manager__name">
                    {{ genre.name || 'Chưa có tên' }}
                  </th>

                  <td class="admin-genre-manager__description">
                    {{ genre.description || '—' }}
                  </td>

                  <td>
                    <AppButton
                      variant="secondary"
                      size="sm"
                      :disabled="busy || !canManage || !genre.id"
                      :loading="selectedGenreId === genre.id && detailQuery.isFetching.value"
                      :aria-label="`Sửa thể loại ${genre.name}`"
                      @click="startEdit(genre.id)"
                    >
                      Sửa
                    </AppButton>
                  </td>
                </tr>

                <tr v-if="!genreRows.length">
                  <td colspan="3" class="admin-movies__empty">
                    Chưa có thể loại. Thêm thể loại bằng form phía trên.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
