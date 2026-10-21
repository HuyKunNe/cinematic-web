<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { getCinemaDateKey } from '@/utils/cinema-time'
import { useShowtimeCreationOptions } from '../api/admin-showtime-create'
import {
  getShowtimeStartError,
  instantToLocal,
  localToInstant,
  showtimeDraftSchema,
  type ShowtimeDraftValues,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'
import AdminShowtimePublishedLayout from '../components/AdminShowtimePublishedLayout.vue'

const auth = useAuthStore()

const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE),
)

const canViewInventory = computed(() => auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE))

const form = reactive<ShowtimeDraftValues>({
  cinemaId: '',
  roomId: '',
  movieId: '',
  date: getCinemaDateKey(new Date().toISOString()),
  startTime: '',
})

const initialKey = JSON.stringify(form)

const { cinemas, movies, rooms } = useShowtimeCreationOptions(canManage, () => form.cinemaId)

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

const loadingOptions = computed(
  () => cinemas.isFetching.value || movies.isFetching.value || rooms.isFetching.value,
)

const catalogError = computed(() => cinemas.error.value ?? movies.error.value ?? rooms.error.value)

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

const estimatedEnd = computed(() => {
  const duration = selectedMovie.value?.durationMinutes
  if (!startsAt.value || !duration) return ''

  const milliseconds = Date.parse(startsAt.value) + duration * 60_000
  const end = new Date(milliseconds)

  if (!Number.isFinite(end.getTime())) return ''

  return instantToLocal(end.toISOString())
})

const baseContextReady = computed(
  () =>
    canManage.value &&
    Boolean(selectedCinema.value) &&
    Boolean(selectedRoom.value) &&
    Boolean(selectedMovie.value) &&
    showtimeDraftSchema.safeParse(form).success &&
    !timingError.value,
)

const pricingStatus = computed(() => {
  if (loadingOptions.value) {
    return 'Đang tải thông tin rạp, phòng và phim.'
  }

  if (catalogError.value) {
    return showtimeErrorMessage(
      catalogError.value,
      'Không thể tải đầy đủ lựa chọn. Chọn “Tải lại lựa chọn” để thử lại.',
    )
  }

  if (timingError.value) {
    return 'Điều chỉnh ngày và giờ bắt đầu trước khi tiếp tục.'
  }

  if (!baseContextReady.value) {
    return 'Chọn rạp, phim, phòng và thời gian bắt đầu để chuẩn bị xem giá.'
  }

  return 'Chưa có API preview giá vận hành phù hợp để hiển thị giá cho suất chiếu này.'
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
    empty: 'Chưa có phim phù hợp trong danh mục.',
  },
  {
    key: 'roomId' as const,
    label: 'Phòng',
    wide: false,
    options: selectedCinema.value
      ? (rooms.data.value ?? []).map((item) => ({
          value: item.id,
          label: item.name,
        }))
      : [],
    loading: rooms.isFetching.value,
    success: rooms.isSuccess.value,
    error: rooms.error.value,
    disabled: !selectedCinema.value || rooms.isFetching.value || rooms.isError.value,
    context: Boolean(selectedCinema.value),
    empty: 'Rạp chưa có phòng đang hoạt động.',
  },
])

const dirty = computed(() => JSON.stringify(form) !== initialKey)

watch(
  () => form.cinemaId,
  () => {
    form.roomId = ''
  },
  { flush: 'sync' },
)

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  dirty,
  (value) => {
    if (value) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

function confirmLeave() {
  return !dirty.value || window.confirm('Bỏ thông tin suất chiếu đang nhập để rời trang?')
}

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
})

async function reloadOptions() {
  if (!canManage.value || loadingOptions.value) return

  const shouldReloadRooms = Boolean(selectedCinema.value)

  const requests: Promise<unknown>[] = [cinemas.refetch(), movies.refetch()]

  if (shouldReloadRooms) {
    requests.push(rooms.refetch())
  }

  await Promise.allSettled(requests)
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
          Chọn rạp, phim, phòng và thời gian. Giá vé được lấy từ chính sách của rạp.
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
      <form class="showtime-create__layout" @submit.prevent>
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

              <span class="showtime-create__badge">Chưa kiểm tra lịch</span>
            </header>

            <div class="showtime-create__panel-body">
              <fieldset class="showtime-create__fields">
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
                      Chọn “Tải lại lựa chọn” để thử lại.
                    </template>

                    <template v-else-if="!field.context">Chọn rạp trước.</template>

                    <template v-else-if="field.success && field.options.length === 0">
                      {{ field.empty }}
                    </template>
                  </span>
                </label>

                <label class="admin-reference__field">
                  <span>Định dạng suất chiếu *</span>

                  <select
                    class="admin-reference__input"
                    disabled
                    aria-describedby="showtime-format-help"
                  >
                    <option value="">Chưa có lựa chọn từ hệ thống</option>
                  </select>
                </label>

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
                  <span>Kết thúc dự kiến</span>

                  <input
                    class="admin-reference__input"
                    type="datetime-local"
                    readonly
                    :value="estimatedEnd"
                    aria-describedby="showtime-end-help"
                  />

                  <span id="showtime-end-help" class="showtime-create__hint">
                    {{
                      selectedMovie && !selectedMovie.durationMinutes
                        ? 'Phim chưa có thời lượng để ước tính kết thúc.'
                        : 'Ước tính theo thời lượng phim; chưa gồm thời gian đệm của rạp.'
                    }}
                  </span>
                </label>

                <div
                  id="showtime-format-help"
                  class="showtime-create__notice showtime-create__field-wide"
                >
                  Định dạng suất chiếu gồm loại trải nghiệm và phiên bản nội dung. Lựa chọn phải
                  được hệ thống xác nhận phù hợp với phòng và phim; hiện chưa có dữ liệu để chọn.
                </div>
              </fieldset>

              <p id="showtime-time-feedback" class="showtime-create__error" role="status">
                {{ timingError }}
              </p>

              <p id="showtime-time-help" class="showtime-create__hint">
                Thời gian theo giờ Việt Nam. Lịch trống của phòng chưa được xác nhận.
              </p>

              <p id="showtime-submit-help" class="showtime-create__hint">
                Hiện chưa thể lưu. Luồng tạo suất chiếu đang chờ hệ thống xác nhận định dạng, chính
                sách giá và phiên bản sơ đồ áp dụng.
              </p>

              <footer class="showtime-create__actions">
                <AppButton
                  type="button"
                  variant="secondary"
                  :disabled="loadingOptions"
                  :loading="loadingOptions"
                  @click="reloadOptions"
                >
                  Tải lại lựa chọn
                </AppButton>

                <RouterLink
                  class="admin-reference__link-button"
                  :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
                >
                  Hủy
                </RouterLink>

                <AppButton type="submit" disabled aria-describedby="showtime-submit-help">
                  Tạo suất chiếu
                </AppButton>
              </footer>
            </div>
          </section>

          <AdminShowtimePublishedLayout
            :room-id="selectedRoom?.id ?? ''"
            :room-name="selectedRoom?.name ?? ''"
            :can-read="canManage && canViewInventory"
          />
        </div>

        <aside aria-label="Xem trước chính sách giá">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-pricing-title"
          >
            <header class="showtime-create__panel-heading">
              <div>
                <p class="admin-reference__eyebrow">Preview từ Backend</p>
                <h2 id="showtime-pricing-title">Giá vé dự kiến</h2>
                <p>Giá phụ thuộc ngày, giờ, nhóm vé và loại ghế.</p>
              </div>

              <span class="showtime-create__badge">Chưa xác nhận policy</span>
            </header>

            <div class="showtime-create__panel-body">
              <dl class="showtime-create__summary">
                <div>
                  <dt>Ngày được phân loại</dt>
                  <dd>Chưa có dữ liệu</dd>
                </div>

                <div>
                  <dt>Khung giờ</dt>
                  <dd>Chưa có dữ liệu</dd>
                </div>

                <div>
                  <dt>Rạp</dt>
                  <dd>{{ selectedCinema?.name ?? 'Chưa chọn' }}</dd>
                </div>

                <div>
                  <dt>Tiền tệ</dt>
                  <dd>Chưa xác nhận</dd>
                </div>

                <div>
                  <dt>Định dạng</dt>
                  <dd>Chưa xác nhận</dd>
                </div>
              </dl>

              <p
                class="showtime-create__notice"
                :class="{ 'showtime-create__error': Boolean(catalogError) }"
                :role="catalogError ? 'alert' : 'status'"
              >
                {{ pricingStatus }}
              </p>

              <div
                class="showtime-create__table-scroll"
                role="region"
                aria-label="Bảng giá vé dự kiến"
                tabindex="0"
              >
                <table class="showtime-create__prices">
                  <caption class="admin-visually-hidden">
                    Giá từ chính sách của rạp theo nhóm vé và loại ghế
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Nhóm vé</th>
                      <th scope="col">Ghế</th>
                      <th scope="col">Giá tham khảo</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td colspan="3">Chưa có dữ liệu giá được xác nhận.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="showtime-create__notice">
                <strong>Phụ thu</strong>
                <p>
                  Chưa có dữ liệu phụ thu áp dụng cho suất chiếu. Mức tiền, đơn vị tính và điều kiện
                  cộng dồn sẽ được hiển thị theo chính sách từ hệ thống.
                </p>
              </div>

              <p class="showtime-create__hint">
                Giá preview chỉ mang tính tham khảo. Giá cuối cùng được Backend xác nhận khi lấy báo
                giá hoặc đặt vé.
              </p>
            </div>
          </section>
        </aside>
      </form>
    </template>
  </section>
</template>
