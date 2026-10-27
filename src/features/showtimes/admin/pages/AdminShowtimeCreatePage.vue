<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { getCinemaDateKey } from '@/utils/cinema-time'
import type { CreateShowtimeRequest } from '@/services/api/generated/inventory-service/model/createShowtimeRequest'
import {
  isShowtimeCreationRejected,
  screeningVersionLabel,
  showtimeCreationErrorMessage,
  showtimeCreationStatus,
  useCreateAdminShowtimeMutation,
  useShowtimeCreationOptions,
} from '../api/admin-showtime-create'
import { useAdminShowtimePublishedLayoutQuery } from '../api/admin-showtime-layout-query'
import {
  getShowtimeStartError,
  instantToLocal,
  localToInstant,
  showtimeBreakMinutesSchema,
  showtimeDraftSchema,
  type CreatedScheduledShowtime,
  type ShowtimeDraftValues,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'
import AdminShowtimePublishedLayout from '../components/AdminShowtimePublishedLayout.vue'

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE),
)
const canViewInventory = computed(() => auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE))
const canReadLayout = computed(() => canManage.value && canViewInventory.value)

const form = reactive<ShowtimeDraftValues>({
  cinemaId: '',
  roomId: '',
  movieId: '',
  movieScreeningVersionId: '',
  breakMinutes: '',
  date: getCinemaDateKey(new Date().toISOString()),
  startTime: '',
})

const initialKey = JSON.stringify(form)
const created = ref<CreatedScheduledShowtime | null>(null)
const submitting = ref(false)
const refreshing = ref(false)
const requiresReview = ref(false)
const uncertainResult = ref(false)
const requestError = ref('')

const locked = computed(
  () => submitting.value || refreshing.value || uncertainResult.value || created.value !== null,
)

const { cinemas, movies, rooms, screeningVersions } = useShowtimeCreationOptions(
  () => canManage.value && created.value === null,
  () => form.cinemaId,
  () => form.movieId,
)
const creation = useCreateAdminShowtimeMutation(canManage)

const selectedCinema = computed(() =>
  cinemas.isSuccess.value && !cinemas.isFetching.value
    ? cinemas.data.value?.find((item) => item.id === form.cinemaId)
    : undefined,
)
const selectedRoom = computed(() =>
  selectedCinema.value && rooms.isSuccess.value && !rooms.isFetching.value
    ? rooms.data.value?.find(
        (item) => item.id === form.roomId && item.cinemaId === selectedCinema.value?.id,
      )
    : undefined,
)
const selectedMovie = computed(() =>
  movies.isSuccess.value && !movies.isFetching.value
    ? movies.data.value?.find((item) => item.id === form.movieId)
    : undefined,
)

const compatibleVersions = computed(() => {
  const movie = selectedMovie.value
  const room = selectedRoom.value

  if (!movie || !room || !screeningVersions.isSuccess.value || screeningVersions.isFetching.value) {
    return []
  }

  return (screeningVersions.data.value ?? []).filter(
    (version) =>
      version.movieId === movie.id &&
      version.active &&
      room.contentFormats.some((format) => format === version.contentFormat),
  )
})
const selectedVersion = computed(() =>
  compatibleVersions.value.find((item) => item.id === form.movieScreeningVersionId),
)

const layoutQuery = useAdminShowtimePublishedLayoutQuery(
  () => form.roomId,
  () => canReadLayout.value && Boolean(selectedRoom.value) && created.value === null,
)
const layoutReady = computed(() => {
  const room = selectedRoom.value
  const layout = layoutQuery.data.value

  return Boolean(
    canReadLayout.value &&
    room &&
    layoutQuery.isSuccess.value &&
    !layoutQuery.isFetching.value &&
    (layout === null || layout?.roomId === room.id),
  )
})
const selectedLayout = computed(() => (layoutReady.value ? (layoutQuery.data.value ?? null) : null))

const loadingOptions = computed(
  () =>
    cinemas.isFetching.value ||
    movies.isFetching.value ||
    rooms.isFetching.value ||
    screeningVersions.isFetching.value ||
    layoutQuery.isFetching.value,
)
const catalogError = computed(
  () =>
    cinemas.error.value ?? movies.error.value ?? rooms.error.value ?? screeningVersions.error.value,
)

const now = useNow({
  scheduler: (update) => useIntervalFn(update, 1_000),
})
const startsLocal = computed({
  get: () => (form.date && form.startTime ? `${form.date}T${form.startTime}` : ''),
  set: (value: string) => {
    const [date = '', time = ''] = value.split('T')
    form.date = date
    form.startTime = time.slice(0, 5)
  },
})
const startsAt = computed(() => localToInstant(`${form.date}T${form.startTime}`))
const timingError = computed(() =>
  getShowtimeStartError(form.date, form.startTime, now.value.getTime()),
)
const breakResult = computed(() => showtimeBreakMinutesSchema.safeParse(form.breakMinutes))
const breakError = computed(() => {
  const result = breakResult.value
  if (form.breakMinutes === '' || result.success) return ''
  return result.error.issues[0]?.message ?? 'Khoảng nghỉ chưa hợp lệ.'
})
const estimatedEndsAt = computed(() => {
  const start = startsAt.value
  const duration = selectedMovie.value?.durationMinutes
  if (!start || !duration) return ''

  const end = new Date(Date.parse(start) + duration * 60_000)
  return Number.isFinite(end.getTime()) ? end.toISOString() : ''
})
const estimatedEnd = computed(() =>
  estimatedEndsAt.value ? instantToLocal(estimatedEndsAt.value) : '',
)
const estimatedReady = computed(() => {
  const result = breakResult.value
  if (!estimatedEndsAt.value || !result.success) return ''

  const ready = new Date(Date.parse(estimatedEndsAt.value) + result.data * 60_000)
  return Number.isFinite(ready.getTime()) ? instantToLocal(ready.toISOString()) : ''
})

const creationRequest = computed<CreateShowtimeRequest | null>(() => {
  const parsed = showtimeDraftSchema.safeParse(form)
  const room = selectedRoom.value
  const movie = selectedMovie.value
  const version = selectedVersion.value
  const start = startsAt.value
  const end = estimatedEndsAt.value

  if (
    !parsed.success ||
    !selectedCinema.value ||
    !room ||
    !movie ||
    !version ||
    !start ||
    !end ||
    !layoutReady.value ||
    timingError.value
  ) {
    return null
  }

  return {
    movieId: movie.id,
    roomId: room.id,
    movieScreeningVersionId: version.id,
    startsAt: start,
    endsAt: end,
    breakMinutes: parsed.data.breakMinutes,
    ...(selectedLayout.value ? { roomLayoutId: selectedLayout.value.id } : {}),
  }
})

const canSubmit = computed(
  () =>
    canManage.value &&
    !locked.value &&
    !loadingOptions.value &&
    !requiresReview.value &&
    creationRequest.value !== null,
)

const versionEmptyMessage = computed(() => {
  if (selectedRoom.value?.contentFormats.length === 0) {
    return 'Phòng chưa được cấu hình định dạng nội dung hỗ trợ.'
  }
  if (!(screeningVersions.data.value ?? []).length) {
    return 'Phim chưa có phiên bản chiếu đang hoạt động.'
  }
  return 'Không có phiên bản chiếu phù hợp với định dạng phòng hỗ trợ.'
})

const choiceFields = computed(() => [
  {
    key: 'cinemaId' as const,
    label: 'Rạp',
    wide: true,
    options: (cinemas.data.value ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    })),
    loading: cinemas.isFetching.value,
    success: cinemas.isSuccess.value,
    error: cinemas.error.value,
    disabled: cinemas.isFetching.value || cinemas.isError.value,
    context: true,
    contextHelp: '',
    empty: 'Chưa có rạp đang hoạt động.',
  },
  {
    key: 'movieId' as const,
    label: 'Phim',
    wide: true,
    options: (movies.data.value ?? []).map((item) => ({
      value: item.id,
      label: item.durationMinutes ? `${item.title} — ${item.durationMinutes} phút` : item.title,
    })),
    loading: movies.isFetching.value,
    success: movies.isSuccess.value,
    error: movies.error.value,
    disabled: movies.isFetching.value || movies.isError.value,
    context: true,
    contextHelp: '',
    empty: 'Chưa có phim phù hợp trong danh mục.',
  },
  {
    key: 'roomId' as const,
    label: 'Phòng',
    wide: false,
    options: selectedCinema.value
      ? (rooms.data.value ?? []).map((item) => ({ value: item.id, label: item.name }))
      : [],
    loading: rooms.isFetching.value,
    success: rooms.isSuccess.value,
    error: rooms.error.value,
    disabled: !selectedCinema.value || rooms.isFetching.value || rooms.isError.value,
    context: Boolean(selectedCinema.value),
    contextHelp: 'Chọn rạp trước.',
    empty: 'Rạp chưa có phòng đang hoạt động.',
  },
  {
    key: 'movieScreeningVersionId' as const,
    label: 'Phiên bản chiếu',
    wide: false,
    options: compatibleVersions.value.map((item) => ({
      value: item.id,
      label: screeningVersionLabel(item),
    })),
    loading: screeningVersions.isFetching.value,
    success: screeningVersions.isSuccess.value,
    error: screeningVersions.error.value,
    disabled:
      !selectedMovie.value ||
      !selectedRoom.value ||
      screeningVersions.isFetching.value ||
      screeningVersions.isError.value,
    context: Boolean(selectedMovie.value && selectedRoom.value),
    contextHelp: 'Chọn phim và phòng trước.',
    empty: versionEmptyMessage.value,
  },
])

watch(
  () => form.cinemaId,
  () => {
    form.roomId = ''
  },
  { flush: 'sync' },
)
watch(
  [() => form.movieId, () => form.roomId],
  () => {
    form.movieScreeningVersionId = ''
  },
  { flush: 'sync' },
)
watch(
  [
    () => screeningVersions.data.value,
    () => screeningVersions.isFetching.value,
    () => rooms.data.value,
    () => rooms.isFetching.value,
    () => movies.data.value,
    () => movies.isFetching.value,
  ],
  () => {
    if (
      locked.value ||
      !selectedRoom.value ||
      !selectedMovie.value ||
      !screeningVersions.isSuccess.value ||
      screeningVersions.isFetching.value
    ) {
      return
    }

    if (
      form.movieScreeningVersionId &&
      !compatibleVersions.value.some((item) => item.id === form.movieScreeningVersionId)
    ) {
      form.movieScreeningVersionId = ''
    }
  },
)

const dirty = computed(() => created.value === null && JSON.stringify(form) !== initialKey)

function preventUnload(event: BeforeUnloadEvent): void {
  if (!dirty.value && !submitting.value && !uncertainResult.value) return
  event.preventDefault()
  event.returnValue = ''
}
function confirmLeave(): boolean {
  if (submitting.value) return false
  if (uncertainResult.value) {
    return window.confirm(
      'Chưa xác định được kết quả tạo suất. Rời trang để kiểm tra danh sách trước khi tạo thêm?',
    )
  }
  return !dirty.value || window.confirm('Bỏ thông tin suất chiếu đang nhập để rời trang?')
}

watch(
  [dirty, submitting, uncertainResult],
  ([hasChanges, pending, uncertain]) => {
    if (hasChanges || pending || uncertain) {
      window.addEventListener('beforeunload', preventUnload)
    } else {
      window.removeEventListener('beforeunload', preventUnload)
    }
  },
  { flush: 'sync' },
)
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))

async function reloadLayout(): Promise<void> {
  if (locked.value || !selectedRoom.value || !canReadLayout.value || layoutQuery.isFetching.value)
    return

  await layoutQuery.refetch()
}

async function reloadOptions(): Promise<void> {
  if (!canManage.value || locked.value || loadingOptions.value) return

  const reloadRooms = Boolean(selectedCinema.value)
  const reloadVersions = Boolean(selectedMovie.value)

  refreshing.value = true
  requestError.value = ''

  try {
    const requests: Promise<unknown>[] = [cinemas.refetch(), movies.refetch()]
    if (reloadRooms) requests.push(rooms.refetch())
    if (reloadVersions) requests.push(screeningVersions.refetch())

    await Promise.allSettled(requests)
    await nextTick()

    if (selectedRoom.value && canReadLayout.value) {
      await layoutQuery.refetch()
      await nextTick()
    }

    if (!catalogError.value && (!selectedRoom.value || !canReadLayout.value || layoutReady.value)) {
      requiresReview.value = false
    }
  } finally {
    refreshing.value = false
  }
}

async function submit(): Promise<void> {
  const request = creationRequest.value
  const cinema = selectedCinema.value
  if (!canSubmit.value || !request || !cinema) return

  submitting.value = true
  requestError.value = ''

  try {
    created.value = await creation.mutateAsync({
      cinemaId: cinema.id,
      request,
    })
  } catch (error: unknown) {
    if (isShowtimeCreationRejected(error)) {
      requestError.value = showtimeCreationErrorMessage(error)
      requiresReview.value = showtimeCreationStatus(error) === 409
    } else {
      uncertainResult.value = true
      requestError.value =
        'Chưa xác định được kết quả tạo suất. Hãy kiểm tra danh sách theo phòng, phim và giờ chiếu trước khi tạo thêm.'
    }
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
    <header class="admin-reference__heading showtime-create__heading">
      <div>
        <p class="admin-reference__eyebrow">Lịch chiếu</p>
        <h1 id="showtime-create-title" tabindex="-1">Tạo suất chiếu</h1>
        <p class="admin-reference__description">
          Lập lịch theo phiên bản phim, phòng, thời gian và khoảng nghỉ.
        </p>
      </div>
      <RouterLink
        v-if="canManage && canViewInventory"
        class="admin-reference__link-button"
        :to="{ name: ROUTE_NAMES.ADMIN_PRICING_POLICY }"
      >
        Xem chính sách giá
      </RouterLink>
    </header>

    <p v-if="!canManage" class="showtime-create__error" role="alert">
      Bạn không có quyền quản lý suất chiếu.
    </p>

    <template v-else>
      <p class="showtime-create__notice">
        Suất mới được lưu ở trạng thái “Đã lên lịch”, chưa gán bảng giá và chưa mở bán. Cần gán bảng
        giá đã công bố trước khi mở bán vé.
      </p>

      <p v-if="requestError" class="showtime-create__notice showtime-create__error" role="alert">
        {{ requestError }}
      </p>

      <div v-if="requiresReview" class="showtime-create__notice" role="status">
        Lựa chọn hoặc lịch phòng đã có xung đột. Chọn “Tải lại lựa chọn”, kiểm tra thông tin rồi gửi
        lại.
      </div>

      <div v-if="uncertainResult" class="showtime-create__notice" role="status">
        Đã khóa gửi lại để tránh tạo thêm suất khi kết quả chưa rõ.
        <RouterLink
          class="admin-reference__link-button"
          :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
        >
          Kiểm tra danh sách suất chiếu
        </RouterLink>
      </div>

      <div v-if="created" class="showtime-create__notice" role="status">
        <strong>Đã lập lịch thành công.</strong>
        <p>
          {{ created.cinemaName }} · {{ created.roomName }} ·
          {{ instantToLocal(created.startsAt).replace('T', ' ') }}. Trạng thái: Đã lên lịch; chưa
          gán bảng giá.
        </p>
        <RouterLink
          class="admin-reference__link-button"
          :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
        >
          Xem danh sách suất chiếu
        </RouterLink>
      </div>

      <form
        class="showtime-create__layout"
        novalidate
        :aria-busy="submitting"
        @submit.prevent="submit"
      >
        <div class="showtime-create__main">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-info-title"
          >
            <header class="showtime-create__panel-heading">
              <div>
                <h2 id="showtime-info-title">Thông tin suất chiếu</h2>
                <p>Trường có dấu * là bắt buộc.</p>
              </div>
              <span class="showtime-create__badge">
                {{ created ? 'Đã lên lịch' : 'Kiểm tra lịch khi lưu' }}
              </span>
            </header>

            <div class="showtime-create__panel-body">
              <fieldset class="showtime-create__fields" :disabled="locked">
                <legend class="admin-visually-hidden">Thông tin lịch chiếu</legend>

                <label
                  v-for="field in choiceFields"
                  :key="field.key"
                  class="admin-reference__field"
                  :class="{ 'showtime-create__field-wide': field.wide }"
                >
                  <span>{{ field.label }} *</span>
                  <select
                    v-model="form[field.key]"
                    class="admin-reference__input"
                    required
                    :disabled="field.disabled"
                    :aria-describedby="`${field.key}-feedback`"
                  >
                    <option value="">
                      {{ field.loading ? 'Đang tải…' : `Chọn ${field.label.toLowerCase()}` }}
                    </option>
                    <option
                      v-for="option in field.options"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <span
                    :id="`${field.key}-feedback`"
                    :class="{ 'showtime-create__error': Boolean(field.error) }"
                    :role="field.error ? 'alert' : 'status'"
                  >
                    <template v-if="field.loading">Đang tải lựa chọn…</template>
                    <template v-else-if="field.error">
                      {{ showtimeErrorMessage(field.error, 'Không thể tải lựa chọn.') }}
                    </template>
                    <template v-else-if="!field.context">{{ field.contextHelp }}</template>
                    <template v-else-if="field.success && field.options.length === 0">
                      {{ field.empty }}
                    </template>
                  </span>
                </label>

                <div
                  v-if="selectedRoom"
                  class="showtime-create__notice showtime-create__field-wide"
                >
                  Định dạng phòng hỗ trợ:
                  {{ selectedRoom.contentFormats.join(' / ') || 'Chưa cấu hình' }}. Chỉ chọn phiên
                  bản phim đang hoạt động có định dạng phù hợp.
                </div>

                <label class="admin-reference__field">
                  <span>Bắt đầu *</span>
                  <input
                    v-model="startsLocal"
                    class="admin-reference__input"
                    type="datetime-local"
                    step="60"
                    required
                    :aria-invalid="Boolean(timingError)"
                    aria-describedby="showtime-time-feedback showtime-time-help"
                  />
                </label>

                <label class="admin-reference__field">
                  <span>Khoảng nghỉ sau suất, phút *</span>
                  <input
                    v-model="form.breakMinutes"
                    class="admin-reference__input"
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    required
                    :aria-invalid="Boolean(breakError)"
                    aria-describedby="showtime-break-feedback"
                  />
                  <span
                    id="showtime-break-feedback"
                    :class="{ 'showtime-create__error': Boolean(breakError) }"
                  >
                    {{ breakError || 'Số phút nguyên từ 0 đến 120.' }}
                  </span>
                </label>

                <label class="admin-reference__field">
                  <span>Kết thúc dự kiến</span>
                  <input
                    class="admin-reference__input"
                    type="datetime-local"
                    readonly
                    :value="estimatedEnd"
                  />
                  <span class="showtime-create__hint">
                    Giờ bắt đầu cộng thời lượng phim; chưa gồm khoảng nghỉ.
                  </span>
                </label>

                <label class="admin-reference__field">
                  <span>Phòng sẵn sàng dự kiến</span>
                  <input
                    class="admin-reference__input"
                    type="datetime-local"
                    readonly
                    :value="estimatedReady"
                  />
                  <span class="showtime-create__hint">Giờ kết thúc cộng khoảng nghỉ sau suất.</span>
                </label>
              </fieldset>

              <p
                v-if="timingError && !created"
                id="showtime-time-feedback"
                class="showtime-create__error"
                role="status"
              >
                {{ timingError }}
              </p>
              <p
                v-if="selectedMovie && !selectedMovie.durationMinutes"
                class="showtime-create__error"
                role="alert"
              >
                Phim chưa có thời lượng hợp lệ để lập lịch.
              </p>
              <p v-if="selectedMovie?.releaseDate" class="showtime-create__hint">
                Ngày khởi chiếu: {{ selectedMovie.releaseDate }}.
              </p>
              <p id="showtime-time-help" class="showtime-create__hint">
                Các mốc hiển thị theo giờ Việt Nam. Hệ thống kiểm tra lịch trùng gồm cả khoảng nghỉ
                khi lưu.
              </p>
              <p v-if="!canViewInventory" class="showtime-create__error" role="alert">
                Bạn cần quyền đọc cấu hình sơ đồ phòng để xác nhận trước khi tạo suất tại trang này.
              </p>
              <p v-if="catalogError" class="showtime-create__error" role="alert">
                {{ showtimeErrorMessage(catalogError, 'Không thể tải đầy đủ lựa chọn.') }}
              </p>

              <footer class="showtime-create__actions">
                <AppButton
                  type="button"
                  variant="secondary"
                  :disabled="locked || loadingOptions"
                  :loading="refreshing"
                  @click="reloadOptions"
                >
                  Tải lại lựa chọn
                </AppButton>
                <RouterLink
                  class="admin-reference__link-button"
                  :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
                >
                  {{ created ? 'Về danh sách' : 'Hủy' }}
                </RouterLink>
                <AppButton type="submit" :disabled="!canSubmit" :loading="submitting">
                  Lưu lịch chiếu
                </AppButton>
              </footer>
            </div>
          </section>

          <AdminShowtimePublishedLayout
            :room-id="selectedRoom?.id ?? ''"
            :room-name="selectedRoom?.name ?? ''"
            :can-read="canReadLayout"
            :query="layoutQuery"
            :selected-layout-id="created?.roomLayoutId ?? selectedLayout?.id ?? ''"
            :disabled="locked || loadingOptions"
            @reload="reloadLayout"
          />
        </div>

        <aside aria-label="Tóm tắt lịch chiếu và giá vé">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-summary-title"
          >
            <header class="showtime-create__panel-heading">
              <div>
                <p class="admin-reference__eyebrow">Thông tin áp dụng</p>
                <h2 id="showtime-summary-title">Tóm tắt suất chiếu</h2>
              </div>
              <span class="showtime-create__badge">Chưa gán bảng giá</span>
            </header>

            <div class="showtime-create__panel-body">
              <dl class="showtime-create__summary">
                <div>
                  <dt>Rạp</dt>
                  <dd>{{ created?.cinemaName ?? selectedCinema?.name ?? 'Chưa chọn' }}</dd>
                </div>
                <div>
                  <dt>Phòng</dt>
                  <dd>{{ created?.roomName ?? selectedRoom?.name ?? 'Chưa chọn' }}</dd>
                </div>
                <div>
                  <dt>Phim</dt>
                  <dd>{{ selectedMovie?.title ?? 'Chưa chọn' }}</dd>
                </div>
                <div>
                  <dt>Phiên bản</dt>
                  <dd>
                    {{ selectedVersion ? screeningVersionLabel(selectedVersion) : 'Chưa chọn' }}
                  </dd>
                </div>
                <div>
                  <dt>Kết thúc</dt>
                  <dd>
                    {{
                      created
                        ? instantToLocal(created.endsAt).replace('T', ' ')
                        : estimatedEnd.replace('T', ' ') || 'Chưa xác định'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Phòng sẵn sàng</dt>
                  <dd>
                    {{
                      created
                        ? instantToLocal(created.scheduling.readyAt).replace('T', ' ')
                        : estimatedReady.replace('T', ' ') || 'Chưa xác định'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái khi lưu</dt>
                  <dd>Đã lên lịch</dd>
                </div>
              </dl>

              <div class="showtime-create__notice">
                <strong>Chưa có giá vé</strong>
                <p>
                  Lưu lịch không tạo giá tạm và không hiểu giá chưa cấu hình là 0đ. Cần gán bảng giá
                  đã công bố để xác định giá vé trước khi mở bán.
                </p>
              </div>

              <p class="showtime-create__hint">
                Bảng giá Lễ/Tết được chọn trực tiếp cho suất chiếu. Mỗi định dạng có giá riêng,
                không cộng phụ thu.
              </p>
            </div>
          </section>
        </aside>
      </form>
    </template>
  </section>
</template>
