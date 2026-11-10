<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, toRef, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { CalendarDays, Clock3, Plus, Trash2 } from 'lucide-vue-next'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppTimePicker from '@/components/ui/AppTimePicker.vue'
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
  showtimePricingVersionLabel,
  useCreateAdminShowtimeMutation,
  useShowtimeCreationOptions,
} from '../api/admin-showtime-create'
import { useAdminShowtimePublishedLayoutQuery } from '../api/admin-showtime-layout-query'
import {
  instantToLocal,
  showtimeBreakMinutesSchema,
  showtimeDraftSchema,
  type CreatedScheduledShowtime,
  type ShowtimeDraftValues,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'
import AdminShowtimePublishedLayout from '../components/AdminShowtimePublishedLayout.vue'
import { useAdminShowtimeSlots } from '../composables/use-admin-showtime-slots'
import { useAdminShowtimePricing } from '../composables/use-admin-showtime-pricing'

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
  pricingPolicyVersionId: '',
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

const { cinemas, movies, rooms, screeningVersions, pricingVersions } = useShowtimeCreationOptions(
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
const pricing = useAdminShowtimePricing({
  date: () => form.date,
  cinemaId: () => form.cinemaId,
  versions: () => pricingVersions.data.value ?? [],
  ready: () => pricingVersions.isSuccess.value && !pricingVersions.isFetching.value,
  locked,
  selectedId: toRef(form, 'pricingPolicyVersionId'),
})
const holiday = pricing.holiday
const pricingDayLabel = pricing.dayLabel
const pricingHint = pricing.hint
const selectedPricingVersion = computed(() =>
  pricing.choices.value.find((item) => item.id === form.pricingPolicyVersionId),
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
    pricingVersions.isFetching.value ||
    layoutQuery.isFetching.value,
)
const catalogError = computed(
  () =>
    cinemas.error.value ??
    movies.error.value ??
    rooms.error.value ??
    screeningVersions.error.value ??
    pricingVersions.error.value,
)

const now = useNow({
  scheduler: (update) => useIntervalFn(update, 1_000),
})
const breakResult = computed(() => showtimeBreakMinutesSchema.safeParse(form.breakMinutes))
const breakError = computed(() => {
  const result = breakResult.value
  if (form.breakMinutes === '' || result.success) return ''
  return result.error.issues[0]?.message ?? 'Khoảng nghỉ chưa hợp lệ.'
})
const schedule = useAdminShowtimeSlots({
  date: () => form.date,
  durationMinutes: () => selectedMovie.value?.durationMinutes,
  breakMinutes: () => {
    const result = breakResult.value
    return result.success ? result.data : null
  },
  nowMilliseconds: () => now.value.getTime(),
})
const slots = schedule.slots
const slotRows = schedule.rows
const multipleSlots = schedule.multiple
watch(
  () => slots.value[0]?.startTime ?? '',
  (time) => {
    form.startTime = time
  },
  { flush: 'sync' },
)
const startsAt = computed(() => slotRows.value[0]?.startsAt ?? null)
const timingError = computed(() => slotRows.value[0]?.error ?? '')
const estimatedEndsAt = computed(() => slotRows.value[0]?.endsAt ?? '')
const estimatedEnd = computed(() =>
  estimatedEndsAt.value ? instantToLocal(estimatedEndsAt.value) : '',
)
const estimatedReady = computed(() => {
  const ready = slotRows.value[0]?.readyAt
  return ready ? instantToLocal(ready) : ''
})

async function addSlot() {
  if (locked.value) return
  const id = schedule.add()
  await nextTick()
  document.getElementById(`showtime-slot-${id}`)?.focus()
}

async function removeSlot(id: string) {
  if (locked.value || slots.value.length === 1) return
  const index = slots.value.findIndex((slot) => slot.id === id)
  schedule.remove(id)
  await nextTick()
  const next = slots.value[Math.min(index, slots.value.length - 1)]
  if (next) document.getElementById(`showtime-slot-${next.id}`)?.focus()
}

const creationRequest = computed<CreateShowtimeRequest | null>(() => {
  if (multipleSlots.value) return null
  const parsed = showtimeDraftSchema.safeParse(form)
  const room = selectedRoom.value
  const movie = selectedMovie.value
  const version = selectedVersion.value
  const pricingVersion = selectedPricingVersion.value
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
    !pricingVersions.isSuccess.value ||
    (parsed.success && parsed.data.pricingPolicyVersionId !== '' && !pricingVersion) ||
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
    ...(pricingVersion ? { pricingPolicyVersionId: pricingVersion.id } : {}),
  }
})

const canSubmit = computed(
  () =>
    canManage.value &&
    !locked.value &&
    !loadingOptions.value &&
    !requiresReview.value &&
    !multipleSlots.value &&
    schedule.complete.value &&
    creationRequest.value !== null,
)

const versionEmptyMessage = computed(() => {
  if (selectedRoom.value?.contentFormats.length === 0) {
    return 'Phòng chưa được cấu hình định dạng nội dung hỗ trợ.'
  }

  if (!(screeningVersions.data.value ?? []).length) {
    return 'Phim chưa có phiên bản chiếu đang hoạt động. Vào Phim → Sửa phim để thêm hoặc kích hoạt phiên bản, sau đó tải lại lựa chọn.'
  }

  return 'Không có phiên bản chiếu phù hợp với định dạng phòng hỗ trợ.'
})

const choiceFields = computed(() =>
  [
    {
      key: 'cinemaId' as const,
      label: 'Rạp',
      required: true,
      placeholder: 'Chọn rạp',
      wide: false,
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
      required: true,
      placeholder: 'Chọn phim',
      wide: false,
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
      required: true,
      placeholder: 'Chọn phòng',
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
      required: true,
      placeholder: 'Chọn phiên bản chiếu',
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
    {
      key: 'pricingPolicyVersionId' as const,
      label: 'Bảng giá',
      required: false,
      placeholder: 'Không gán bảng giá khi tạo',
      wide: true,
    options: pricing.choices.value.map((item) => ({
        value: item.id,
        label: showtimePricingVersionLabel(item),
      })),
      loading: pricingVersions.isFetching.value,
      success: pricingVersions.isSuccess.value,
      error: pricingVersions.error.value,
      disabled:
        !selectedCinema.value || pricingVersions.isFetching.value || pricingVersions.isError.value,
      context: Boolean(selectedCinema.value),
      contextHelp: 'Chọn rạp trước. Có thể lập lịch trước và gán bảng giá sau.',
    empty: pricingHint.value,
    },
  ].sort((first, second) => {
    const order = [
      'cinemaId',
      'roomId',
      'movieId',
      'movieScreeningVersionId',
      'pricingPolicyVersionId',
    ]
    return order.indexOf(first.key) - order.indexOf(second.key)
  }),
)

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

const dirty = computed(
  () => created.value === null && (JSON.stringify(form) !== initialKey || slots.value.length > 1 || holiday.value),
)

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
  const reloadPricing = Boolean(selectedCinema.value)
  const reloadVersions = Boolean(selectedMovie.value)

  refreshing.value = true
  requestError.value = ''

  try {
    const requests: Promise<unknown>[] = [cinemas.refetch(), movies.refetch()]
    if (reloadRooms) requests.push(rooms.refetch())
    if (reloadPricing) requests.push(pricingVersions.refetch())
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
        <p class="showtime-create__intro">
          Chọn phim và phòng, sau đó sắp xếp các khung giờ trong một ngày.
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
          {{ instantToLocal(created.startsAt).replace('T', ' ') }}. Trạng thái: Đã lên lịch;
          {{ created.pricingPolicyVersionId ? 'đã gán bảng giá.' : 'chưa gán bảng giá.' }}
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
                <h2 id="showtime-info-title">
                  <span class="showtime-create__step">01</span> Phim &amp; phòng chiếu
                </h2>
                <p>Thông tin dùng chung cho các khung giờ. Trường có dấu * là bắt buộc.</p>
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
                  <span>
                    {{ field.label }}
                    <template v-if="field.required">*</template>
                  </span>
                  <select
                    v-model="form[field.key]"
                    class="admin-reference__input"
                    :required="field.required"
                    :disabled="field.disabled"
                    :aria-describedby="`${field.key}-feedback`"
                    @change="field.key === 'pricingPolicyVersionId' && pricing.selectManually()"
                  >
                    <option value="">
                      {{ field.loading ? 'Đang tải…' : field.placeholder }}
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
                    <template v-else-if="field.key === 'pricingPolicyVersionId'">{{ pricingHint }}</template>
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
              </fieldset>
            </div>
          </section>

          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-timing-title"
          >
            <header class="showtime-create__panel-heading">
              <div>
                <h2 id="showtime-timing-title">
                  <span class="showtime-create__step">02</span> Lịch chiếu trong ngày
                </h2>
                <p>Tính giờ kết thúc theo thời lượng phim; phòng sẵn sàng sau khoảng nghỉ.</p>
              </div>
              <span class="showtime-create__badge">{{ slots.length }} khung giờ</span>
            </header>
            <div class="showtime-create__panel-body">
              <fieldset class="showtime-create__fields" :disabled="locked">
                <legend class="admin-visually-hidden">Ngày chiếu và khoảng nghỉ chung</legend>
                <label class="admin-reference__field">
                  <span><CalendarDays aria-hidden="true" /> Ngày chiếu *</span>
                  <input
                    v-model="form.date"
                    class="admin-reference__input"
                    type="date"
                    :min="getCinemaDateKey(now.toISOString())"
                    required
                    aria-describedby="showtime-time-help"
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
              </fieldset>

              <div class="showtime-create__day-rule">
                <div>
                  <strong>Loại ngày áp dụng</strong>
                  <span class="showtime-create__badge">{{ pricingDayLabel }}</span>
                </div>
                <label class="showtime-create__holiday">
                  <input v-model="holiday" type="checkbox" :disabled="locked || !form.date" aria-describedby="showtime-holiday-help" />
                  Ngày lễ/Tết
                </label>
                <p id="showtime-holiday-help" class="showtime-create__hint">
                  Thứ Bảy, Chủ nhật áp dụng bảng giá cuối tuần. Chọn Ngày lễ/Tết để ưu tiên bảng giá lễ.
                </p>
              </div>

              <div class="showtime-create__slots-heading">
                <h3><Clock3 aria-hidden="true" /> Các khung giờ</h3>
                <span v-if="selectedMovie?.durationMinutes" class="showtime-create__hint"
                  >Thời lượng phim: {{ selectedMovie.durationMinutes }} phút</span
                >
              </div>
              <fieldset class="showtime-create__slots" :disabled="locked">
                <legend class="admin-visually-hidden">Giờ bắt đầu cho từng suất chiếu</legend>
                <div
                  v-for="(slot, index) in slots"
                  :key="slot.id"
                  class="showtime-create__slot"
                  :class="{ 'has-error': Boolean(slotRows[index]?.error) && !created }"
                >
                  <span class="showtime-create__slot-index">{{
                    String(index + 1).padStart(2, '0')
                  }}</span>
                  <label
                    class="admin-reference__field showtime-create__slot-start"
                    :for="`showtime-slot-${slot.id}`"
                  >
                    <span>Bắt đầu *</span>
                    <AppTimePicker
                      :id="`showtime-slot-${slot.id}`"
                      v-model="slot.startTime"
                      :disabled="locked"
                      class="admin-reference__input"
                      required
                      :aria-label="`Giờ bắt đầu khung ${index + 1}`"
                      :aria-invalid="Boolean(slotRows[index]?.error) && !created"
                      :aria-describedby="`showtime-slot-error-${slot.id} showtime-time-help`"
                    />
                  </label>
                  <div class="showtime-create__slot-end">
                    <span>Kết thúc</span><strong>{{ slotRows[index]?.endLabel }}</strong>
                  </div>
                  <div class="showtime-create__slot-ready">
                    <span>Phòng sẵn sàng</span><strong>{{ slotRows[index]?.readyLabel }}</strong>
                  </div>
                  <AppButton
                    class="showtime-create__slot-remove"
                    variant="ghost"
                    size="sm"
                    :disabled="locked || slots.length === 1"
                    :aria-label="`Xóa khung giờ ${index + 1}${slot.startTime ? ' lúc ' + slot.startTime : ''}`"
                    @click="removeSlot(slot.id)"
                  >
                    <Trash2 aria-hidden="true" />
                  </AppButton>
                  <p
                    :id="`showtime-slot-error-${slot.id}`"
                    class="showtime-create__slot-error showtime-create__error"
                    role="status"
                  >
                    {{ !created ? slotRows[index]?.error : '' }}
                  </p>
                </div>
              </fieldset>
              <AppButton
                class="showtime-create__add-slot"
                variant="secondary"
                :disabled="locked"
                @click="addSlot"
              >
                <Plus aria-hidden="true" /> Thêm khung giờ
              </AppButton>
              <p
                v-if="multipleSlots && !created"
                id="showtime-batch-help"
                class="showtime-create__notice"
                role="status"
              >
                Đã chuẩn bị {{ slots.length }} khung giờ. Lưu nhiều suất chưa khả dụng; giữ lại một
                khung giờ để lưu ngay. Các khung giờ bổ sung chưa được lưu.
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
            </div>
          </section>
        </div>

        <aside class="showtime-create__sidebar" aria-label="Tóm tắt lịch chiếu và giá vé">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-summary-title"
          >
            <header class="showtime-create__panel-heading">
              <div>
                <p class="admin-reference__eyebrow">Thông tin áp dụng</p>
                <h2 id="showtime-summary-title">Kiểm tra trước khi lưu</h2>
              </div>
              <span class="showtime-create__badge">
                {{
                  created?.pricingPolicyVersionId || selectedPricingVersion
                    ? 'Đã chọn bảng giá'
                    : 'Chưa gán bảng giá'
                }}
              </span>
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
                  <dt>Bảng giá</dt>
                  <dd>
                    {{
                      selectedPricingVersion
                        ? showtimePricingVersionLabel(selectedPricingVersion)
                        : (created?.pricingPolicyVersionId ?? 'Chưa gán')
                    }}
                  </dd>
                </div>
                <div v-if="!multipleSlots">
                  <dt>Kết thúc</dt>
                  <dd>
                    {{
                      created
                        ? instantToLocal(created.endsAt).replace('T', ' ')
                        : estimatedEnd.replace('T', ' ') || 'Chưa xác định'
                    }}
                  </dd>
                </div>
                <div v-if="!multipleSlots">
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
                  <dt>Ngày chiếu</dt>
                  <dd>{{ form.date || 'Chưa chọn' }}</dd>
                </div>
                <div>
                  <dt>Loại ngày</dt>
                  <dd>{{ pricingDayLabel }}</dd>
                </div>
                <div>
                  <dt>Khung giờ đã nhập</dt>
                  <dd>{{ slots.filter((slot) => slot.startTime).length }} / {{ slots.length }}</dd>
                </div>
                <div>
                  <dt>Trạng thái khi lưu</dt>
                  <dd>Đã lên lịch</dd>
                </div>
              </dl>
            </div>
          </section>
          <AdminShowtimePublishedLayout
            :room-id="form.roomId"
            :room-name="selectedRoom?.name ?? ''"
            :can-read="canReadLayout"
            :query="layoutQuery"
            :selected-layout-id="selectedLayout?.id ?? ''"
            :disabled="locked"
            @reload="reloadLayout"
          />
        </aside>
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
          <AppButton
            type="submit"
            :disabled="!canSubmit"
            :loading="submitting"
            :aria-describedby="multipleSlots ? 'showtime-batch-help' : undefined"
          >
            {{ multipleSlots ? `Lưu ${slots.length} suất chiếu` : 'Lưu lịch chiếu' }}
          </AppButton>
        </footer>
      </form>
    </template>
  </section>
</template>
