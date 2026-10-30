<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_ROLES } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import {
  formatCinemaDateKey,
  formatCinemaTime,
  getCinemaDateKey,
} from '@/utils/cinema-time'
import {
  adminBookingErrorMessage,
  adminBookingStatusLabels,
  useAdminBookingsQuery,
  type AdminBookingListItem,
  type AdminBookingStatusFilter,
} from '../api/admin-booking-queries'

const auth = useAuthStore()

const canView = computed(
  () => auth.isAuthenticated && auth.hasRole(APP_ROLES.ADMIN),
)

const status = ref<AdminBookingStatusFilter>('')
const page = ref(0)

watch(
  status,
  () => {
    page.value = 0
  },
  { flush: 'sync' },
)

const query = useAdminBookingsQuery(
  canView,
  () => auth.subject ?? '',
  status,
  page,
)

const result = computed(() =>
  canView.value &&
  query.isSuccess.value &&
  !query.isFetching.value
    ? query.data.value
    : undefined,
)

const rows = computed(() => result.value?.content ?? [])
const statusOptions = Object.entries(adminBookingStatusLabels)

const rangeLabel = computed(() => {
  const current = result.value

  if (!current) return `Trang ${page.value + 1}`

  if (current.content.length === 0) {
    return `0 đơn trên trang này · Tổng ${current.page.totalElements} đơn phù hợp`
  }

  const first = current.page.page * current.page.size + 1
  const last = first + current.content.length - 1

  return `Hiển thị ${first}–${last} trong ${current.page.totalElements} đơn`
})

function createdAtLabel(value: string): string {
  return `${formatCinemaDateKey(getCinemaDateKey(value))} · ${formatCinemaTime(value)}`
}

function amountLabel(booking: AdminBookingListItem): string {
  if (booking.totalAmount === null || booking.currency === null) {
    return 'Chưa xác định'
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: booking.currency,
    maximumFractionDigits: 2,
  }).format(booking.totalAmount)
}

function seatsLabel(booking: AdminBookingListItem): string {
  if (booking.seats === null) return 'Chưa có thông tin ghế'
  return booking.seats.map((seat) => seat.seatNumber).join(', ') || 'Chưa có ghế'
}

function refresh(): void {
  if (!canView.value || query.isFetching.value) return
  void query.refetch()
}
</script>

<template>
  <section
    class="admin-reference is-bookings"
    data-reference="admin-bookings"
    aria-labelledby="admin-bookings-title"
  >
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Giao dịch</p>
        <h1 id="admin-bookings-title" tabindex="-1">Đơn đặt vé</h1>
        <p class="admin-reference__description">
          Tra cứu đơn đặt vé theo trạng thái.
        </p>
      </div>
    </header>

    <p
      v-if="!canView"
      class="admin-reference__note admin-bookings__error"
      role="alert"
    >
      Chỉ quản trị viên ADMIN được truy cập danh sách đơn.
    </p>

    <template v-else>
      <div
        class="admin-reference__filters admin-bookings__filters"
        aria-label="Lọc danh sách đơn"
      >
        <label class="admin-reference__field">
          <span>Trạng thái đơn</span>
          <select v-model="status" class="admin-reference__input">
            <option value="">Tất cả trạng thái</option>
            <option
              v-for="[value, label] in statusOptions"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>

        <AppButton
          variant="secondary"
          :disabled="query.isFetching.value"
          @click="refresh"
        >
          Tải lại
        </AppButton>
      </div>

      <p
        v-if="query.isError.value && !query.isFetching.value"
        class="admin-reference__note admin-bookings__error"
        role="alert"
      >
        {{ adminBookingErrorMessage(query.error.value) }}
      </p>

      <section
        class="admin-reference__panel"
        aria-labelledby="admin-bookings-list-title"
        :aria-busy="query.isFetching.value"
      >
        <header class="admin-reference__list-heading">
          <div>
            <h2 id="admin-bookings-list-title">Danh sách đơn</h2>
            <p>Đơn mới nhất trước · Thời gian Việt Nam</p>
          </div>
          <span v-if="result" class="admin-reference__muted">
            {{ result.page.totalElements }} đơn phù hợp
          </span>
        </header>

        <div
          class="admin-reference__table-scroll"
          role="region"
          aria-label="Danh sách đơn đặt vé"
          tabindex="0"
        >
          <table class="admin-reference__table">
            <thead>
              <tr>
                <th scope="col">Mã đơn / Ngày tạo</th>
                <th scope="col">Mã người đặt</th>
                <th scope="col">Mã suất chiếu</th>
                <th scope="col">Ghế</th>
                <th scope="col">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="query.isFetching.value || query.isPending.value">
                <td colspan="6" class="admin-reference__empty" role="status">
                  Đang tải danh sách đơn…
                </td>
              </tr>

              <tr v-else-if="query.isError.value">
                <td colspan="6" class="admin-reference__empty">
                  Chưa tải được danh sách. Bấm Tải lại để thử lại.
                </td>
              </tr>

              <tr v-else-if="rows.length === 0">
                <td colspan="6" class="admin-reference__empty">
                  Không có đơn trong trang và bộ lọc đang chọn.
                </td>
              </tr>

              <tr v-for="booking in rows" :key="booking.id">
                <td>
                  <span class="admin-bookings__id">{{ booking.id }}</span>
                  <small class="admin-bookings__meta">
                    {{ createdAtLabel(booking.createdAt) }}
                  </small>
                </td>
                <td>
                  <span class="admin-bookings__id">{{ booking.userId }}</span>
                </td>
                <td>
                  <span class="admin-bookings__id">{{ booking.showtimeId }}</span>
                </td>
                <td>
                  <span class="admin-bookings__seats">
                    {{ seatsLabel(booking) }}
                  </span>
                  <small class="admin-bookings__meta">
                    {{ booking.seatCount ?? '—' }} đơn vị ghế ·
                    {{ booking.capacity ?? '—' }} chỗ
                  </small>
                </td>
                <td class="admin-bookings__amount">
                  {{ amountLabel(booking) }}
                </td>
                <td>{{ adminBookingStatusLabels[booking.status] }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-reference__table-footer">
          <span>{{ rangeLabel }}</span>
          <nav class="admin-reference__pagination" aria-label="Phân trang đơn">
            <button
              type="button"
              aria-label="Trang trước"
              :disabled="query.isFetching.value || page === 0"
              @click="page--"
            >
              ‹
            </button>
            <span>
              {{ page + 1 }}
              <template v-if="result">
                / {{ Math.max(1, result.page.totalPages) }}
              </template>
            </span>
            <button
              type="button"
              aria-label="Trang tiếp theo"
              :disabled="!result || result.page.last || query.isFetching.value"
              @click="page++"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
    </template>
  </section>
</template>

<style scoped>
.admin-reference.is-bookings .admin-bookings__filters {
  display: flex;
  flex-wrap: wrap;
}

.admin-bookings__filters > .admin-reference__field {
  flex: 1 1 var(--admin-reference-preview-width);
}

.admin-bookings__error {
  color: var(--color-error);
}

.admin-bookings__id,
.admin-bookings__seats {
  display: block;
  max-width: var(--admin-reference-id-width);
  overflow-wrap: anywhere;
}

.admin-bookings__meta {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.admin-bookings__amount {
  white-space: nowrap;
}

.admin-reference__list-heading,
.admin-reference__table-footer,
.admin-reference__pagination {
  flex-wrap: wrap;
}

.admin-reference__pagination {
  align-items: center;
}

[data-reference='admin-bookings']
  :is(select, button, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>