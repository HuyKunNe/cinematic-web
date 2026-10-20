<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { formatCinemaDateKey, formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import {
  useCreateAdminShowtimeMutation,
  useShowtimeCreationOptions,
} from '../api/admin-showtime-create'
import {
  instantToLocal,
  localToInstant,
  showtimeCreateErrorMessage,
  showtimeCreateSchema,
  toCreateShowtimeRequest,
  uncertainShowtimeCreation,
  type ShowtimeCreateValues,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage, type AdminShowtime } from '../schemas/admin-showtime.schema'

const auth = useAuthStore()

const canCreate = computed(
  () =>
    auth.isAuthenticated &&
    auth.isAdmin &&
    auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE) &&
    auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const form = reactive<ShowtimeCreateValues>({
  cinemaId: '',
  roomId: '',
  movieId: '',
  roomLayoutId: '',
  date: getCinemaDateKey(new Date().toISOString()),
  startTime: '',
  endsAt: '',
  basePrice: '',
})

const initialKey = JSON.stringify(form)

const formElement = ref<HTMLFormElement | null>(null)
const errors = ref<Partial<Record<keyof ShowtimeCreateValues, string>>>({})
const errorMessage = ref('')
const submitting = ref(false)
const writeBlocked = ref(false)
const created = ref<AdminShowtime | null>(null)
const endEdited = ref(false)

let scope = 0

const { cinemas, movies, rooms, layouts } = useShowtimeCreationOptions(
  canCreate,
  () => form.cinemaId,
  () => form.roomId,
)

const mutation = useCreateAdminShowtimeMutation()

const selectedCinema = computed(() => cinemas.data.value?.find((item) => item.id === form.cinemaId))

const selectedRoom = computed(() =>
  rooms.data.value?.find((item) => item.id === form.roomId && item.cinemaId === form.cinemaId),
)

const selectedMovie = computed(() => movies.data.value?.find((item) => item.id === form.movieId))

const selectedLayout = computed(() =>
  layouts.data.value?.find((item) => item.id === form.roomLayoutId && item.roomId === form.roomId),
)

const loadingOptions = computed(
  () =>
    cinemas.isFetching.value ||
    movies.isFetching.value ||
    rooms.isFetching.value ||
    layouts.isFetching.value,
)

const optionsError = computed(
  () => cinemas.error.value ?? movies.error.value ?? rooms.error.value ?? layouts.error.value,
)

const optionsReady = computed(
  () =>
    canCreate.value &&
    !loadingOptions.value &&
    cinemas.isSuccess.value &&
    movies.isSuccess.value &&
    rooms.isSuccess.value &&
    layouts.isSuccess.value &&
    Boolean(selectedCinema.value) &&
    Boolean(selectedRoom.value) &&
    Boolean(selectedMovie.value) &&
    Boolean(selectedLayout.value),
)

const locked = computed(() => submitting.value || writeBlocked.value || created.value !== null)

const dirty = computed(() => created.value === null && JSON.stringify(form) !== initialKey)

const listLocation = computed(() => ({
  name: ROUTE_NAMES.ADMIN_SHOWTIMES,
  query: { date: form.date },
}))

const fields = [
  { key: 'date', label: 'Ngày chiếu', type: 'date' },
  { key: 'startTime', label: 'Giờ bắt đầu', type: 'time' },
  { key: 'endsAt', label: 'Ngày giờ kết thúc', type: 'datetime-local' },
  { key: 'basePrice', label: 'Giá cơ bản (VND)', type: 'text' },
] as const

watch(
  () => form.cinemaId,
  () => {
    form.roomId = ''
    form.roomLayoutId = ''
  },
  { flush: 'sync' },
)

watch(
  () => form.roomId,
  () => {
    form.roomLayoutId = ''
  },
  { flush: 'sync' },
)

watch(
  [
    () => form.movieId,
    () => form.date,
    () => form.startTime,
    () => selectedMovie.value?.durationMinutes,
  ],
  () => {
    if (endEdited.value || locked.value) return

    const start = localToInstant(`${form.date}T${form.startTime}`)
    const duration = selectedMovie.value?.durationMinutes

    form.endsAt =
      start && duration
        ? instantToLocal(new Date(Date.parse(start) + duration * 60_000).toISOString())
        : ''
  },
)

watch(
  canCreate,
  () => {
    scope += 1
  },
  { flush: 'sync' },
)

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  () => dirty.value || submitting.value,
  (value) => {
    if (value) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

function confirmLeave() {
  if (submitting.value) return false

  return !dirty.value || window.confirm('Bỏ thông tin suất chiếu đang nhập để rời trang?')
}

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

onBeforeUnmount(() => {
  scope += 1
  window.removeEventListener('beforeunload', preventUnload)
})

async function reloadOptions() {
  if (!canCreate.value || locked.value || loadingOptions.value) return

  const requests = [cinemas.refetch(), movies.refetch()]

  if (selectedCinema.value) requests.push(rooms.refetch())
  if (selectedRoom.value) requests.push(layouts.refetch())

  await Promise.allSettled(requests)
}

async function submit() {
  if (!canCreate.value || locked.value) return

  errors.value = {}
  errorMessage.value = ''

  const result = showtimeCreateSchema.safeParse(form)

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof ShowtimeCreateValues
      errors.value[field] ??= issue.message
    }

    errorMessage.value = 'Kiểm tra các trường được đánh dấu.'

    await nextTick()
    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()

    return
  }

  if (!optionsReady.value) {
    errorMessage.value =
      'Các lựa chọn chưa sẵn sàng hoặc không còn hợp lệ. ' +
      'Hãy tải lại và chọn đúng rạp, phòng, phim, sơ đồ.'
    return
  }

  const token = scope
  submitting.value = true

  try {
    const input = toCreateShowtimeRequest(result.data)
    const response = await mutation.mutateAsync(input)

    if (token !== scope || !canCreate.value) return

    created.value = response
  } catch (error) {
    if (token !== scope || !canCreate.value) return

    writeBlocked.value = uncertainShowtimeCreation(error)
    errorMessage.value = showtimeCreateErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section
    class="admin-reference is-showtime-form"
    data-reference="admin-showtime-form"
    aria-labelledby="showtime-create-title"
  >
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Lịch vận hành</p>
        <h1 id="showtime-create-title" tabindex="-1">Tạo suất chiếu</h1>
        <p class="admin-reference__description">Chọn rạp, phòng, phim và sơ đồ đã xuất bản.</p>
      </div>

      <RouterLink v-if="!submitting" class="admin-reference__link-button" :to="listLocation">
        Quay lại danh sách
      </RouterLink>
    </header>

    <p v-if="!canCreate" class="showtime-create__error" role="alert">
      Form cần quyền showtime:manage để tạo suất chiếu và inventory:manage để đọc các phiên bản sơ
      đồ.
    </p>

    <template v-else>
      <p v-if="created" class="admin-reference__note" role="status">
        Đã tạo suất chiếu
        {{ formatCinemaDateKey(getCinemaDateKey(created.startsAt)) }}
        lúc {{ formatCinemaTime(created.startsAt) }}. Trạng thái: Đã lên lịch. Suất chiếu chưa mở
        bán. Mã suất chiếu: {{ created.id }}.
      </p>

      <p v-if="writeBlocked" class="admin-reference__note" role="alert">
        Chưa xác nhận được kết quả tạo suất chiếu. Mở danh sách và kiểm tra lịch của phòng trước khi
        tạo thêm. Trang không tự gửi lại yêu cầu.
      </p>

      <p v-if="errorMessage" class="showtime-create__error" role="alert">
        {{ errorMessage }}
      </p>

      <p v-if="optionsError" class="showtime-create__error" role="alert">
        {{
          showtimeErrorMessage(optionsError, 'Không thể tải lựa chọn. Hãy chọn “Tải lại lựa chọn”.')
        }}
      </p>

      <form
        ref="formElement"
        class="admin-reference__form-layout"
        novalidate
        @submit.prevent="submit"
      >
        <section
          class="admin-reference__panel admin-reference__form"
          aria-labelledby="showtime-form-title"
        >
          <header>
            <h2 id="showtime-form-title">Thông tin suất chiếu</h2>
            <p class="admin-reference__description">
              Các trường có dấu * là bắt buộc. Thời gian theo giờ Việt Nam.
            </p>
          </header>

          <fieldset class="admin-reference__form-fields" :disabled="locked">
            <legend class="admin-visually-hidden">Thông tin tạo suất chiếu</legend>

            <label class="admin-reference__field">
              <span>Rạp *</span>
              <select
                v-model="form.cinemaId"
                class="admin-reference__input"
                required
                :disabled="cinemas.isFetching.value"
                :aria-invalid="Boolean(errors.cinemaId)"
                :aria-describedby="errors.cinemaId ? 'create-cinema-error' : undefined"
              >
                <option value="">Chọn rạp</option>
                <option v-for="item in cinemas.data.value ?? []" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <span v-if="errors.cinemaId" id="create-cinema-error" class="showtime-create__error">
                {{ errors.cinemaId }}
              </span>
            </label>

            <label class="admin-reference__field">
              <span>Phòng chiếu *</span>
              <select
                v-model="form.roomId"
                class="admin-reference__input"
                required
                :disabled="!selectedCinema || rooms.isFetching.value"
                :aria-invalid="Boolean(errors.roomId)"
                :aria-describedby="errors.roomId ? 'create-room-error' : undefined"
              >
                <option value="">Chọn phòng</option>
                <option v-for="item in rooms.data.value ?? []" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <span v-if="errors.roomId" id="create-room-error" class="showtime-create__error">
                {{ errors.roomId }}
              </span>
            </label>

            <label class="admin-reference__field is-wide">
              <span>Phim *</span>
              <select
                v-model="form.movieId"
                class="admin-reference__input"
                required
                :disabled="movies.isFetching.value"
                :aria-invalid="Boolean(errors.movieId)"
                :aria-describedby="errors.movieId ? 'create-movie-error' : undefined"
              >
                <option value="">Chọn phim</option>
                <option v-for="item in movies.data.value ?? []" :key="item.id" :value="item.id">
                  {{ item.title }}
                </option>
              </select>
              <span v-if="errors.movieId" id="create-movie-error" class="showtime-create__error">
                {{ errors.movieId }}
              </span>
            </label>

            <label v-for="field in fields" :key="field.key" class="admin-reference__field">
              <span>{{ field.label }} *</span>
              <input
                v-model="form[field.key]"
                class="admin-reference__input"
                :type="field.type"
                :step="field.key === 'startTime' || field.key === 'endsAt' ? 60 : undefined"
                :inputmode="field.key === 'basePrice' ? 'decimal' : undefined"
                :maxlength="field.key === 'basePrice' ? 13 : undefined"
                required
                :aria-invalid="Boolean(errors[field.key])"
                :aria-describedby="errors[field.key] ? `create-${field.key}-error` : undefined"
                @input="field.key === 'endsAt' && (endEdited = true)"
              />
              <span
                v-if="errors[field.key]"
                :id="`create-${field.key}-error`"
                class="showtime-create__error"
              >
                {{ errors[field.key] }}
              </span>
            </label>

            <label class="admin-reference__field">
              <span>Thời lượng phim</span>
              <input
                class="admin-reference__input"
                type="text"
                readonly
                :value="
                  selectedMovie?.durationMinutes
                    ? `${selectedMovie.durationMinutes} phút`
                    : 'Chưa có thời lượng'
                "
              />
            </label>

            <label class="admin-reference__field is-wide">
              <span>Sơ đồ phòng đã xuất bản *</span>
              <select
                v-model="form.roomLayoutId"
                class="admin-reference__input"
                required
                :disabled="!selectedRoom || layouts.isFetching.value"
                :aria-invalid="Boolean(errors.roomLayoutId)"
                :aria-describedby="errors.roomLayoutId ? 'create-layout-error' : undefined"
              >
                <option value="">Chọn phiên bản sơ đồ</option>
                <option v-for="item in layouts.data.value ?? []" :key="item.id" :value="item.id">
                  Phiên bản {{ item.layoutVersion }} · Đã xuất bản
                </option>
              </select>
              <span
                v-if="errors.roomLayoutId"
                id="create-layout-error"
                class="showtime-create__error"
              >
                {{ errors.roomLayoutId }}
              </span>
            </label>
          </fieldset>

          <p
            v-if="
              selectedRoom &&
              layouts.isSuccess.value &&
              !layouts.isFetching.value &&
              layouts.data.value?.length === 0
            "
            class="admin-reference__description"
          >
            Phòng chưa có sơ đồ đã xuất bản. Cần xuất bản sơ đồ trước khi tạo suất chiếu theo luồng
            này.
          </p>

          <p class="admin-reference__description">
            Giờ kết thúc được gợi ý từ thời lượng phim. Sau khi bạn sửa giờ kết thúc, form giữ giá
            trị nhập. Giá từng loại ghế do backend tính từ giá cơ bản.
          </p>

          <footer class="admin-reference__form-actions">
            <AppButton
              variant="secondary"
              :disabled="locked || loadingOptions"
              :loading="loadingOptions"
              @click="reloadOptions"
            >
              Tải lại lựa chọn
            </AppButton>

            <AppButton type="submit" :disabled="locked || !optionsReady" :loading="submitting">
              Tạo suất chiếu
            </AppButton>
          </footer>
        </section>

        <aside
          class="admin-reference__panel admin-reference__preview"
          aria-labelledby="showtime-preview-title"
        >
          <p class="admin-reference__eyebrow">Xem trước</p>
          <h2 id="showtime-preview-title">Thông tin lịch chiếu</h2>

          <dl>
            <div>
              <dt>Phim</dt>
              <dd>{{ selectedMovie?.title ?? 'Chưa chọn phim' }}</dd>
            </div>
            <div>
              <dt>Rạp</dt>
              <dd>{{ selectedCinema?.name ?? 'Chưa chọn rạp' }}</dd>
            </div>
            <div>
              <dt>Phòng</dt>
              <dd>{{ selectedRoom?.name ?? 'Chưa chọn phòng' }}</dd>
            </div>
            <div>
              <dt>Ngày</dt>
              <dd>{{ formatCinemaDateKey(form.date) || 'Chưa chọn ngày' }}</dd>
            </div>
            <div>
              <dt>Giờ bắt đầu</dt>
              <dd>{{ form.startTime || 'Chưa chọn giờ' }}</dd>
            </div>
            <div>
              <dt>Kết thúc</dt>
              <dd>{{ form.endsAt.replace('T', ' ') || 'Chưa có thời gian' }}</dd>
            </div>
            <div>
              <dt>Sơ đồ</dt>
              <dd>
                {{
                  selectedLayout
                    ? `Phiên bản ${selectedLayout.layoutVersion}`
                    : 'Chưa chọn phiên bản'
                }}
              </dd>
            </div>
            <div>
              <dt>Giá cơ bản</dt>
              <dd>{{ form.basePrice ? `${form.basePrice} VND` : 'Chưa nhập giá' }}</dd>
            </div>
          </dl>
        </aside>
      </form>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-showtime-form'] .showtime-create__error {
  color: var(--color-error);
}

[data-reference='admin-showtime-form'] [aria-invalid='true'] {
  border-color: var(--color-error);
}

[data-reference='admin-showtime-form'] :is(input, select, button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
