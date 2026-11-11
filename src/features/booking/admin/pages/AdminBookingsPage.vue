<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { RouterLink } from 'vue-router'
import { ROUTE_NAMES } from '@/router/route-constants'
import { APP_ROLES } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { formatCinemaDateKey, formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import {
  adminBookingErrorMessage,
  adminBookingStatusLabels,
  useAdminBookingsQuery,
  type AdminBookingListItem,
  type AdminBookingStatusFilter,
} from '../api/admin-booking-queries'

const auth = useAuthStore()

const canView = computed(() => auth.isAuthenticated && auth.hasRole(APP_ROLES.ADMIN))

const status = ref<AdminBookingStatusFilter>('')
const page = ref(0)

watch(
  status,
  () => {
    page.value = 0
  },
  { flush: 'sync' },
)

const query = useAdminBookingsQuery(canView, () => auth.subject ?? '', status, page)

const result = computed(() =>
  canView.value && query.isSuccess.value && !query.isFetching.value ? query.data.value : undefined,
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
        <p class="admin-reference__description">Tra cứu đơn đặt vé theo trạng thái.</p>
      </div>
    </header>

    <p v-if="!canView" class="admin-reference__note admin-bookings__error" role="alert">
      Chỉ quản trị viên ADMIN được truy cập danh sách đơn.
    </p>

    <template v-else>
      <div class="admin-reference__filters admin-bookings__filters" aria-label="Lọc danh sách đơn">
        <label class="admin-reference__field">
          <span>Trạng thái đơn</span>
          <select v-model="status" class="admin-reference__input">
            <option value="">Tất cả trạng thái</option>
            <option v-for="[value, label] in statusOptions" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>

        <AppButton variant="secondary" :disabled="query.isFetching.value" @click="refresh">
          Tải lại
        </AppButton>
        <AppButton variant="ghost" :disabled="!status" @click="status = ''">Xóa bộ lọc</AppButton>
      </div>

      <div v-if="status" class="admin-bookings__active-filter">
        <span>Đang lọc: {{ adminBookingStatusLabels[status] }}</span>
        <button
          type="button"
          class="admin-bookings__clear-filter"
          :aria-label="`Bỏ lọc ${adminBookingStatusLabels[status]}`"
          @click="status = ''"
        >
          ×
        </button>
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
                  {{
                    status
                      ? 'Không có đơn phù hợp với trạng thái đã chọn.'
                      : page > 0
                        ? 'Trang này không còn đơn đặt vé.'
                        : 'Chưa có đơn đặt vé.'
                  }}
                  <div v-if="status">
                    <AppButton variant="ghost" size="sm" @click="status = ''"
                      >Xem tất cả trạng thái</AppButton
                    >
                  </div>
                  <div v-else-if="page > 0">
                    <AppButton variant="ghost" size="sm" @click="page = 0">Về trang đầu</AppButton>
                  </div>
                </td>
              </tr>

              <tr v-for="booking in rows" :key="booking.id">
                <td>
                  <RouterLink
                    class="admin-bookings__id admin-bookings__detail-link"
                    :to="{
                      name: ROUTE_NAMES.ADMIN_BOOKING_DETAIL,
                      params: { bookingId: booking.id },
                    }"
                    :aria-label="`Xem chi tiết đơn ${booking.id}`"
                    >{{ booking.id }}</RouterLink
                  >
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
                    {{ booking.seatCount ?? '—' }} đơn vị ghế · {{ booking.capacity ?? '—' }} chỗ
                  </small>
                </td>
                <td class="admin-bookings__amount">
                  {{ amountLabel(booking) }}
                </td>
                <td>
                  <span class="admin-status" :data-status="booking.status">
                    {{ adminBookingStatusLabels[booking.status] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-reference__table-footer">
          <span role="status" aria-live="polite">{{ rangeLabel }}</span>
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
              <template v-if="result"> / {{ Math.max(1, result.page.totalPages) }} </template>
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
.admin-bookings__active-filter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-self: start;
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.admin-bookings__clear-filter {
  display: grid;
  place-items: center;
  width: var(--space-7);
  height: var(--space-7);
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  cursor: pointer;
}
.admin-bookings__detail-link {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: var(--space-1);
  font-weight: var(--font-weight-medium);
}
.admin-bookings__detail-link:hover {
  color: var(--color-primary-hover);
}
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

[data-reference='admin-bookings'] :is(select, button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
