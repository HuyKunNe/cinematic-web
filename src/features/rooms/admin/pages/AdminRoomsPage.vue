<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { RoomResponse } from '@/services/api/generated/inventory-service/model'
import { useAuthStore } from '@/stores/auth.store'
import { MoreHorizontal, Plus } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useAdminRoomCatalogQuery,
  useAdminRoomCinemaQuery,
  useAdminRoomSummaryQuery,
  useSetAdminRoomActivityMutation,
} from '../api/admin-room-queries'
import AdminRoomEditorDialog from '../components/AdminRoomEditorDialog.vue'
import {
  adminRoomErrorMessage,
  adminRoomTypeLabel,
  normalizeAdminRoomSearch,
} from '../schemas/admin-room.schema'
import AdminRoomContentFormatsDialog from '../components/AdminRoomContentFormatsDialog.vue'
import type { RoomContentFormatsResponse } from '@/services/api/generated/inventory-service/model'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const cinemaId = ref(typeof route.query.cinemaId === 'string' ? route.query.cinemaId : '')
const search = ref('')
const activeFilter = ref('all')
const page = ref(1)
const pageSize = 10
const successMessage = ref('')
const activityError = ref('')

const cinemas = useAdminRoomCinemaQuery(canManage)
const cinemaOptions = computed(() =>
  (cinemas.data.value ?? [])
    .flatMap((cinema) =>
      cinema.id && cinema.name?.trim()
        ? [
            {
              value: cinema.id,
              label: cinema.name.trim() + (cinema.active === false ? ' · Tạm ngưng' : ''),
              active: cinema.active,
            },
          ]
        : [],
    )
    .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
)

const selectedCinema = computed(() =>
  cinemaOptions.value.find((cinema) => cinema.value === cinemaId.value),
)

const rooms = useAdminRoomCatalogQuery(() => selectedCinema.value?.value ?? '', canManage)
const roomActivity = useSetAdminRoomActivityMutation()
const summaryCinemaIds = computed(() =>
  (cinemas.data.value ?? []).flatMap((cinema) => (cinema.id ? [cinema.id] : [])),
)

const systemSummary = useAdminRoomSummaryQuery(
  summaryCinemaIds,
  () => canManage.value && !selectedCinema.value && cinemas.isSuccess.value,
)

const statistics = computed(() => {
  if (!selectedCinema.value) return systemSummary.counts.value

  const data = rooms.data.value
  if (data === undefined) return null

  return {
    total: data.length,
    active: data.filter((room) => room.active === true).length,
    inactive: data.filter((room) => room.active === false).length,
  }
})

const statisticsScope = computed(() => selectedCinema.value?.label ?? 'Toàn hệ thống')

const statisticsLoading = computed(() =>
  selectedCinema.value
    ? rooms.isFetching.value
    : cinemas.isFetching.value || systemSummary.isFetching.value,
)

const statisticsError = computed(() => {
  if (selectedCinema.value) {
    return rooms.isError.value ? rooms.error.value : null
  }
  if (cinemas.isError.value) return cinemas.error.value
  return systemSummary.error.value
})

function retryStatistics() {
  if (selectedCinema.value) {
    void rooms.refetch()
  } else if (cinemas.isError.value) {
    void cinemas.refetch()
  } else {
    void systemSummary.refresh()
  }
}

function roomActionId(id?: string) {
  return `admin-room-actions-${id ?? 'missing'}`
}

function preventRoomMenuFocus(event: Event) {
  if (editor.value || contentFormatsEditor.value) event.preventDefault()
}

const filtered = computed(() => {
  const words = normalizeAdminRoomSearch(search.value).split(/\s+/).filter(Boolean)

  return (rooms.data.value ?? []).filter((room) => {
    if (activeFilter.value !== 'all' && room.active !== (activeFilter.value === 'active')) {
      return false
    }

    const text = normalizeAdminRoomSearch(`${room.name ?? ''} ${room.id ?? ''}`)
    return words.every((word) => text.includes(word))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageNumbers = computed(() => {
  const count = Math.min(5, totalPages.value)
  const start = Math.min(Math.max(1, page.value - 2), totalPages.value - count + 1)
  return Array.from({ length: count }, (_, index) => start + index)
})
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const firstResult = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const lastResult = computed(() => Math.min(page.value * pageSize, filtered.value.length))

const hasData = computed(() => Boolean(selectedCinema.value) && rooms.data.value !== undefined)

watch(
  [cinemaId, search, activeFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(cinemaId, () => {
  successMessage.value = ''
  activityError.value = ''
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

const contentFormatsEditor = ref<{
  roomId: string
  roomName: string
  returnFocusId: string
} | null>(null)

function openContentFormats(room: RoomResponse) {
  if (!canManage.value || !room.id || roomActivity.isPending.value) return

  successMessage.value = ''
  contentFormatsEditor.value = {
    roomId: room.id,
    roomName: room.name || 'Phòng chiếu',
    returnFocusId: roomActionId(room.id),
  }
}

function contentFormatsSaved(_response?: RoomContentFormatsResponse) {
  contentFormatsEditor.value = null
  successMessage.value = 'Đã cập nhật định dạng nội dung phòng.'
}

function openSeats(room: RoomResponse) {
  const cinema = selectedCinema.value
  if (!canManage.value || !cinema || !room.id || roomActivity.isPending.value) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: room.id },
    query: { cinemaId: cinema.value },
  })
}

function openEditor(roomId: string | null = null) {
  const cinema = selectedCinema.value
  if (!canManage.value || !cinema || roomActivity.isPending.value) return
  if (!roomId && cinema.active !== true) return

  successMessage.value = ''
  editor.value = {
    cinemaId: cinema.value,
    cinemaName: cinema.label,
    roomId,
    returnFocusId: roomId ? roomActionId(roomId) : 'admin-room-create',
  }
}

async function changeRoomActivity(room: RoomResponse) {
  const cinema = selectedCinema.value

  if (
    !canManage.value ||
    !cinema ||
    !room.id ||
    typeof room.active !== 'boolean' ||
    roomActivity.isPending.value ||
    editor.value
  )
    return

  const active = !room.active
  activityError.value = ''
  successMessage.value = ''

  try {
    const updated = await roomActivity.mutateAsync({
      cinemaId: cinema.value,
      roomId: room.id,
      active,
    })

    successMessage.value = `Đã ${active ? 'kích hoạt' : 'tạm ngưng'} phòng ${updated.name || room.name || ''}.`
  } catch (error) {
    activityError.value = adminRoomErrorMessage(error, 'Không thể cập nhật trạng thái phòng.')
  }
}

function saved(room: RoomResponse) {
  const editing = Boolean(editor.value?.roomId)
  editor.value = null
  successMessage.value = `${editing ? 'Đã cập nhật' : 'Đã thêm'} phòng${room.name ? ` ${room.name}` : ''}.`
}

function resetFilters() {
  search.value = ''
  activeFilter.value = 'all'
}

const emptyMessage = computed(() => {
  if (!selectedCinema.value) return 'Chọn cụm rạp để xem danh sách phòng.'
  if (rooms.isFetching.value && !hasData.value) return 'Đang tải danh sách phòng…'
  if (rooms.isError.value && !hasData.value) return 'Chưa tải được danh sách phòng.'
  if (search.value || activeFilter.value !== 'all') {
    return 'Không có phòng phù hợp với bộ lọc.'
  }
  return 'Cụm rạp chưa có phòng chiếu.'
})
function statusLabel(active?: boolean) {
  if (active === true) return 'Đang hoạt động'
  if (active === false) return 'Tạm ngưng'
  return 'Chưa xác định'
}
</script>

<template>
  <section class="admin-rooms" aria-labelledby="admin-rooms-title">
    <header class="admin-rooms__heading">
      <div>
        <p class="admin-rooms__eyebrow">Cụm rạp · Phòng chiếu</p>
        <h1 id="admin-rooms-title" tabindex="-1">Quản lý phòng chiếu</h1>
        <p class="admin-rooms__muted">
          Theo dõi phòng chiếu và cập nhật loại phòng theo từng cụm rạp.
        </p>
      </div>
      <AppButton
        id="admin-room-create"
        :disabled="!canManage || selectedCinema?.active !== true || roomActivity.isPending.value"
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
      <section
        class="admin-rooms__stats"
        aria-label="Thống kê phòng chiếu"
        :aria-busy="statisticsLoading"
      >
        <article class="admin-rooms__stat">
          <span>Tổng phòng chiếu</span>
          <strong>{{ statistics?.total ?? '—' }}</strong>
          <small>{{ statisticsScope }}</small>
        </article>
        <article class="admin-rooms__stat">
          <span>Đang hoạt động</span>
          <strong>{{ statistics?.active ?? '—' }}</strong>
          <small>{{ statisticsScope }}</small>
        </article>
        <article class="admin-rooms__stat">
          <span>Tạm ngưng</span>
          <strong>{{ statistics?.inactive ?? '—' }}</strong>
          <small>{{ statisticsScope }}</small>
        </article>
      </section>

      <p v-if="statisticsLoading" class="admin-rooms__muted" role="status">
        Đang cập nhật thống kê…
      </p>

      <div v-if="statisticsError" class="admin-rooms__feedback">
        <p class="admin-rooms__error" role="alert">
          {{ adminRoomErrorMessage(statisticsError, 'Không thể tải đầy đủ thống kê phòng.') }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="statisticsLoading"
          @click="retryStatistics"
        >
          Thử lại
        </AppButton>
      </div>
      <p v-if="activityError" class="admin-rooms__error" role="alert">
        {{ activityError }}
      </p>
      <section class="admin-rooms__filters" aria-label="Tìm và lọc phòng">
        <label class="admin-rooms__field">
          <span>Tìm phòng</span>
          <input
            v-model="search"
            class="admin-rooms__input"
            type="search"
            placeholder="Nhập tên phòng"
            :disabled="!selectedCinema"
          />
        </label>

        <label class="admin-rooms__field" for="admin-room-cinema">
          <span>Cụm rạp</span>
          <select
            id="admin-room-cinema"
            v-model="cinemaId"
            class="admin-rooms__input"
            :disabled="
              roomActivity.isPending.value || (cinemas.isError.value && !cinemas.data.value)
            "
            :aria-busy="cinemas.isFetching.value"
          >
            <option value="">Chọn cụm rạp</option>
            <option v-for="item in cinemaOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="admin-rooms__field" for="admin-room-status-filter">
          <span>Trạng thái</span>
          <select
            id="admin-room-status-filter"
            v-model="activeFilter"
            class="admin-rooms__input"
            :disabled="!selectedCinema"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </label>

        <AppButton variant="secondary" @click="resetFilters">Đặt lại</AppButton>
      </section>

      <div v-if="cinemas.isError.value" class="admin-rooms__feedback">
        <p class="admin-rooms__error" role="alert">
          {{ adminRoomErrorMessage(cinemas.error.value, 'Không thể tải danh sách cụm rạp.') }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :loading="cinemas.isFetching.value"
          @click="cinemas.refetch()"
        >
          Tải lại cụm rạp
        </AppButton>
      </div>
      <p
        v-else-if="cinemas.isSuccess.value && !cinemaOptions.length"
        class="admin-rooms__muted"
        role="status"
      >
        Chưa có cụm rạp để quản lý phòng.
      </p>
      <p v-if="selectedCinema?.active === false" class="admin-rooms__muted" role="status">
        Rạp đang tạm ngưng. Bạn có thể xem và sửa thông tin phòng, nhưng chưa thể thêm phòng mới.
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
                  ? `Danh sách phòng tại ${selectedCinema.label}.`
                  : 'Chọn một cụm rạp để tải danh sách phòng chiếu.'
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
              Phòng thuộc cụm rạp đã chọn
            </caption>
            <thead>
              <tr>
                <th scope="col">Phòng chiếu</th>
                <th scope="col">Cụm rạp</th>
                <th scope="col">Định dạng</th>
                <th scope="col">Sức chứa</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span class="admin-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(room, index) in rows" :key="room.id ?? index">
                <td class="admin-rooms__name">
                  <strong>{{ room.name || 'Chưa có tên phòng' }}</strong>
                  <span class="admin-rooms__type">
                    {{ adminRoomTypeLabel(room.roomType) }}
                  </span>
                </td>
                <td>{{ selectedCinema?.label }}</td>
                <td>
                  <div v-if="room.contentFormats?.length" class="admin-rooms__formats">
                    <span
                      v-for="format in room.contentFormats"
                      :key="format"
                      class="admin-rooms__type"
                    >
                      {{ format }}
                    </span>
                  </div>
                  <span v-else class="admin-rooms__muted"> Chưa cấu hình </span>
                </td>
                <td>
                  <AdminRoomCapacityCell v-if="room.id" :key="room.id" :room-id="room.id" />
                  <span v-else aria-label="Không có mã phòng">—</span>
                </td>
                <td>
                  <span
                    class="admin-rooms__status"
                    :class="{
                      'is-active': room.active === true,
                      'is-paused': room.active === false,
                    }"
                  >
                    {{ statusLabel(room.active) }}
                  </span>
                </td>
                <td>
                  <DropdownMenuRoot :modal="false">
                    <DropdownMenuTrigger as-child>
                      <button
                        :id="roomActionId(room.id)"
                        class="admin-rooms__menu-trigger"
                        type="button"
                        :disabled="!canManage || !room.id || roomActivity.isPending.value"
                        :aria-label="`Thao tác với ${room.name || 'phòng'}`"
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuPortal>
                      <DropdownMenuContent
                        class="admin-room-menu"
                        align="end"
                        @close-auto-focus="preventRoomMenuFocus"
                      >
                        <DropdownMenuItem
                          class="admin-room-menu__item"
                          @select="room.id && openEditor(room.id)"
                        >
                          Sửa thông tin
                        </DropdownMenuItem>
                        <DropdownMenuItem class="admin-room-menu__item" @select="openSeats(room)">
                          Ghế của phòng
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="admin-room-menu__item"
                          :disabled="!room.id || roomActivity.isPending.value"
                          @select="openContentFormats(room)"
                        >
                          Định dạng nội dung
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          class="admin-room-menu__item"
                          :disabled="typeof room.active !== 'boolean'"
                          @select="changeRoomActivity(room)"
                        >
                          {{ room.active ? 'Tạm ngưng' : 'Kích hoạt' }}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenuRoot>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="6" class="admin-rooms__empty">{{ emptyMessage }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="hasData" class="admin-rooms__table-footer">
          <span>Hiển thị {{ firstResult }}–{{ lastResult }} trong {{ filtered.length }} phòng</span>
          <nav class="admin-rooms__pagination" aria-label="Phân trang phòng">
            <button type="button" aria-label="Trang trước" :disabled="page === 1" @click="page--">
              ‹
            </button>
            <button
              v-for="number in pageNumbers"
              :key="number"
              type="button"
              :class="{ 'is-current': page === number }"
              :aria-label="`Trang ${number}`"
              :aria-current="page === number ? 'page' : undefined"
              @click="page = number"
            >
              {{ number }}
            </button>
            <button
              type="button"
              aria-label="Trang tiếp theo"
              :disabled="page === totalPages"
              @click="page++"
            >
              ›
            </button>
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
    <AdminRoomContentFormatsDialog
      v-if="contentFormatsEditor"
      :key="contentFormatsEditor.roomId"
      :room-id="contentFormatsEditor.roomId"
      :room-name="contentFormatsEditor.roomName"
      :return-focus-id="contentFormatsEditor.returnFocusId"
      @close="contentFormatsEditor = null"
      @saved="contentFormatsSaved"
    />
  </section>
</template>
