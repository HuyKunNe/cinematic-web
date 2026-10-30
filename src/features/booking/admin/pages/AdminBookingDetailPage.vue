<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { CINEMA_TIME_ZONE } from '@/utils/cinema-time'
import {
  adminBookingDetailErrorMessage,
  adminBookingDetailStatusLabels,
  useAdminBookingDetailQuery,
  type AdminBookingDetailSeat,
} from '../api/admin-booking-detail'

const route = useRoute()

const bookingId = computed(() =>
  typeof route.params.bookingId === 'string' ? route.params.bookingId : '',
)

const { canView, validId, query } = useAdminBookingDetailQuery(bookingId)

const booking = computed(() =>
  canView.value && validId.value && query.isSuccess.value && !query.isFetching.value
    ? query.data.value
    : undefined,
)

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: CINEMA_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
})

function dateTimeLabel(value: string | null): string {
  return value === null ? '—' : dateTimeFormat.format(new Date(value))
}

function moneyLabel(amount: number | null, currency: string | null): string {
  if (amount === null || currency === null) return 'Chưa xác định'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

const facts = computed(() => {
  const current = booking.value
  if (!current) return []

  return [
    { label: 'Mã đơn', value: current.id },
    { label: 'Trạng thái', value: adminBookingDetailStatusLabels[current.status] },
    { label: 'Mã người đặt', value: current.userId },
    { label: 'Mã suất chiếu', value: current.showtimeId },
    {
      label: 'Tổng tiền',
      value: moneyLabel(current.totalAmount, current.currency),
    },
    {
      label: 'Số đơn vị ghế',
      value: String(current.seatCount ?? 'Chưa xác định'),
    },
    {
      label: 'Sức chứa',
      value: current.capacity === null ? 'Chưa xác định' : `${current.capacity} chỗ`,
    },
    { label: 'Ngày tạo', value: dateTimeLabel(current.createdAt) },
    { label: 'Cập nhật lần cuối', value: dateTimeLabel(current.updatedAt) },
    { label: 'Hạn giữ ghế', value: dateTimeLabel(current.expiresAt) },
    { label: 'Đã xác nhận lúc', value: dateTimeLabel(current.confirmedAt) },
    { label: 'Đã hủy lúc', value: dateTimeLabel(current.cancelledAt) },
  ]
})

const seatTypeLabels: Record<string, string> = {
  STANDARD: 'Ghế thường',
  VIP: 'Ghế VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Ghế hỗ trợ tiếp cận',
}

function seatTypeLabel(value: string | null): string {
  return value === null ? 'Chưa xác định' : (seatTypeLabels[value] ?? value)
}

function unitLabel(value: AdminBookingDetailSeat['unit']): string {
  if (value === 'PAIR') return 'Cả cặp'
  if (value === 'SEAT') return 'Mỗi ghế'
  return 'Chưa xác định'
}

function reload(): void {
  if (!canView.value || !validId.value || query.isFetching.value) return
  void query.refetch()
}
</script>

<template>
  <section
    class="admin-reference is-bookings admin-booking-detail"
    aria-labelledby="admin-booking-detail-title"
  >
    <header class="admin-reference__heading">
      <div>
        <p class="admin-reference__eyebrow">Đơn đặt vé</p>
        <h1 id="admin-booking-detail-title" tabindex="-1">Chi tiết đơn đặt vé</h1>
        <p class="admin-reference__description">
          Thông tin đơn và giá vé đã lưu. Thời gian hiển thị theo giờ Việt Nam.
        </p>
      </div>

      <div class="admin-booking-detail__actions">
        <RouterLink class="admin-reference__link-button" :to="{ name: ROUTE_NAMES.ADMIN_BOOKINGS }">
          Về danh sách
        </RouterLink>
        <AppButton
          variant="secondary"
          :disabled="!canView || !validId || query.isFetching.value"
          @click="reload"
        >
          Tải lại
        </AppButton>
      </div>
    </header>

    <p v-if="!canView" class="admin-reference__note admin-booking-detail__error" role="alert">
      Chỉ quản trị viên ADMIN được xem chi tiết đơn.
    </p>

    <p v-else-if="!validId" class="admin-reference__note admin-booking-detail__error" role="alert">
      Mã đơn không hợp lệ. Mã đơn phải là UUID phiên bản 7.
    </p>

    <p
      v-else-if="query.isPending.value || query.isFetching.value"
      class="admin-reference__note"
      role="status"
    >
      Đang tải chi tiết đơn…
    </p>

    <p
      v-else-if="query.isError.value"
      class="admin-reference__note admin-booking-detail__error"
      role="alert"
    >
      {{ adminBookingDetailErrorMessage(query.error.value) }}
    </p>

    <template v-else-if="booking">
      <section class="admin-reference__panel" aria-labelledby="admin-booking-summary-title">
        <header class="admin-reference__list-heading">
          <h2 id="admin-booking-summary-title">Thông tin đơn</h2>
        </header>

        <dl class="admin-booking-detail__facts">
          <div v-for="fact in facts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="booking.rejectionReason" class="admin-reference__note">
        Lý do từ chối: {{ booking.rejectionReason }}
      </p>

      <section class="admin-reference__panel" aria-labelledby="admin-booking-seats-title">
        <header class="admin-reference__list-heading">
          <div>
            <h2 id="admin-booking-seats-title">Ghế trong đơn</h2>
            <p>Giá ghế đôi tính cho cả cặp.</p>
          </div>
        </header>

        <div
          class="admin-reference__table-scroll"
          role="region"
          aria-label="Ghế và giá vé đã lưu trong đơn"
          tabindex="0"
        >
          <table class="admin-reference__table">
            <thead>
              <tr>
                <th scope="col">Ghế</th>
                <th scope="col">Hạng ghế</th>
                <th scope="col">Nhóm vé</th>
                <th scope="col">Số chỗ</th>
                <th scope="col">Đơn vị tính</th>
                <th scope="col">Giá đã lưu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="booking.seats === null">
                <td colspan="6" class="admin-reference__empty">Chưa có thông tin ghế.</td>
              </tr>
              <tr v-else-if="booking.seats.length === 0">
                <td colspan="6" class="admin-reference__empty">Đơn chưa có ghế.</td>
              </tr>
              <tr v-for="seat in booking.seats ?? []" :key="seat.id">
                <td>{{ seat.seatNumber }}</td>
                <td>{{ seatTypeLabel(seat.seatType) }}</td>
                <td>
                  {{ seat.ticketGroupName ?? 'Chưa có tên nhóm vé' }}
                  <small v-if="seat.ticketGroupId" class="admin-booking-detail__group-id">
                    {{ seat.ticketGroupId }}
                  </small>
                </td>
                <td>{{ seat.capacity ?? 'Chưa xác định' }}</td>
                <td>{{ unitLabel(seat.unit) }}</td>
                <td class="admin-booking-detail__amount">
                  {{ moneyLabel(seat.price, booking.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.admin-booking-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-width: 100%;
}

.admin-booking-detail__error {
  color: var(--color-error);
}

.admin-booking-detail__facts {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--admin-reference-preview-width)), 1fr)
  );
  gap: var(--space-4);
  margin: 0;
  padding: 0 var(--space-5) var(--space-5);
}

.admin-booking-detail__facts > div {
  min-width: 0;
}

.admin-booking-detail__facts dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.admin-booking-detail__facts dd {
  margin: var(--space-1) 0 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}

.admin-booking-detail__group-id {
  display: block;
  max-width: var(--admin-reference-id-width);
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.admin-booking-detail__amount {
  white-space: nowrap;
}

.admin-booking-detail .admin-reference__list-heading {
  flex-wrap: wrap;
}

.admin-booking-detail :is(button, a, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
