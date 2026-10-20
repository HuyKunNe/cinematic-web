<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { getCinemaDateKey } from '@/utils/cinema-time'
import { useShowtimeCreationOptions } from '../api/admin-showtime-create'
import {
  instantToLocal,
  localToInstant,
  showtimeDraftSchema,
  type ShowtimeDraftValues,
} from '../schemas/admin-showtime-create.schema'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'

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

const startsAt = computed(() => localToInstant(`${form.date}T${form.startTime}`))

const timingError = computed(() =>
  form.date && form.startTime && !startsAt.value ? 'Ngày hoặc giờ bắt đầu không hợp lệ.' : '',
)

const estimatedEnd = computed(() => {
  const duration = selectedMovie.value?.durationMinutes
  if (!startsAt.value || !duration) return ''

  const milliseconds = Date.parse(startsAt.value) + duration * 60_000
  const end = new Date(milliseconds)

  if (!Number.isFinite(end.getTime())) return ''

  return instantToLocal(end.toISOString()).replace('T', ' ')
})

const previewContextReady = computed(
  () =>
    canManage.value &&
    Boolean(selectedCinema.value) &&
    Boolean(selectedRoom.value) &&
    Boolean(selectedMovie.value) &&
    showtimeDraftSchema.safeParse(form).success,
)

const choiceFields = computed(() => [
  {
    key: 'cinemaId' as const,
    label: 'Rạp',
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
    key: 'roomId' as const,
    label: 'Phòng',
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
  {
    key: 'movieId' as const,
    label: 'Phim',
    options: (movies.data.value ?? []).map((item) => ({
      value: item.id,
      label: item.title,
    })),
    loading: movies.isFetching.value,
    success: movies.isSuccess.value,
    error: movies.error.value,
    disabled: movies.isFetching.value || movies.isError.value,
    context: true,
    empty: 'Chưa có phim phù hợp trong danh mục.',
  },
])

const ticketCategoryLabels = [
  'Người lớn',
  'Trên 55 tuổi',
  'HSSV / U22 / Giáo viên',
  'Trẻ em',
] as const

const surchargeLabels = ['Ghế đôi', 'Phim bom tấn', 'Định dạng đặc biệt'] as const

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

  const requests: Promise<unknown>[] = [cinemas.refetch(), movies.refetch()]

  if (selectedCinema.value) {
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
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Lịch vận hành</p>
        <h1 id="showtime-create-title" tabindex="-1">Tạo suất chiếu</h1>
        <p class="admin-reference__description">Chọn rạp, phòng, phim và thời gian chiếu.</p>
      </div>

      <RouterLink class="admin-reference__link-button" :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }">
        Quay lại danh sách
      </RouterLink>
    </header>

    <p v-if="!canManage" class="showtime-create__error" role="alert">
      Bạn không có quyền quản lý suất chiếu.
    </p>

    <template v-else>
      <p id="showtime-capability-note" class="admin-reference__note">
        Chức năng xem trước giá và tạo suất chiếu theo chính sách rạp đang được cập nhật. Bạn có thể
        chọn thông tin lịch chiếu; hiện chưa thể lưu.
      </p>

      <form class="admin-reference__form-layout" @submit.prevent>
        <div class="showtime-create__column">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-info-title"
          >
            <h2 id="showtime-info-title">Thông tin suất chiếu</h2>
            <p class="admin-reference__description">
              Các trường có dấu * là bắt buộc. Thời gian theo giờ Việt Nam.
            </p>

            <fieldset class="admin-reference__form-fields showtime-create__fields">
              <legend class="admin-visually-hidden">Thông tin lịch chiếu</legend>

              <label
                v-for="field in choiceFields"
                :key="field.key"
                class="admin-reference__field"
                :class="{ 'is-wide': field.key === 'movieId' }"
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
                  <option v-for="option in field.options" :key="option.value" :value="option.value">
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
                  <template v-else-if="!field.context"> Chọn rạp trước. </template>
                  <template v-else-if="field.success && field.options.length === 0">
                    {{ field.empty }}
                  </template>
                </span>
              </label>

              <label class="admin-reference__field">
                <span>Ngày chiếu *</span>
                <input
                  v-model="form.date"
                  class="admin-reference__input"
                  type="date"
                  required
                  aria-describedby="showtime-time-feedback"
                />
              </label>

              <label class="admin-reference__field">
                <span>Giờ bắt đầu *</span>
                <input
                  v-model="form.startTime"
                  class="admin-reference__input"
                  type="time"
                  step="60"
                  required
                  :aria-invalid="Boolean(timingError)"
                  aria-describedby="showtime-time-feedback"
                />
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

              <label class="admin-reference__field">
                <span>Kết thúc dự kiến</span>
                <input
                  class="admin-reference__input"
                  type="text"
                  readonly
                  :value="estimatedEnd || 'Chưa đủ thông tin'"
                  aria-describedby="showtime-end-help"
                />
              </label>
            </fieldset>

            <p id="showtime-time-feedback" class="showtime-create__error" role="status">
              {{ timingError }}
            </p>

            <p id="showtime-end-help" class="admin-reference__description">
              Kết thúc dự kiến chỉ dựa trên thời lượng phim. Lịch trống của phòng và thời gian chính
              thức chưa được xác nhận.
            </p>

            <footer class="admin-reference__form-actions">
              <AppButton
                type="button"
                variant="secondary"
                :disabled="loadingOptions"
                :loading="loadingOptions"
                @click="reloadOptions"
              >
                Tải lại lựa chọn
              </AppButton>
            </footer>
          </section>

          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-pricing-title"
          >
            <h2 id="showtime-pricing-title">Giá vé dự kiến</h2>

            <p class="admin-reference__description" role="status">
              {{
                previewContextReady
                  ? 'Chức năng xem trước giá theo chính sách rạp chưa sẵn sàng.'
                  : 'Chọn rạp, phòng, phim, ngày và giờ để chuẩn bị xem giá.'
              }}
            </p>

            <table class="showtime-create__prices">
              <caption class="admin-visually-hidden">
                Giá theo nhóm vé; chưa có dữ liệu giá được xác nhận
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nhóm vé</th>
                  <th scope="col">Giá dự kiến</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="label in ticketCategoryLabels" :key="label">
                  <th scope="row">{{ label }}</th>
                  <td>Chưa có dữ liệu</td>
                </tr>
              </tbody>
            </table>

            <p class="admin-reference__description">
              Giá cuối cùng được xác nhận khi lấy báo giá hoặc đặt vé.
            </p>
          </section>
        </div>

        <aside class="showtime-create__column" aria-label="Cấu hình áp dụng">
          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-layout-title"
          >
            <h2 id="showtime-layout-title">Sơ đồ ghế áp dụng</h2>

            <p class="admin-reference__description" role="status">
              {{
                selectedRoom
                  ? 'Chức năng xác nhận sơ đồ sẽ gắn cho suất chiếu chưa sẵn sàng.'
                  : 'Chọn rạp và phòng trước.'
              }}
            </p>

            <p v-if="selectedRoom" class="admin-reference__description">
              Phòng đang chọn: {{ selectedRoom.name }}.
            </p>

            <RouterLink
              v-if="selectedRoom && canViewInventory"
              class="admin-reference__link-button showtime-create__link"
              :to="{
                name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
                params: { roomId: selectedRoom.id },
                query: { cinemaId: form.cinemaId },
              }"
            >
              Xem sơ đồ hiện tại của phòng
            </RouterLink>
          </section>

          <section
            class="admin-reference__panel showtime-create__panel"
            aria-labelledby="showtime-surcharges-title"
          >
            <h2 id="showtime-surcharges-title">Phụ thu có thể áp dụng</h2>

            <dl class="showtime-create__surcharges">
              <div v-for="label in surchargeLabels" :key="label">
                <dt>{{ label }}</dt>
                <dd>Chưa có dữ liệu</dd>
              </div>
            </dl>

            <p class="admin-reference__description">
              Mức phụ thu, đơn vị tính và điều kiện cộng dồn cần theo chính sách của rạp.
            </p>
          </section>

          <section
            class="admin-reference__panel showtime-create__panel"
            aria-label="Tạo suất chiếu"
          >
            <AppButton type="submit" disabled aria-describedby="showtime-capability-note">
              Tạo suất chiếu
            </AppButton>
          </section>
        </aside>
      </form>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-showtime-form'] .showtime-create__column {
  display: grid;
  min-width: 0;
  gap: var(--space-5);
  align-content: start;
}

[data-reference='admin-showtime-form'] .showtime-create__panel {
  padding: var(--space-5);
}

[data-reference='admin-showtime-form'] h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

[data-reference='admin-showtime-form'] .showtime-create__fields,
[data-reference='admin-showtime-form'] .showtime-create__link {
  margin-top: var(--space-4);
}

[data-reference='admin-showtime-form'] .showtime-create__error {
  color: var(--color-error);
}

[data-reference='admin-showtime-form'] [aria-invalid='true'] {
  border-color: var(--color-error);
}

[data-reference='admin-showtime-form'] .showtime-create__prices {
  width: 100%;
  margin-top: var(--space-4);
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

[data-reference='admin-showtime-form'] .showtime-create__prices :is(th, td) {
  padding: var(--space-3);
  border-bottom: var(--border-width-thin) solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
  text-align: left;
}

[data-reference='admin-showtime-form'] .showtime-create__surcharges {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
}

[data-reference='admin-showtime-form'] .showtime-create__surcharges > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

[data-reference='admin-showtime-form'] .showtime-create__surcharges dd {
  margin: 0;
}

[data-reference='admin-showtime-form'] :is(input, select, button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
