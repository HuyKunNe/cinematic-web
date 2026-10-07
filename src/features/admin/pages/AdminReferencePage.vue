<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Info } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'

type Module = 'showtimes' | 'bookings' | 'users' | 'promotions' | 'showtime-form'

type Field = {
  id: string
  label: string
  type: 'search' | 'select' | 'date' | 'time' | 'text'
  placeholder?: string
  wide?: boolean
  required?: boolean
  readonly?: boolean
}

type Definition = {
  eyebrow: string
  title: string
  description: string
  action?: string
  stats: string[]
  fields: Field[]
  listTitle: string
  listDescription: string
  columns: string[]
}

const props = defineProps<{ module: Module }>()

const definitions: Record<Module, Definition> = {
  showtimes: {
    eyebrow: 'Lịch vận hành',
    title: 'Quản lý suất chiếu',
    description: 'Theo dõi và quản lý lịch chiếu tại các rạp.',
    action: 'Tạo suất chiếu',
    stats: [],
    fields: [
      { id: 'movie', label: 'Tìm phim', type: 'search', placeholder: 'Nhập tên phim' },
      { id: 'cinema', label: 'Rạp', type: 'select', placeholder: 'Tất cả rạp' },
      { id: 'room', label: 'Phòng', type: 'select', placeholder: 'Tất cả phòng' },
      { id: 'status', label: 'Trạng thái', type: 'select', placeholder: 'Tất cả trạng thái' },
    ],
    listTitle: 'Suất chiếu trong ngày',
    listDescription: 'Thông tin lịch chiếu và phòng chiếu',
    columns: ['Giờ chiếu', 'Phim', 'Rạp / Phòng', 'Định dạng', 'Trạng thái', 'Thao tác'],
  },
  bookings: {
    eyebrow: 'Giao dịch',
    title: 'Quản lý đặt vé',
    description: 'Tra cứu booking và trạng thái thanh toán.',
    stats: ['Tổng booking', 'Đã xác nhận', 'Đang xử lý', 'Đã hủy'],
    fields: [
      {
        id: 'search',
        label: 'Tìm booking',
        type: 'search',
        placeholder: 'Mã booking hoặc khách hàng',
      },
      {
        id: 'status',
        label: 'Trạng thái booking',
        type: 'select',
        placeholder: 'Tất cả trạng thái',
      },
      { id: 'payment', label: 'Thanh toán', type: 'select', placeholder: 'Tất cả' },
      { id: 'date', label: 'Ngày đặt', type: 'date' },
    ],
    listTitle: 'Danh sách booking',
    listDescription: 'Thông tin giao dịch và suất chiếu liên quan',
    columns: [
      'Booking',
      'Khách hàng',
      'Suất chiếu',
      'Ghế',
      'Tổng tiền',
      'Thanh toán',
      'Trạng thái',
      'Chi tiết',
    ],
  },
  users: {
    eyebrow: 'Tài khoản & quyền truy cập',
    title: 'Quản lý người dùng',
    description: 'Tra cứu tài khoản và vai trò trong hệ thống.',
    action: 'Thêm người dùng',
    stats: ['Tổng tài khoản', 'Khách hàng', 'Tài khoản quản trị'],
    fields: [
      {
        id: 'search',
        label: 'Tìm người dùng',
        type: 'search',
        placeholder: 'Tên, email hoặc mã tài khoản',
      },
      { id: 'role', label: 'Vai trò', type: 'select', placeholder: 'Tất cả vai trò' },
      { id: 'status', label: 'Trạng thái', type: 'select', placeholder: 'Tất cả trạng thái' },
    ],
    listTitle: 'Danh sách tài khoản',
    listDescription: 'Vai trò và trạng thái truy cập',
    columns: ['Người dùng', 'Vai trò', 'Ngày tạo', 'Hoạt động gần nhất', 'Trạng thái', 'Chi tiết'],
  },
  promotions: {
    eyebrow: 'Chiến dịch',
    title: 'Quản lý khuyến mãi',
    description: 'Tạo và theo dõi các chương trình ưu đãi.',
    action: 'Tạo khuyến mãi',
    stats: ['Đang diễn ra', 'Sắp bắt đầu', 'Đã kết thúc'],
    fields: [
      {
        id: 'search',
        label: 'Tìm chương trình',
        type: 'search',
        placeholder: 'Tên chương trình hoặc mã ưu đãi',
      },
      { id: 'status', label: 'Trạng thái', type: 'select', placeholder: 'Tất cả trạng thái' },
      { id: 'period', label: 'Thời gian', type: 'select', placeholder: 'Tất cả thời gian' },
    ],
    listTitle: 'Danh sách chương trình',
    listDescription: 'Mã ưu đãi, thời hạn và trạng thái áp dụng',
    columns: [
      'Chương trình',
      'Ưu đãi',
      'Phạm vi',
      'Thời hạn',
      'Lượt sử dụng',
      'Trạng thái',
      'Thao tác',
    ],
  },
  'showtime-form': {
    eyebrow: 'Lịch vận hành',
    title: 'Tạo suất chiếu',
    description: 'Chọn phim, rạp, phòng và thời gian chiếu.',
    stats: [],
    fields: [
      { id: 'cinema', label: 'Rạp', type: 'select', placeholder: 'Chọn rạp', required: true },
      {
        id: 'room',
        label: 'Phòng chiếu',
        type: 'select',
        placeholder: 'Chọn phòng',
        required: true,
      },
      {
        id: 'movie',
        label: 'Phim',
        type: 'select',
        placeholder: 'Chọn phim',
        required: true,
        wide: true,
      },
      { id: 'date', label: 'Ngày chiếu', type: 'date', required: true },
      { id: 'time', label: 'Giờ bắt đầu', type: 'time', required: true },
      {
        id: 'duration',
        label: 'Thời lượng phim',
        type: 'text',
        placeholder: 'Chưa chọn phim',
        readonly: true,
      },
      {
        id: 'ends',
        label: 'Giờ kết thúc dự kiến',
        type: 'text',
        placeholder: 'Chưa có thời gian',
        readonly: true,
      },
    ],
    listTitle: '',
    listDescription: '',
    columns: [],
  },
}

const definition = computed(() => definitions[props.module])
const isForm = computed(() => props.module === 'showtime-form')

const dayParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(new Date())

function part(type: string) {
  return dayParts.find((item) => item.type === type)?.value ?? ''
}

const today = `${part('year')}-${part('month')}-${part('day')}`

const preview = [
  { label: 'Phim', value: 'Chưa chọn phim' },
  { label: 'Rạp', value: 'Chưa chọn rạp' },
  { label: 'Phòng', value: 'Chưa chọn phòng' },
  { label: 'Ngày', value: 'Chưa chọn ngày' },
  { label: 'Thời gian', value: 'Chưa có thời gian' },
]
</script>

<template>
  <section class="admin-reference" :class="`is-${module}`" aria-labelledby="admin-reference-title">
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">{{ definition.eyebrow }}</p>
        <h1 id="admin-reference-title" tabindex="-1">{{ definition.title }}</h1>
        <p class="admin-reference__description">{{ definition.description }}</p>
      </div>

      <RouterLink
        v-if="isForm"
        class="admin-reference__link-button"
        :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
      >
        Quay lại danh sách
      </RouterLink>
      <RouterLink
        v-else-if="module === 'showtimes'"
        class="admin-reference__link-button is-primary"
        :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIME_CREATE }"
      >
        <span aria-hidden="true">＋</span>
        Tạo suất chiếu
      </RouterLink>
      <AppButton v-else-if="definition.action" disabled>
        <span aria-hidden="true">＋</span>
        {{ definition.action }}
      </AppButton>
    </header>

    <p id="admin-reference-note" class="admin-reference__note" role="status">
      <Info aria-hidden="true" />
      <span>Chức năng này chưa sẵn sàng để tra cứu hoặc lưu dữ liệu.</span>
    </p>

    <template v-if="!isForm">
      <section
        v-if="definition.stats.length"
        class="admin-reference__stats"
        aria-label="Số liệu tổng quan"
      >
        <article v-for="label in definition.stats" :key="label" class="admin-reference__stat">
          <span>{{ label }}</span>
          <strong>—</strong>
          <small>Chưa có số liệu</small>
        </article>
      </section>

      <section
        v-if="module === 'showtimes'"
        class="admin-reference__panel admin-reference__datebar"
        aria-label="Chọn ngày xem lịch"
      >
        <div class="admin-reference__datebar-title">
          <strong>Lịch chiếu</strong>
          <span class="admin-reference__muted">Chưa có dữ liệu lịch chiếu</span>
        </div>
        <div class="admin-reference__datebar-controls">
          <AppButton variant="secondary" disabled aria-label="Ngày trước">‹</AppButton>
          <AppButton variant="secondary" disabled>Hôm nay</AppButton>
          <input
            class="admin-reference__input"
            type="date"
            :value="today"
            disabled
            aria-label="Ngày xem lịch"
          />
          <AppButton variant="secondary" disabled aria-label="Ngày tiếp theo">›</AppButton>
        </div>
      </section>

      <fieldset
        class="admin-reference__filters"
        disabled
        aria-label="Bộ lọc"
        aria-describedby="admin-reference-note"
      >
        <label v-for="field in definition.fields" :key="field.id" class="admin-reference__field">
          <span>{{ field.label }}</span>
          <select v-if="field.type === 'select'" class="admin-reference__input">
            <option value="">{{ field.placeholder }}</option>
          </select>
          <input
            v-else
            class="admin-reference__input"
            :type="field.type"
            :placeholder="field.placeholder"
          />
        </label>
        <AppButton v-if="module === 'promotions'" variant="secondary" disabled> Đặt lại </AppButton>
      </fieldset>

      <section class="admin-reference__panel" aria-labelledby="admin-reference-list-title">
        <header class="admin-reference__list-heading">
          <div>
            <h2 id="admin-reference-list-title">{{ definition.listTitle }}</h2>
            <p>{{ definition.listDescription }}</p>
          </div>
          <span class="admin-reference__muted">Chưa có số liệu</span>
        </header>

        <div
          class="admin-reference__table-scroll"
          role="region"
          :aria-label="definition.listTitle"
          tabindex="0"
        >
          <table class="admin-reference__table">
            <caption class="admin-visually-hidden">
              {{
                definition.listTitle
              }}
            </caption>
            <thead>
              <tr>
                <th v-for="column in definition.columns" :key="column" scope="col">
                  <span
                    :class="{
                      'admin-visually-hidden': column === 'Thao tác' || column === 'Chi tiết',
                    }"
                  >
                    {{ column }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td :colspan="definition.columns.length" class="admin-reference__empty">
                  Chức năng tra cứu chưa sẵn sàng.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-reference__table-footer">
          <span>Chưa có dữ liệu để phân trang</span>
          <nav class="admin-reference__pagination" aria-label="Phân trang">
            <button type="button" disabled aria-label="Trang trước">‹</button>
            <button type="button" disabled aria-label="Trang tiếp theo">›</button>
          </nav>
        </footer>
      </section>
    </template>

    <form v-else class="admin-reference__form-layout" @submit.prevent>
      <section
        class="admin-reference__panel admin-reference__form"
        aria-labelledby="showtime-form-title"
      >
        <header>
          <h2 id="showtime-form-title">Thông tin suất chiếu</h2>
          <p class="admin-reference__description">Các trường bắt buộc được đánh dấu *</p>
        </header>

        <fieldset
          class="admin-reference__form-fields"
          disabled
          aria-describedby="admin-reference-note"
        >
          <label
            v-for="field in definition.fields"
            :key="field.id"
            class="admin-reference__field"
            :class="{ 'is-wide': field.wide }"
          >
            <span>{{ field.label }}<span v-if="field.required" aria-hidden="true"> *</span></span>
            <select v-if="field.type === 'select'" class="admin-reference__input">
              <option value="">{{ field.placeholder }}</option>
            </select>
            <input
              v-else
              class="admin-reference__input"
              :type="field.type"
              :placeholder="field.placeholder"
              :readonly="field.readonly"
            />
          </label>
        </fieldset>

        <footer class="admin-reference__form-actions">
          <RouterLink
            class="admin-reference__link-button"
            :to="{ name: ROUTE_NAMES.ADMIN_SHOWTIMES }"
          >
            Hủy
          </RouterLink>
          <AppButton type="submit" disabled>Lưu suất chiếu</AppButton>
        </footer>
      </section>

      <aside
        class="admin-reference__panel admin-reference__preview"
        aria-labelledby="showtime-preview-title"
      >
        <p class="admin-reference__eyebrow">Xem trước</p>
        <h2 id="showtime-preview-title">Lịch chiếu</h2>
        <dl>
          <div v-for="item in preview" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </aside>
    </form>
  </section>
</template>
