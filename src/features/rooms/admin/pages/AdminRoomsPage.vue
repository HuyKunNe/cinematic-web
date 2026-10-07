<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pencil, Plus } from 'lucide-vue-next'
import AppAutocomplete from '@/components/ui/AppAutocomplete.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type { RoomResponse } from '@/services/api/generated/inventory-service/model'
import AdminRoomEditorDialog from '../components/AdminRoomEditorDialog.vue'
import { useAdminRoomCatalogQuery, useAdminRoomCinemaQuery } from '../api/admin-room-queries'
import {
  adminRoomErrorMessage,
  adminRoomTypeLabel,
  adminRoomTypeOptions,
  normalizeAdminRoomSearch,
} from '../schemas/admin-room.schema'

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref('')
const search = ref('')
const roomType = ref('')
const page = ref(1)
const pageSize = 10
const successMessage = ref('')

const cinemas = useAdminRoomCinemaQuery(canManage)
const cinemaOptions = computed(() =>
  (cinemas.data.value ?? [])
    .flatMap((cinema) =>
      cinema.id && cinema.name?.trim() ? [{ value: cinema.id, label: cinema.name.trim() }] : [],
    )
    .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
)

const selectedCinema = computed(() =>
  cinemaOptions.value.find((cinema) => cinema.value === cinemaId.value),
)

const rooms = useAdminRoomCatalogQuery(() => selectedCinema.value?.value ?? '', canManage)

const filtered = computed(() => {
  const words = normalizeAdminRoomSearch(search.value).split(/\s+/).filter(Boolean)

  return (rooms.data.value ?? []).filter((room) => {
    if (roomType.value && room.roomType !== roomType.value) return false

    const text = normalizeAdminRoomSearch(`${room.name ?? ''} ${room.id ?? ''}`)
    return words.every((word) => text.includes(word))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const firstResult = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const lastResult = computed(() => Math.min(page.value * pageSize, filtered.value.length))
const distinctTypes = computed(
  () =>
    new Set((rooms.data.value ?? []).flatMap((room) => (room.roomType ? [room.roomType] : [])))
      .size,
)

const hasData = computed(() => Boolean(selectedCinema.value) && rooms.data.value !== undefined)

watch([cinemaId, search, roomType], () => {
  page.value = 1
})

watch(cinemaId, () => {
  successMessage.value = ''
})

watch(totalPages, (count) => {
  page.value = Math.min(page.value, count)
})

watch(cinemaOptions, (options) => {
  if (
    cinemas.isSuccess.value &&
    cinemaId.value &&
    !options.some((item) => item.value === cinemaId.value)
  ) {
    cinemaId.value = ''
  }
})

type EditorState = {
  cinemaId: string
  cinemaName: string
  roomId: string | null
  returnFocusId: string
}

const editor = ref<EditorState | null>(null)

function openEditor(roomId: string | null = null) {
  const cinema = selectedCinema.value
  if (!canManage.value || !cinema) return

  successMessage.value = ''
  editor.value = {
    cinemaId: cinema.value,
    cinemaName: cinema.label,
    roomId,
    returnFocusId: roomId ? `admin-room-edit-${roomId}` : 'admin-room-create',
  }
}

function saved(room: RoomResponse) {
  const editing = Boolean(editor.value?.roomId)
  editor.value = null
  successMessage.value = `${editing ? 'Đã cập nhật' : 'Đã thêm'} phòng${room.name ? ` ${room.name}` : ''}.`
}

function resetFilters() {
  search.value = ''
  roomType.value = ''
}

function statusLabel(active?: boolean) {
  if (active === true) return 'Đang hoạt động'
  if (active === false) return 'Tạm ngưng'
  return 'Chưa xác định'
}

const emptyMessage = computed(() => {
  if (!selectedCinema.value) return 'Chọn rạp để xem danh sách phòng.'
  if (rooms.isFetching.value && !hasData.value) return 'Đang tải danh sách phòng…'
  if (rooms.isError.value && !hasData.value) return 'Chưa tải được danh sách phòng.'
  if (search.value || roomType.value) return 'Không có phòng phù hợp với bộ lọc.'
  return 'Rạp chưa có phòng đang hoạt động.'
})
</script>

<template>
  <section class="admin-rooms" aria-labelledby="admin-rooms-title">
    <header class="admin-rooms__heading">
      <div>
        <p class="admin-rooms__eyebrow">Hệ thống rạp</p>
        <h1 id="admin-rooms-title" tabindex="-1">Quản lý phòng chiếu</h1>
        <p class="admin-rooms__muted">Theo dõi phòng chiếu và cập nhật loại phòng theo từng rạp.</p>
      </div>
      <AppButton
        id="admin-room-create"
        :disabled="!canManage || !selectedCinema"
        @click="openEditor()"
      >
        <Plus aria-hidden="true" />
        Thêm phòng
      </AppButton>
    </header>

    <p v-if="successMessage" class="admin-rooms__success" role="status">
      {{ successMessage }}
    </p>

    <p v-if="!canManage" class="admin-rooms__error" role="alert">
      Tài khoản không có quyền quản lý phòng.
    </p>

    <template v-else>
      <section class="admin-rooms__stats" aria-label="Thống kê phòng của rạp đã chọn">
        <article class="admin-rooms__stat">
          <span>Phòng hoạt động</span>
          <strong>{{ hasData ? rooms.data.value?.length : '—' }}</strong>
          <small>Trong rạp đã chọn</small>
        </article>
        <article class="admin-rooms__stat">
          <span>Loại phòng</span>
          <strong>{{ hasData ? distinctTypes : '—' }}</strong>
          <small>Trong danh sách đang hoạt động</small>
        </article>
        <article class="admin-rooms__stat">
          <span>Kết quả lọc</span>
          <strong>{{ hasData ? filtered.length : '—' }}</strong>
          <small>Theo tên và loại phòng</small>
        </article>
      </section>

      <section class="admin-rooms__filters" aria-label="Tìm và lọc phòng">
        <label class="admin-rooms__field">
          <span>Tìm phòng</span>
          <input
            v-model="search"
            class="admin-rooms__input"
            type="search"
            placeholder="Nhập tên hoặc ID phòng"
            :disabled="!selectedCinema"
          />
        </label>

        <AppAutocomplete
          id="admin-room-cinema"
          v-model="cinemaId"
          label="Rạp chiếu"
          all-label="Chọn rạp"
          :options="cinemaOptions"
          :loading="cinemas.isFetching.value"
        />

        <label class="admin-rooms__field">
          <span>Loại phòng</span>
          <select v-model="roomType" class="admin-rooms__input" :disabled="!selectedCinema">
            <option value="">Tất cả loại phòng</option>
            <option v-for="item in adminRoomTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <AppButton variant="secondary" @click="resetFilters">Đặt lại</AppButton>
      </section>

      <div v-if="cinemas.isError.value" class="admin-rooms__feedback">
        <p class="admin-rooms__error" role="alert">
          {{ adminRoomErrorMessage(cinemas.error.value, 'Không thể tải danh sách rạp.') }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :loading="cinemas.isFetching.value"
          @click="cinemas.refetch()"
        >
          Tải lại rạp
        </AppButton>
      </div>
      <p
        v-else-if="cinemas.isSuccess.value && !cinemaOptions.length"
        class="admin-rooms__muted"
        role="status"
      >
        Chưa có rạp đang hoạt động để quản lý phòng.
      </p>

      <section
        class="admin-rooms__panel"
        aria-labelledby="admin-room-list-title"
        :aria-busy="rooms.isFetching.value"
      >
        <header class="admin-rooms__list-heading">
          <div>
            <h2 id="admin-room-list-title">Danh sách phòng</h2>
            <p class="admin-rooms__muted">
              {{
                selectedCinema
                  ? `Phòng đang hoạt động tại ${selectedCinema.label}.`
                  : 'Chọn một rạp để tải danh sách.'
              }}
            </p>
          </div>
          <span v-if="hasData" class="admin-rooms__muted">{{ filtered.length }} kết quả</span>
        </header>

        <div v-if="selectedCinema && rooms.isError.value" class="admin-rooms__feedback">
          <p class="admin-rooms__error" role="alert">
            {{ adminRoomErrorMessage(rooms.error.value) }}
          </p>
          <p v-if="hasData" class="admin-rooms__muted">Đang hiển thị dữ liệu từ lần tải trước.</p>
          <AppButton
            variant="secondary"
            size="sm"
            :loading="rooms.isFetching.value"
            @click="rooms.refetch()"
          >
            Thử lại
          </AppButton>
        </div>
        <p
          v-else-if="selectedCinema && rooms.isFetching.value"
          class="admin-rooms__feedback"
          role="status"
        >
          {{ hasData ? 'Đang cập nhật danh sách…' : 'Đang tải danh sách phòng…' }}
        </p>

        <div
          class="admin-rooms__table-scroll"
          role="region"
          aria-label="Danh sách phòng chiếu"
          tabindex="0"
        >
          <table class="admin-rooms__table">
            <caption class="admin-visually-hidden">
              Phòng đang hoạt động của rạp đã chọn
            </caption>
            <thead>
              <tr>
                <th scope="col">Phòng</th>
                <th scope="col">Rạp chiếu</th>
                <th scope="col">Loại phòng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span class="admin-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(room, index) in rows" :key="room.id ?? index">
                <td class="admin-rooms__name">
                  <strong>{{ room.name || 'Chưa có tên phòng' }}</strong>
                  <small>{{ room.id || 'Chưa có ID' }}</small>
                </td>
                <td>{{ selectedCinema?.label }}</td>
                <td>
                  <span class="admin-rooms__type">{{ adminRoomTypeLabel(room.roomType) }}</span>
                </td>
                <td>
                  <span class="admin-rooms__status" :class="{ 'is-active': room.active === true }">
                    {{ statusLabel(room.active) }}
                  </span>
                </td>
                <td>
                  <AppButton
                    :id="`admin-room-edit-${room.id}`"
                    variant="ghost"
                    size="sm"
                    :disabled="!room.id"
                    :aria-label="`Sửa ${room.name || 'phòng'}`"
                    @click="room.id && openEditor(room.id)"
                  >
                    <Pencil aria-hidden="true" />
                    Sửa
                  </AppButton>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="5" class="admin-rooms__empty">{{ emptyMessage }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="hasData" class="admin-rooms__table-footer">
          <span>Hiển thị {{ firstResult }}–{{ lastResult }} trong {{ filtered.length }} phòng</span>
          <nav class="admin-rooms__pagination" aria-label="Phân trang phòng">
            <AppButton variant="secondary" size="sm" :disabled="page === 1" @click="page--">
              Trước
            </AppButton>
            <span aria-live="polite">Trang {{ page }}/{{ totalPages }}</span>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="page === totalPages"
              @click="page++"
            >
              Sau
            </AppButton>
          </nav>
        </footer>
      </section>
    </template>

    <AdminRoomEditorDialog
      v-if="editor"
      :key="`${editor.cinemaId}:${editor.roomId ?? 'create'}`"
      v-bind="editor"
      @close="editor = null"
      @saved="saved"
    />
  </section>
</template>
