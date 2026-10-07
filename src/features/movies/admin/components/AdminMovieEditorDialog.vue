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
import AppSelect from '@/components/ui/AppSelect.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type { MovieResponse } from '@/services/api/generated/movie-service/model'
import {
  useAdminMovieDetailQuery,
  useAdminMovieGenresQuery,
  useSaveAdminMovieMutation,
} from '../api/admin-movie-queries'
import {
  adminMovieErrorMessage,
  adminMovieSchema,
  createAdminMovieFormValues,
  isApiError,
  isMovieStatus,
  movieStatusOptions,
  toAdminMovieRequest,
} from '../schemas/admin-movie.schema'

const props = defineProps<{
  movieId: string | null
}>()

const emit = defineEmits<{
  close: []
  saved: [movie: MovieResponse]
}>()

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.MOVIE_MANAGE),
)

const detail = useAdminMovieDetailQuery(() => props.movieId ?? '', canManage)
const genresQuery = useAdminMovieGenresQuery(canManage)
const mutation = useSaveAdminMovieMutation()

const ready = ref(props.movieId === null)
const requestError = ref('')
const formElement = ref<HTMLFormElement | null>(null)
const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const {
  values,
  submitCount,
  errors,
  isSubmitting,
  setFieldValue,
  validateField,
  resetForm,
  handleSubmit,
} = useForm({
  validationSchema: toTypedSchema(adminMovieSchema),
  initialValues: createAdminMovieFormValues(),
  validateOnMount: false,
})

watch(
  [detail.data, detail.isFetching, detail.isSuccess],
  ([movie, fetching, success]) => {
    if (ready.value || fetching || !success || !movie || movie.id !== props.movieId) {
      return
    }

    resetForm({ values: createAdminMovieFormValues(movie) })
    touched.value = {}
    serverErrors.value = {}
    requestError.value = ''
    ready.value = true
  },
  { immediate: true },
)

const genres = computed(() =>
  (genresQuery.data.value ?? []).flatMap((genre) =>
    genre.id && genre.name ? [{ id: genre.id, name: genre.name }] : [],
  ),
)

const selectedGenresExist = computed(() => {
  const availableIds = new Set(genres.value.map((genre) => genre.id))

  return (values.genreIds ?? []).every((id) => availableIds.has(id))
})

const busy = computed(() => isSubmitting.value || mutation.isPending.value)

const formAvailable = computed(
  () =>
    ready.value &&
    canManage.value &&
    genresQuery.isSuccess.value &&
    !genresQuery.isFetching.value &&
    genres.value.length > 0 &&
    selectedGenresExist.value,
)

const inputFields = [
  {
    name: 'title',
    label: 'Tên phim',
    type: 'text',
    maxLength: 255,
    required: true,
  },
  {
    name: 'durationMinutes',
    label: 'Thời lượng (phút)',
    type: 'text',
    maxLength: 10,
    required: true,
  },
  {
    name: 'releaseDate',
    label: 'Ngày phát hành',
    type: 'date',
    maxLength: undefined,
    required: false,
  },
  {
    name: 'posterUrl',
    label: 'Đường dẫn poster',
    type: 'text',
    maxLength: 500,
    required: false,
  },
  {
    name: 'trailerUrl',
    label: 'Đường dẫn trailer',
    type: 'text',
    maxLength: 500,
    required: false,
  },
] as const

const formFieldNames = [
  'title',
  'description',
  'durationMinutes',
  'releaseDate',
  'posterUrl',
  'trailerUrl',
  'status',
  'genreIds',
] as const

type MovieFormField = (typeof formFieldNames)[number]

const touched = ref<Partial<Record<MovieFormField, boolean>>>({})
const serverErrors = ref<Partial<Record<MovieFormField, string>>>({})

const visibleErrors = computed(() => {
  const result: Partial<Record<MovieFormField, string>> = {}

  for (const field of formFieldNames) {
    result[field] =
      serverErrors.value[field] ??
      (touched.value[field] || submitCount.value > 0 ? errors.value[field] : undefined)
  }

  return result
})

watch(
  () => values,
  () => {
    serverErrors.value = {}
    requestError.value = ''
  },
  { deep: true },
)

function shouldValidate(field: MovieFormField) {
  return Boolean(touched.value[field] || submitCount.value > 0)
}

function blurField(field: MovieFormField) {
  touched.value[field] = true
  void validateField(field)
}

function updateInput(name: (typeof inputFields)[number]['name'], event: Event) {
  setFieldValue(name, (event.target as HTMLInputElement).value, shouldValidate(name))
}

function updateDescription(event: Event) {
  setFieldValue(
    'description',
    (event.target as HTMLTextAreaElement).value,
    shouldValidate('description'),
  )
}

function changeStatus(value: string) {
  if (!isMovieStatus(value)) return
  touched.value.status = true
  setFieldValue('status', value)
}

function changeGenre(id: string, event: Event) {
  const selected = new Set(values.genreIds ?? [])

  if ((event.target as HTMLInputElement).checked) {
    selected.add(id)
  } else {
    selected.delete(id)
  }
  touched.value.genreIds = true
  setFieldValue('genreIds', [...selected])
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

    if (!formAvailable.value || mutation.isPending.value) {
      requestError.value = 'Chưa đủ điều kiện để lưu phim.'
      return
    }

    let savedMovie: MovieResponse

    try {
      savedMovie = await mutation.mutateAsync({
        movieId: props.movieId,
        input: toAdminMovieRequest(validatedValues),
      })
    } catch (error) {
      if (isApiError(error)) {
        for (const item of error.fieldErrors) {
          const field = formFieldNames.find(
            (name) =>
              name === item.field || (name === 'genreIds' && item.field.startsWith('genreIds[')),
          )

          if (field) serverErrors.value[field] = item.message
        }
      }
      if (!Object.values(serverErrors.value).some(Boolean)) {
        requestError.value = adminMovieErrorMessage(error, 'Không thể lưu phim.')
      }
      return
    }

    emit('saved', savedMovie)
  },
  async () => {
    await nextTick()

    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  },
)

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
      <DialogOverlay class="admin-movie-dialog__overlay" />

      <DialogContent
        class="admin-movie-dialog"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
        @close-auto-focus="restoreFocus"
      >
        <div class="admin-movie-dialog__heading">
          <div>
            <DialogTitle class="admin-movie-dialog__title">
              {{ movieId ? 'Sửa phim' : 'Thêm phim' }}
            </DialogTitle>

            <DialogDescription class="admin-movies__muted">
              Thông tin cơ bản, trạng thái và thể loại của phim.
            </DialogDescription>
          </div>

          <AppButton variant="ghost" size="sm" :disabled="busy" @click="close"> Đóng </AppButton>
        </div>

        <p v-if="!canManage" class="admin-movies__error" role="alert">
          Tài khoản không còn quyền quản lý phim.
        </p>

        <div v-if="!ready" class="admin-movies__feedback">
          <p v-if="detail.isFetching.value" role="status">Đang tải chi tiết phim…</p>

          <template v-else-if="detail.isError.value">
            <p class="admin-movies__error" role="alert">
              {{ adminMovieErrorMessage(detail.error.value) }}
            </p>
            <AppButton variant="secondary" :disabled="!canManage" @click="detail.refetch()">
              Thử lại
            </AppButton>
          </template>

          <p v-else-if="detail.isSuccess.value" class="admin-movies__error" role="alert">
            Không nhận được chi tiết phim hợp lệ.
          </p>
        </div>

        <div class="admin-movies__feedback">
          <p v-if="genresQuery.isFetching.value" role="status">Đang tải thể loại…</p>

          <template v-else-if="genresQuery.isError.value">
            <p class="admin-movies__error" role="alert">
              {{ adminMovieErrorMessage(genresQuery.error.value, 'Không thể tải thể loại.') }}
            </p>
            <AppButton
              variant="secondary"
              :disabled="busy || !canManage"
              @click="genresQuery.refetch()"
            >
              Tải lại thể loại
            </AppButton>
          </template>

          <p v-else-if="genresQuery.isSuccess.value && !genres.length">
            Chưa có thể loại. Cần tạo thể loại trước khi lưu phim.
          </p>
        </div>

        <form v-if="ready" ref="formElement" class="admin-movie-form" novalidate @submit="submit">
          <fieldset class="admin-movie-form__fields" :disabled="busy || !canManage">
            <div class="admin-movie-form__grid">
              <div v-for="field in inputFields" :key="field.name" class="admin-movie-form__field">
                <label :for="`admin-movie-${field.name}`">
                  {{ field.label }}
                  <span v-if="field.required" class="admin-movies__error" aria-hidden="true"
                    >*</span
                  >
                </label>

                <input
                  :id="`admin-movie-${field.name}`"
                  class="admin-movie-form__input"
                  :type="field.type"
                  :value="values[field.name] ?? ''"
                  :maxlength="field.maxLength"
                  :required="field.required"
                  :inputmode="field.name === 'durationMinutes' ? 'numeric' : undefined"
                  :aria-invalid="Boolean(errors[field.name])"
                  :aria-describedby="
                    errors[field.name] ? `admin-movie-${field.name}-error` : undefined
                  "
                  @input="updateInput(field.name, $event)"
                  @blur="blurField(field.name)"
                />

                <p
                  v-if="errors[field.name]"
                  :id="`admin-movie-${field.name}-error`"
                  class="admin-movies__error"
                  role="alert"
                >
                  {{ errors[field.name] }}
                </p>
              </div>

              <AppSelect
                id="admin-movie-status"
                label="Trạng thái"
                :model-value="values.status ?? ''"
                :options="movieStatusOptions"
                :error="errors.status"
                :disabled="busy || !canManage"
                required
                @update:model-value="changeStatus"
              />
            </div>

            <div class="admin-movie-form__field">
              <label for="admin-movie-description">Mô tả</label>

              <textarea
                id="admin-movie-description"
                class="admin-movie-form__input admin-movie-form__textarea"
                :value="values.description ?? ''"
                maxlength="5000"
                :aria-invalid="Boolean(errors.description)"
                :aria-describedby="errors.description ? 'admin-movie-description-error' : undefined"
                @input="updateDescription"
                @blur="blurField('description')"
              />

              <p
                v-if="errors.description"
                id="admin-movie-description-error"
                class="admin-movies__error"
                role="alert"
              >
                {{ errors.description }}
              </p>
            </div>

            <fieldset
              class="admin-movie-form__genres"
              tabindex="-1"
              :aria-invalid="Boolean(errors.genreIds)"
              :aria-describedby="errors.genreIds ? 'admin-movie-genres-error' : undefined"
            >
              <legend>
                Thể loại
                <span class="admin-movies__error" aria-hidden="true">*</span>
              </legend>

              <div class="admin-movie-form__genre-options">
                <label v-for="genre in genres" :key="genre.id" class="admin-movie-form__checkbox">
                  <input
                    type="checkbox"
                    :checked="(values.genreIds ?? []).includes(genre.id)"
                    @change="changeGenre(genre.id, $event)"
                  />
                  <span>{{ genre.name }}</span>
                </label>
              </div>

              <p
                v-if="errors.genreIds"
                id="admin-movie-genres-error"
                class="admin-movies__error"
                role="alert"
              >
                {{ errors.genreIds }}
              </p>
            </fieldset>
          </fieldset>

          <div v-if="!selectedGenresExist" class="admin-movies__feedback">
            <p class="admin-movies__error" role="alert">
              Phim đang tham chiếu thể loại không có trong danh sách hiện tại. Hãy tải lại thể loại
              hoặc mở lại form.
            </p>
            <AppButton
              variant="secondary"
              :disabled="busy || genresQuery.isFetching.value || !canManage"
              @click="genresQuery.refetch()"
            >
              Tải lại thể loại
            </AppButton>
          </div>

          <p v-if="requestError" class="admin-movies__error" role="alert">
            {{ requestError }}
          </p>

          <div class="admin-movie-form__actions">
            <AppButton variant="secondary" :disabled="busy" @click="close"> Hủy </AppButton>

            <AppButton type="submit" :loading="busy" :disabled="!formAvailable || busy">
              {{ movieId ? 'Lưu thay đổi' : 'Thêm phim' }}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
