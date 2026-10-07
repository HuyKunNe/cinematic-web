<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Building2, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model'
import AdminCinemaEditorDialog from '../components/AdminCinemaEditorDialog.vue'
import { useAdminCinemaCatalogQuery } from '../api/admin-cinema-queries'
import { adminCinemaErrorMessage } from '../schemas/admin-cinema.schema'
import AppAutocomplete from '@/components/ui/AppAutocomplete.vue'

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const catalog = useAdminCinemaCatalogQuery(canManage)
const search = ref('')
const city = ref('')
const page = ref(1)
const pageSize = 10
const successMessage = ref('')

const editor = ref<{
  cinemaId: string | null
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

  return (catalog.data.value ?? []).filter(
    (cinema) =>
      (!city.value || cinema.city?.trim() === city.value) &&
      normalize(`${cinema.name ?? ''} ${cinema.address ?? ''}`).includes(keyword),
  )
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
  [search, city],
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
  page.value = 1
}

function menuId(id?: string) {
  return `admin-cinema-actions-${id ?? 'missing'}`
}

function openCreate() {
  if (!canManage.value) return

  successMessage.value = ''
  editor.value = { cinemaId: null, returnFocusId: 'admin-cinema-create' }
}

function openEdit(id?: string) {
  if (!id || !canManage.value) return

  successMessage.value = ''
  editor.value = { cinemaId: id, returnFocusId: menuId(id) }
}

function preventMenuFocus(event: Event) {
  if (editor.value) event.preventDefault()
}

function saved(cinema: CinemaResponse) {
  const editing = Boolean(editor.value?.cinemaId)
  editor.value = null
  successMessage.value = `${editing ? 'Đã cập nhật' : 'Đã thêm'} rạp${cinema.name ? ` ${cinema.name}` : ''}.`
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
        <p class="admin-cinemas__eyebrow">Hệ thống rạp</p>
        <h1 id="admin-cinemas-title" tabindex="-1">Quản lý rạp chiếu</h1>
        <p class="admin-cinemas__description">
          Theo dõi danh sách và cập nhật thông tin các rạp đang hoạt động.
        </p>
      </div>

      <AppButton id="admin-cinema-create" :disabled="!canManage" @click="openCreate">
        <Plus aria-hidden="true" />
        Thêm rạp
      </AppButton>
    </header>

    <p v-if="successMessage" class="admin-cinemas__success" role="status">
      {{ successMessage }}
    </p>

    <p v-if="!canManage" class="admin-cinemas__error" role="alert">
      Tài khoản không có quyền quản lý rạp.
    </p>

    <template v-else>
      <section class="admin-cinemas__filters" aria-label="Tìm và lọc rạp">
        <label class="admin-cinemas__field admin-cinemas__search">
          <span>Tìm rạp</span>
          <input
            v-model="search"
            class="admin-cinemas__input"
            type="search"
            placeholder="Nhập tên rạp hoặc địa chỉ"
          />
        </label>

        <AppAutocomplete
          id="admin-cinema-city"
          v-model="city"
          label="Khu vực"
          all-label="Tất cả khu vực"
          content-class="admin-reference-autocomplete"
          :options="cities.map((item) => ({ value: item, label: item }))"
        />

        <label class="admin-cinemas__field">
          <span>Trạng thái</span>
          <select
            class="admin-cinemas__input"
            disabled
            aria-label="Danh sách chỉ gồm rạp đang hoạt động"
          >
            <option>Đang hoạt động</option>
          </select>
        </label>

        <AppButton variant="secondary" @click="resetFilters">Đặt lại</AppButton>
      </section>

      <section
        class="admin-cinemas__panel"
        aria-labelledby="admin-cinema-list-title"
        :aria-busy="catalog.isFetching.value"
      >
        <header class="admin-cinemas__list-heading">
          <div>
            <h2 id="admin-cinema-list-title">Danh sách rạp</h2>
            <p>Hiển thị các rạp đang hoạt động</p>
          </div>
          <span v-if="catalog.data.value" class="admin-cinemas__muted">
            {{ filtered.length }} kết quả
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
            Thử lại
          </AppButton>
        </div>

        <p v-else-if="catalog.isFetching.value" class="admin-cinemas__feedback" role="status">
          {{ catalog.data.value ? 'Đang cập nhật danh sách…' : 'Đang tải danh sách rạp…' }}
        </p>

        <div
          class="admin-cinemas__table-scroll"
          role="region"
          aria-label="Danh sách rạp"
          tabindex="0"
        >
          <table class="admin-cinemas__table">
            <caption class="admin-visually-hidden">
              Danh sách rạp đang hoạt động
            </caption>
            <thead>
              <tr>
                <th scope="col">Rạp</th>
                <th scope="col">Địa chỉ</th>
                <th scope="col">Khu vực</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span class="admin-visually-hidden">Thao tác</span></th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(cinema, index) in rows" :key="cinema.id ?? index">
                <td>
                  <div class="admin-cinemas__name">
                    <span class="admin-cinemas__avatar" aria-hidden="true">
                      <template v-if="initials(cinema.name)">{{ initials(cinema.name) }}</template>
                      <Building2 v-else />
                    </span>
                    <span>
                      <strong>{{ cinema.name || 'Chưa có tên rạp' }}</strong>
                      <small>Rạp chiếu phim</small>
                    </span>
                  </div>
                </td>
                <td>{{ cinema.address || '—' }}</td>
                <td>{{ cinema.city || '—' }}</td>
                <td>
                  <span
                    class="admin-cinemas__status"
                    :class="{
                      'is-active': cinema.active === true,
                      'is-paused': cinema.active === false,
                    }"
                  >
                    {{ statusLabel(cinema.active) }}
                  </span>
                </td>
                <td>
                  <DropdownMenuRoot>
                    <DropdownMenuTrigger as-child>
                      <button
                        :id="menuId(cinema.id)"
                        class="admin-cinemas__row-action"
                        type="button"
                        :disabled="!cinema.id"
                        :aria-label="`Thao tác với ${cinema.name || 'rạp'}`"
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent
                        class="admin-cinema-menu"
                        align="end"
                        @close-auto-focus="preventMenuFocus"
                      >
                        <DropdownMenuItem
                          class="admin-cinema-menu__item"
                          @select="openEdit(cinema.id)"
                        >
                          <Pencil aria-hidden="true" />
                          Sửa thông tin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </DropdownMenuRoot>
                </td>
              </tr>

              <tr v-if="!rows.length">
                <td colspan="5" class="admin-cinemas__empty">
                  {{
                    catalog.isPending.value
                      ? 'Đang tải danh sách…'
                      : catalog.isError.value && !catalog.data.value
                        ? 'Chưa tải được danh sách rạp.'
                        : search || city
                          ? 'Không có rạp phù hợp với bộ lọc.'
                          : 'Chưa có rạp đang hoạt động.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="catalog.data.value" class="admin-cinemas__table-footer">
          <span>Hiển thị {{ firstResult }}–{{ lastResult }} trong {{ filtered.length }} rạp</span>

          <nav class="admin-cinemas__pagination" aria-label="Phân trang rạp">
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
  </section>
</template>
