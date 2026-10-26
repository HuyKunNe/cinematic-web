<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAdminRoomSummaryQuery } from '@/features/rooms/admin/api/admin-room-queries'
import { adminRoomErrorMessage } from '@/features/rooms/admin/schemas/admin-room.schema'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model'
import { useAuthStore } from '@/stores/auth.store'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminCinemaCatalogQuery } from '../api/admin-cinema-queries'
import AdminCinemaDetailDialog from '../components/AdminCinemaDetailDialog.vue'
import AdminCinemaEditorDialog from '../components/AdminCinemaEditorDialog.vue'
import { adminCinemaErrorMessage } from '../schemas/admin-cinema.schema'
import { ROUTE_NAMES } from '@/router/route-constants.ts'

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const catalog = useAdminCinemaCatalogQuery(canManage)
const cinemaIds = computed(() =>
  (catalog.data.value ?? []).flatMap((cinema) => (cinema.id ? [cinema.id] : [])),
)

const roomSummary = useAdminRoomSummaryQuery(
  cinemaIds,
  () => canManage.value && catalog.data.value !== undefined,
)
const search = ref('')
const city = ref('')
const activeFilter = ref('all')
const page = ref(1)
const pageSize = 10
const successMessage = ref('')
const router = useRouter()

const editor = ref<{
  cinemaId: string | null
  returnFocusId: string
} | null>(null)

const detailDialog = ref<{
  cinemaId: string
  returnFocusId: string
} | null>(null)

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
}

const cities = computed(() =>
  [
    ...new Set(
      (catalog.data.value ?? [])
        .map((cinema) => cinema.city?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'vi')),
)

const filtered = computed(() => {
  const keyword = normalize(search.value)

  return (catalog.data.value ?? []).filter((cinema) => {
    return (
      (!city.value || cinema.city?.trim() === city.value) &&
      (activeFilter.value === 'all' || cinema.active === (activeFilter.value === 'active')) &&
      normalize(`${cinema.name ?? ''} ${cinema.address ?? ''}`).includes(keyword)
    )
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

const pageNumbers = computed(() => {
  const count = Math.min(5, totalPages.value)
  const start = Math.min(Math.max(1, page.value - 2), totalPages.value - count + 1)

  return Array.from({ length: count }, (_, index) => start + index)
})

const firstResult = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const lastResult = computed(() => Math.min(page.value * pageSize, filtered.value.length))

watch(
  [search, city, activeFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(
  totalPages,
  (count) => {
    page.value = Math.min(page.value, count)
  },
  { flush: 'sync' },
)

watch(cities, (values) => {
  if (city.value && !values.includes(city.value)) city.value = ''
})

function resetFilters() {
  search.value = ''
  city.value = ''
  activeFilter.value = 'all'
  page.value = 1
}

function detailActionId(id?: string) {
  return `admin-cinema-detail-${id ?? 'missing'}`
}

function editActionId(id?: string) {
  return `admin-cinema-edit-${id ?? 'missing'}`
}

function openCreate() {
  if (!canManage.value) return

  successMessage.value = ''
  editor.value = { cinemaId: null, returnFocusId: 'admin-cinema-create' }
}

function openEdit(id?: string) {
  if (!id || !canManage.value) return

  successMessage.value = ''
  editor.value = { cinemaId: id, returnFocusId: editActionId(id) }
}

function openDetail(id?: string) {
  if (!id || !canManage.value) return

  successMessage.value = ''
  detailDialog.value = {
    cinemaId: id,
    returnFocusId: detailActionId(id),
  }
}

function openRooms(cinemaId?: string) {
  if (!canManage.value || !cinemaId) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOMS,
    query: { cinemaId },
  })
}

function roomCount(cinemaId: string | undefined, key: 'total' | 'active' | 'inactive') {
  if (!cinemaId) return '—'

  const counts = roomSummary.countsByCinema.value.get(cinemaId)
  if (counts) return String(counts[key])

  if (roomSummary.isFetching.value) return '…'
  if (roomSummary.error.value) return 'Chưa tải'

  return '—'
}

function saved(cinema: CinemaResponse) {
  const editing = Boolean(editor.value?.cinemaId)
  editor.value = null
  successMessage.value = `${editing ? 'Đã cập nhật' : 'Đã thêm'} cụm rạp${cinema.name ? ` ${cinema.name}` : ''}.`
}

function initials(name?: string) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0] ?? '')
    .join('')
    .toLocaleUpperCase('vi')
}

function statusLabel(active?: boolean) {
  if (active === true) return 'Đang hoạt động'
  if (active === false) return 'Tạm ngưng'
  return 'Chưa xác định'
}
</script>

<template>
  <section class="admin-cinemas" aria-labelledby="admin-cinemas-title">
    <header class="admin-cinemas__heading">
      <div>
        <p class="admin-cinemas__eyebrow">Cụm rạp</p>
        <h1 id="admin-cinemas-title" tabindex="-1">Quản lý cụm rạp</h1>
        <p class="admin-cinemas__description">
          Theo dõi các địa điểm và trạng thái hoạt động của cụm rạp.
        </p>
      </div>

      <AppButton id="admin-cinema-create" :disabled="!canManage" @click="openCreate">
        <Plus aria-hidden="true" />
        Thêm cụm rạp
      </AppButton>
    </header>

    <p v-if="successMessage" class="admin-cinemas__success" role="status">
      {{ successMessage }}
    </p>

    <p v-if="!canManage" class="admin-cinemas__error" role="alert">
      Tài khoản không có quyền quản lý cụm rạp.
    </p>

    <template v-else>
      <section class="admin-cinemas__filters" aria-label="Tìm và lọc rạp">
        <label class="admin-cinemas__field admin-cinemas__search">
          <span>Tìm cụm rạp</span>
          <input
            v-model="search"
            class="admin-cinemas__input"
            type="search"
            placeholder="Nhập tên cụm rạp hoặc địa chỉ"
          />
        </label>

        <label class="admin-cinemas__field" for="admin-cinema-city-filter">
          <span>Khu vực</span>
          <select id="admin-cinema-city-filter" v-model="city" class="admin-cinemas__input">
            <option value="">Tất cả khu vực</option>
            <option v-for="item in cities" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </label>

        <label class="admin-cinemas__field" for="admin-cinema-status-filter">
          <span>Trạng thái</span>
          <select
            id="admin-cinema-status-filter"
            v-model="activeFilter"
            class="admin-cinemas__input"
            aria-label="Lọc trạng thái cụm rạp"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </label>

        <AppButton variant="secondary" @click="resetFilters">Đặt lại</AppButton>
      </section>

      <section
        class="admin-cinemas__panel"
        aria-labelledby="admin-cinema-list-title"
        :aria-busy="catalog.isFetching.value || roomSummary.isFetching.value"
      >
        <header class="admin-cinemas__list-heading">
          <div>
            <h2 id="admin-cinema-list-title">Danh sách cụm rạp</h2>
            <p>Thông tin địa điểm và số lượng phòng chiếu theo dữ liệu hiện có.</p>
          </div>
          <span v-if="catalog.data.value" class="admin-cinemas__muted">
            {{ filtered.length }} cụm rạp
          </span>
        </header>

        <div v-if="catalog.isError.value" class="admin-cinemas__feedback">
          <p class="admin-cinemas__error" role="alert">
            {{ adminCinemaErrorMessage(catalog.error.value) }}
          </p>
          <p v-if="catalog.data.value" class="admin-cinemas__muted">
            Đang hiển thị dữ liệu từ lần tải trước.
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            :loading="catalog.isFetching.value"
            @click="catalog.refetch()"
          >
            Thử lại danh sách
          </AppButton>
        </div>

        <div v-if="roomSummary.error.value" class="admin-cinemas__feedback">
          <p class="admin-cinemas__error" role="alert">
            {{ adminRoomErrorMessage(roomSummary.error.value, 'Không thể tải thống kê phòng.') }}
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            :loading="roomSummary.isFetching.value"
            @click="roomSummary.refresh()"
          >
            Thử lại số liệu phòng
          </AppButton>
        </div>

        <p
          v-if="catalog.isFetching.value && !catalog.data.value"
          class="admin-cinemas__feedback"
          role="status"
        >
          Đang tải danh sách cụm rạp…
        </p>

        <div v-if="rows.length" class="admin-cinema-cards">
          <article v-for="cinema in rows" :key="cinema.id" class="admin-cinema-card">
            <header class="admin-cinema-card__heading">
              <div class="admin-cinema-card__cover">
                <span class="admin-cinema-card__city">
                  {{ cinema.city || 'Chưa cập nhật thành phố' }}
                </span>

                <span
                  class="admin-cinemas__status"
                  :class="{
                    'is-active': cinema.active === true,
                    'is-paused': cinema.active === false,
                  }"
                >
                  {{ statusLabel(cinema.active) }}
                </span>
              </div>
            </header>

            <div class="admin-cinema-card__body">
              <h3>{{ cinema.name || 'Chưa có tên cụm rạp' }}</h3>

              <p class="admin-cinema-card__address">
                <strong>Địa chỉ</strong>
                <span>{{ cinema.address || 'Chưa cập nhật' }}</span>
              </p>

              <dl class="admin-cinema-card__stats" aria-label="Thống kê phòng chiếu">
                <div>
                  <dt>Tổng phòng</dt>
                  <dd>{{ roomCount(cinema.id, 'total') }}</dd>
                </div>
                <div>
                  <dt>Đang hoạt động</dt>
                  <dd>{{ roomCount(cinema.id, 'active') }}</dd>
                </div>
                <div>
                  <dt>Tạm ngưng</dt>
                  <dd>{{ roomCount(cinema.id, 'inactive') }}</dd>
                </div>
              </dl>

              <div class="admin-cinema-card__contact">
                <p>
                  <strong>Điện thoại</strong>
                  <span>{{ cinema.phone || 'Chưa cập nhật' }}</span>
                </p>
                <p>
                  <strong>Giờ mở cửa</strong>
                  <span>{{ cinema.openingHours || 'Chưa cập nhật' }}</span>
                </p>
              </div>

              <footer class="admin-cinema-card__actions">
                <AppButton
                  :id="detailActionId(cinema.id)"
                  variant="secondary"
                  :disabled="!cinema.id"
                  @click="openDetail(cinema.id)"
                >
                  Chi tiết cụm rạp
                </AppButton>
                <AppButton variant="secondary" :disabled="!cinema.id" @click="openRooms(cinema.id)">
                  Quản lý phòng & ghế
                </AppButton>
                <AppButton
                  :id="editActionId(cinema.id)"
                  variant="ghost"
                  :disabled="!cinema.id"
                  @click="openEdit(cinema.id)"
                >
                  Chỉnh sửa
                </AppButton>
              </footer>
            </div>
          </article>
        </div>

        <p v-else class="admin-cinemas__empty" role="status">
          {{
            catalog.isPending.value
              ? 'Đang tải danh sách…'
              : catalog.isError.value && !catalog.data.value
                ? 'Chưa tải được danh sách cụm rạp.'
                : search || city || activeFilter !== 'all'
                  ? 'Không có cụm rạp phù hợp với bộ lọc.'
                  : 'Chưa có cụm rạp.'
          }}
        </p>

        <footer v-if="catalog.data.value" class="admin-cinemas__table-footer">
          <span
            >Hiển thị {{ firstResult }}–{{ lastResult }} trong {{ filtered.length }} cụm rạp</span
          >

          <nav class="admin-cinemas__pagination" aria-label="Phân trang cụm rạp">
            <button type="button" aria-label="Trang trước" :disabled="page === 1" @click="page--">
              <ChevronLeft aria-hidden="true" />
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
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        </footer>
      </section>
    </template>

    <AdminCinemaEditorDialog
      v-if="editor"
      :key="editor.cinemaId ?? 'create'"
      :cinema-id="editor.cinemaId"
      :return-focus-id="editor.returnFocusId"
      @close="editor = null"
      @saved="saved"
    />
    <AdminCinemaDetailDialog
      v-if="detailDialog"
      :key="detailDialog.cinemaId"
      :cinema-id="detailDialog.cinemaId"
      :return-focus-id="detailDialog.returnFocusId"
      @close="detailDialog = null"
    />
  </section>
</template>
