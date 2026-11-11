<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppTimePicker from '@/components/ui/AppTimePicker.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { CalendarDays, Film, MapPin } from 'lucide-vue-next'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { instantToLocal } from '../schemas/admin-showtime-create.schema'
import { screeningVersionLabel, showtimeCreationErrorMessage } from '../api/admin-showtime-create'
import { useAdminShowtimeBatch } from '../composables/use-admin-showtime-batch'

const auth = useAuthStore()
const canManage = computed(
  () => auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE),
)
const canReadLayout = computed(() => auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE))
const batch = useAdminShowtimeBatch(canManage, canReadLayout)
const {
  cinemaId,
  movieId,
  holiday,
  dateInput,
  selectedRooms,
  options,
  preview,
  canSave,
  locked,
  error,
  createdCount,
  uncertain,
  checking,
} = batch
const { cinemas, movies, rooms, screeningVersions } = options
const contextError = batch.roomContexts.error
const catalogError = computed(
  () => Object.values(options).find((query) => query.isError.value)?.error.value,
)
const loading = computed(() => Object.values(options).some((query) => query.isFetching.value))
const invalidCount = computed(() => preview.value.filter((row) => row.errors.length).length)
const sending = batch.sending
const toastOpen = ref(false)
const toastMessage = ref('')
const toastVariant = ref<'success' | 'error' | 'info'>('info')
async function notify(message: string, variant: typeof toastVariant.value = 'error') {
  toastOpen.value = false
  await nextTick()
  toastMessage.value = message
  toastVariant.value = variant
  toastOpen.value = true
}
watch(error, (message) => {
  if (message) void notify(message)
})
watch(createdCount, (count) => {
  if (count) void notify(`Đã tạo thành công ${count} suất chiếu.`, 'success')
})
watch(
  catalogError,
  (cause) => {
    if (cause) void notify(showtimeCreationErrorMessage(cause))
  },
  { immediate: true },
)
watch(
  contextError,
  (cause) => {
    if (cause) void notify(showtimeCreationErrorMessage(cause))
  },
  { immediate: true },
)
const validationNotice = computed(() => {
  if (createdCount.value || uncertain.value || checking.value) return ''
  if (preview.value.length > batch.limit)
    return `Mỗi đợt tối đa ${batch.limit} suất. Hãy giảm số phòng hoặc khung giờ.`
  if (
    !batch.roomContexts.ready.value ||
    !selectedRooms.value.some((room) => room.times.some((slot) => slot.time))
  )
    return ''
  return invalidCount.value
    ? `${invalidCount.value} suất cần sửa. Kiểm tra chi tiết trong bảng trước khi tạo đợt.`
    : ''
})
watchDebounced(
  validationNotice,
  (message) => {
    if (message) void notify(message)
  },
  { debounce: 800 },
)
async function recheck() {
  await batch.recheck()
  if (!error.value) {
    if (validationNotice.value) void notify(validationNotice.value)
    else void notify('Đã kiểm tra lại lịch và cấu hình phòng.', 'info')
  }
}
function addTime(plan: (typeof selectedRooms.value)[number]) {
  if (!locked.value) plan.times.push({ id: crypto.randomUUID(), time: '' })
}
function roomName(id: string) {
  return rooms.data.value?.find((room) => room.id === id)?.name ?? 'phòng đã chọn'
}
const initialDate = dateInput.value
const dirty = computed(
  () =>
    !createdCount.value &&
    Boolean(
      cinemaId.value ||
      movieId.value ||
      dateInput.value !== initialDate ||
      holiday.value ||
      selectedRooms.value.length,
    ),
)
function leave() {
  if (checking.value || (locked.value && !uncertain.value && !createdCount.value)) return false
  return (
    (!dirty.value && !uncertain.value) ||
    window.confirm(
      uncertain.value
        ? 'Chưa xác định kết quả. Rời trang để kiểm tra danh sách suất chiếu?'
        : 'Bỏ đợt suất chiếu đang nhập để rời trang?',
    )
  )
}
function preventUnload(event: BeforeUnloadEvent) {
  if (dirty.value || uncertain.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
watch(
  [dirty, uncertain],
  ([changed, pending]) => {
    if (changed || pending) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)
onBeforeRouteLeave(leave)
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))
</script>

<template>
  <section
    class="admin-reference is-showtime-form showtime-batch"
    data-reference="admin-showtime-form"
    aria-labelledby="showtime-batch-title"
  >
    <header class="admin-reference__heading showtime-create__heading">
      <div>
        <p class="admin-reference__eyebrow">Lịch chiếu</p>
        <h1 id="showtime-batch-title">Tạo đợt suất chiếu</h1>
      </div>
      <RouterLink class="admin-reference__link-button" :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
        >Danh sách suất chiếu</RouterLink
      >
    </header>
    <p v-if="!canManage" class="showtime-create__error" role="alert">
      Bạn không có quyền tạo suất chiếu.
    </p>
    <template v-else>
      <p v-if="!canReadLayout" class="showtime-create__error" role="alert">
        Cần quyền đọc cấu hình phòng để xác nhận sơ đồ ghế.
      </p>
      <form
        class="showtime-batch__form"
        novalidate
        :aria-busy="checking"
        @submit.prevent="batch.save"
      >
        <section class="admin-reference__panel" aria-labelledby="batch-common-title">
          <header class="showtime-create__panel-heading">
            <div>
              <h2 id="batch-common-title">
                <span class="showtime-create__step">01</span> Thông tin đợt chiếu
              </h2>
              <p>Chọn một phim và một rạp cho tất cả suất trong ngày.</p>
            </div>
            <span class="showtime-create__badge">1 ngày chiếu</span>
          </header>
          <div class="showtime-create__panel-body showtime-batch__common">
            <fieldset class="showtime-batch__selection" :disabled="locked">
              <legend class="admin-visually-hidden">Phim và rạp</legend>
              <label class="admin-reference__field"
                ><span class="showtime-batch__field-label"
                  ><Film aria-hidden="true" /> Phim <span aria-hidden="true">*</span></span
                ><select
                  v-model="movieId"
                  class="admin-reference__input"
                  required
                  :disabled="movies.isFetching.value || movies.isError.value"
                >
                  <option value="">Chọn phim chiếu</option>
                  <option
                    v-for="movie in movies.data.value ?? []"
                    :key="movie.id"
                    :value="movie.id"
                  >
                    {{ movie.title }} · {{ movie.durationMinutes ?? '—' }} phút
                  </option>
                </select></label
              >
              <label class="admin-reference__field"
                ><span class="showtime-batch__field-label"
                  ><MapPin aria-hidden="true" /> Rạp <span aria-hidden="true">*</span></span
                ><select
                  v-model="cinemaId"
                  class="admin-reference__input"
                  required
                  :disabled="cinemas.isFetching.value || cinemas.isError.value"
                >
                  <option value="">Chọn rạp chiếu</option>
                  <option
                    v-for="cinema in cinemas.data.value ?? []"
                    :key="cinema.id"
                    :value="cinema.id"
                  >
                    {{ cinema.name }}
                  </option>
                </select></label
              >
            </fieldset>
            <fieldset class="showtime-batch__schedule" :disabled="locked">
              <legend class="admin-visually-hidden">Ngày chiếu và bảng giá</legend>
              <label class="admin-reference__field"
                ><span class="showtime-batch__field-label"
                  ><CalendarDays aria-hidden="true" /> Ngày chiếu
                  <span aria-hidden="true">*</span></span
                ><input v-model="dateInput" type="date" class="admin-reference__input" required
              /></label>
              <label class="showtime-batch__holiday-card"
                ><input v-model="holiday" type="checkbox" /><span
                  ><strong>Ngày lễ / Tết</strong
                  ><small>Áp dụng bảng giá lễ cho các suất trong ngày.</small></span
                ></label
              >
            </fieldset>
            <p v-if="loading" class="showtime-create__hint" role="status">Đang tải lựa chọn…</p>
            <AppButton v-if="catalogError" variant="secondary" :disabled="locked" @click="recheck"
              >Tải lại lựa chọn</AppButton
            >
          </div>
        </section>

        <section class="admin-reference__panel" aria-labelledby="batch-rooms-title">
          <header class="showtime-create__panel-heading">
            <div>
              <h2 id="batch-rooms-title">
                <span class="showtime-create__step">02</span> Phòng &amp; khung giờ
              </h2>
              <p>Chọn phiên bản phim và nhập khung giờ riêng cho từng phòng.</p>
            </div>
            <span class="showtime-create__badge">{{ selectedRooms.length }} phòng</span>
          </header>
          <div class="showtime-create__panel-body">
            <fieldset
              class="showtime-batch__room-options"
              :disabled="locked || !cinemaId || rooms.isFetching.value || rooms.isError.value"
            >
              <legend>Phòng trong rạp</legend>
              <label v-for="room in rooms.data.value ?? []" :key="room.id"
                ><input
                  type="checkbox"
                  :checked="selectedRooms.some((item) => item.roomId === room.id)"
                  @change="batch.toggleRoom(room.id)"
                />{{ room.name }}
                <small>{{ room.roomType }} · {{ room.contentFormats.join('/') }}</small></label
              >
            </fieldset>
            <p
              v-if="cinemaId && rooms.isSuccess.value && !rooms.data.value?.length"
              class="showtime-create__hint"
            >
              Rạp chưa có phòng đang hoạt động.
            </p>
            <article v-for="plan in selectedRooms" :key="plan.roomId" class="showtime-batch__room">
              <header>
                <h3>
                  {{
                    rooms.data.value?.find((room) => room.id === plan.roomId)?.name ??
                    'Phòng không còn khả dụng'
                  }}
                  <small>· {{ plan.times.length }} khung giờ</small>
                </h3>
                <AppButton
                  variant="ghost"
                  size="sm"
                  :disabled="locked"
                  @click="batch.toggleRoom(plan.roomId)"
                  >Bỏ phòng</AppButton
                >
              </header>
              <fieldset class="showtime-create__fields" :disabled="locked">
                <legend class="admin-visually-hidden">Cấu hình phòng</legend>
                <label class="admin-reference__field"
                  ><span>Phiên bản chiếu *</span
                  ><select
                    v-model="plan.versionId"
                    class="admin-reference__input"
                    :disabled="!movieId || screeningVersions.isFetching.value"
                  >
                    <option value="">Chọn phiên bản</option>
                    <option
                      v-for="version in batch.compatible(plan.roomId)"
                      :key="version.id"
                      :value="version.id"
                    >
                      {{ screeningVersionLabel(version) }}
                    </option>
                  </select></label
                >
                <label class="admin-reference__field"
                  ><span>Nghỉ sau mỗi suất (phút) *</span
                  ><input
                    v-model="plan.breakMinutes"
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    class="admin-reference__input"
                /></label>
              </fieldset>
              <p
                v-if="
                  movieId &&
                  screeningVersions.isSuccess.value &&
                  !batch.compatible(plan.roomId).length
                "
                class="showtime-create__error"
              >
                Không có phiên bản phù hợp với định dạng và công nghệ phòng.
              </p>
              <div class="showtime-batch__times">
                <div v-for="(slot, index) in plan.times" :key="slot.id">
                  <label class="admin-reference__field"
                    ><span>Giờ bắt đầu {{ index + 1 }}</span
                    ><AppTimePicker
                      v-model="slot.time"
                      :disabled="locked"
                      :aria-label="`Giờ ${index + 1} của ${roomName(plan.roomId)}`"
                  /></label>
                  <div class="showtime-batch__time-result">
                    <span>Kết thúc dự kiến</span
                    ><strong>{{ batch.slotTiming(plan, slot.time).endLabel }}</strong>
                  </div>
                  <div class="showtime-batch__time-result">
                    <span>Phòng sẵn sàng</span
                    ><strong>{{ batch.slotTiming(plan, slot.time).readyLabel }}</strong>
                  </div>
                  <AppButton
                    class="showtime-batch__remove-time"
                    variant="ghost"
                    size="sm"
                    :disabled="locked || plan.times.length === 1"
                    :aria-label="`Xóa giờ ${index + 1}`"
                    @click="plan.times = plan.times.filter((item) => item !== slot)"
                    >Xóa</AppButton
                  >
                </div>
              </div>
              <AppButton variant="secondary" size="sm" :disabled="locked" @click="addTime(plan)"
                >Thêm khung giờ</AppButton
              >
            </article>
            <AppButton v-if="contextError" variant="secondary" :disabled="locked" @click="recheck"
              >Tải lại lịch phòng</AppButton
            >
          </div>
        </section>

        <section class="admin-reference__panel" aria-labelledby="batch-preview-title">
          <header class="showtime-create__panel-heading">
            <div>
              <h2 id="batch-preview-title">
                <span class="showtime-create__step">03</span> Xem trước &amp; kiểm tra
              </h2>
              <p>Kiểm tra trùng lịch, gồm khoảng nghỉ và suất qua nửa đêm.</p>
            </div>
            <span class="showtime-create__badge"
              >{{ preview.length }} / {{ batch.limit }} suất</span
            >
          </header>
          <div class="showtime-create__panel-body">
            <p
              v-if="
                canReadLayout &&
                selectedRooms.length &&
                !batch.roomContexts.ready.value &&
                !contextError &&
                !createdCount
              "
              class="showtime-create__hint"
              role="status"
            >
              Đang xác nhận lịch và sơ đồ của các phòng…
            </p>
            <div
              v-if="preview.length"
              class="showtime-create__table-scroll"
              role="region"
              aria-label="Danh sách suất sẽ tạo"
              tabindex="0"
            >
              <table class="showtime-create__prices">
                <thead>
                  <tr>
                    <th scope="col">Ngày / phòng</th>
                    <th scope="col">Bắt đầu</th>
                    <th scope="col">Kết thúc / sẵn sàng</th>
                    <th scope="col">Kết quả kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in preview" :key="row.key">
                    <th scope="row">{{ row.date }}<br />Phòng: {{ row.roomName }}</th>
                    <td>{{ row.time || '—' }}</td>
                    <td>
                      {{ instantToLocal(row.endsAt).replace('T', ' ') || '—' }}<br />{{
                        instantToLocal(row.readyAt).replace('T', ' ') || '—'
                      }}
                    </td>
                    <td>
                      <span v-if="createdCount">Đã tạo</span>
                      <ul v-else-if="row.errors.length" class="showtime-batch__errors">
                        <li v-for="message in row.errors" :key="message">{{ message }}</li>
                      </ul>
                      <span v-else>Đủ thông tin</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="showtime-create__hint">
              Chọn ngày và phòng để xem danh sách suất chiếu.
            </p>
          </div>
        </section>
        <footer class="showtime-create__actions">
          <span class="showtime-batch__summary"
            >{{ selectedRooms.length }} phòng · {{ preview.length }} suất
            <span v-if="invalidCount && !createdCount">· {{ invalidCount }} suất cần sửa</span
            ><span v-if="createdCount"> · Đã tạo</span
            ><span v-else-if="uncertain"> · Chưa xác nhận kết quả</span></span
          >
          <AppButton
            v-if="!uncertain"
            variant="secondary"
            :disabled="locked || !cinemaId || !movieId"
            @click="recheck"
            >Kiểm tra lại lịch</AppButton
          >
          <AppButton v-if="uncertain" :disabled="sending" :loading="sending" @click="batch.retry"
            >Gửi lại cùng yêu cầu</AppButton
          >
          <AppButton
            v-else-if="!createdCount"
            type="submit"
            :disabled="!canSave"
            :loading="checking"
            >Tạo {{ preview.length }} suất chiếu</AppButton
          >
        </footer>
      </form>
    </template>
    <AppToast v-model:open="toastOpen" :message="toastMessage" :variant="toastVariant" />
  </section>
</template>
