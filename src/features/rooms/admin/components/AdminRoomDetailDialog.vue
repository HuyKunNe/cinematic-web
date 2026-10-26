<script setup lang="ts">
import { computed, nextTick } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminRoomDetailQuery } from '../api/admin-room-queries'
import { useAdminRoomSeatsQuery } from '../api/admin-seat-queries'
import { adminRoomErrorMessage, adminRoomTypeLabel } from '../schemas/admin-room.schema'
import { adminSeatTypeOptions } from '../schemas/admin-seat-type-options'

const props = defineProps<{
  roomId: string
  roomName: string
  cinemaName: string
  returnFocusId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const room = useAdminRoomDetailQuery(() => props.roomId, canManage)
const roomId = computed(() => props.roomId)
const canLoadSeatMap = computed(() => canManage.value && room.data.value?.id === props.roomId)
const seatMap = useAdminRoomSeatsQuery(roomId, canLoadSeatMap)

const seatTypeLabels: Record<string, string> = {
  STANDARD: 'Tiêu chuẩn',
  VIP: 'VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Ghế hỗ trợ tiếp cận',
}

const seatTypeBreakdown = computed(() => {
  const seats = seatMap.data.value?.seats ?? []

  return adminSeatTypeOptions
    .map((option) => {
      const matchingSeats = seats.filter((seat) => seat.seatType === option.value)

      return {
        type: option.value,
        label: seatTypeLabels[option.value] ?? option.label,
        units: matchingSeats.length,
        capacity: matchingSeats.reduce((total, seat) => total + seat.capacity, 0),
      }
    })
    .filter((item) => item.units > 0)
})

function close() {
  emit('close')
}

function onOpenChange(open: boolean) {
  if (!open) close()
}

function focusCloseButton(event: Event) {
  event.preventDefault()
  document.getElementById('admin-room-detail-close')?.focus()
}

function restoreFocus(event: Event) {
  event.preventDefault()

  void nextTick(() => {
    const target =
      document.getElementById(props.returnFocusId) ?? document.getElementById('admin-rooms-title')

    target?.focus()
  })
}

function statusLabel(active?: boolean) {
  if (active === true) return 'Đang hoạt động'
  if (active === false) return 'Tạm ngưng'
  return 'Chưa xác định'
}
</script>

<template>
  <DialogRoot :open="true" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="admin-room-dialog__overlay" />

      <DialogContent
        class="admin-room-dialog"
        @open-auto-focus="focusCloseButton"
        @close-auto-focus="restoreFocus"
      >
        <header class="admin-room-dialog__heading">
          <div>
            <DialogTitle class="admin-room-dialog__title">
              {{ room.data.value?.name || roomName || 'Chi tiết phòng chiếu' }}
            </DialogTitle>
            <DialogDescription class="admin-rooms__muted">
              Thông tin phòng thuộc {{ cinemaName || 'cụm rạp chưa xác định' }}.
            </DialogDescription>
          </div>

          <AppButton id="admin-room-detail-close" variant="ghost" size="sm" @click="close">
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-rooms__error" role="alert">
          Tài khoản không có quyền xem thông tin quản lý phòng.
        </p>

        <div v-else-if="room.isFetching.value && !room.data.value" role="status">
          Đang tải thông tin phòng…
        </div>

        <div v-else-if="room.isError.value && !room.data.value" class="admin-rooms__feedback">
          <p class="admin-rooms__error" role="alert">
            {{ adminRoomErrorMessage(room.error.value) }}
          </p>
          <AppButton variant="secondary" :loading="room.isFetching.value" @click="room.refetch()">
            Thử lại
          </AppButton>
        </div>

        <template v-else-if="room.data.value?.id === roomId">
          <dl class="admin-room-detail__grid">
            <div>
              <dt>Cụm rạp</dt>
              <dd>{{ cinemaName || 'Chưa xác định' }}</dd>
            </div>
            <div>
              <dt>Loại phòng theo API</dt>
              <dd>{{ adminRoomTypeLabel(room.data.value.roomType) }}</dd>
            </div>
            <div>
              <dt>Định dạng nội dung</dt>
              <dd>
                {{
                  room.data.value.contentFormats?.length
                    ? room.data.value.contentFormats.join(' · ')
                    : 'Chưa cấu hình'
                }}
              </dd>
            </div>
            <div>
              <dt>Trạng thái phòng</dt>
              <dd>
                <span
                  class="admin-rooms__status"
                  :class="{
                    'is-active': room.data.value.active === true,
                    'is-paused': room.data.value.active === false,
                  }"
                >
                  {{ statusLabel(room.data.value.active) }}
                </span>
              </dd>
            </div>
            <div class="admin-room-detail__wide">
              <dt>Công nghệ trình chiếu / âm thanh</dt>
              <dd>
                BE hiện chưa có trường công nghệ riêng. Không thể tách công nghệ khỏi `roomType` một
                cách đáng tin cậy.
              </dd>
            </div>
          </dl>

          <section
            class="admin-room-detail__seats"
            aria-labelledby="admin-room-detail-seats-title"
            :aria-busy="seatMap.isFetching.value"
          >
            <header>
              <div>
                <h2 id="admin-room-detail-seats-title">Sức chứa và hạng ghế</h2>
                <p class="admin-rooms__muted">
                  Sức chứa tính theo số người; đơn vị ghế tính theo từng vị trí trong sơ đồ.
                </p>
              </div>
            </header>

            <p v-if="seatMap.isFetching.value && !seatMap.data.value" role="status">
              Đang tải sơ đồ ghế đã xuất bản…
            </p>

            <div v-else-if="seatMap.isError.value" class="admin-rooms__feedback">
              <p class="admin-rooms__error" role="alert">
                {{ adminRoomErrorMessage(seatMap.error.value, 'Không thể tải sơ đồ ghế.') }}
              </p>
              <AppButton
                variant="secondary"
                :loading="seatMap.isFetching.value"
                @click="seatMap.refetch()"
              >
                Thử lại sơ đồ
              </AppButton>
            </div>

            <template v-else-if="seatMap.data.value">
              <dl class="admin-room-detail__totals">
                <div>
                  <dt>Sức chứa</dt>
                  <dd>{{ seatMap.data.value.capacity }} chỗ</dd>
                </div>
                <div>
                  <dt>Đơn vị ghế</dt>
                  <dd>{{ seatMap.data.value.seats.length }} đơn vị</dd>
                </div>
              </dl>

              <div
                class="admin-rooms__table-scroll"
                role="region"
                aria-label="Sức chứa theo hạng ghế"
                tabindex="0"
              >
                <table class="admin-rooms__table">
                  <caption class="admin-visually-hidden">
                    Số đơn vị ghế và sức chứa theo từng hạng ghế trong sơ đồ đã xuất bản
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Hạng ghế</th>
                      <th scope="col">Đơn vị ghế</th>
                      <th scope="col">Sức chứa</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in seatTypeBreakdown" :key="item.type">
                      <th scope="row">{{ item.label }}</th>
                      <td>{{ item.units }}</td>
                      <td>{{ item.capacity }} chỗ</td>
                    </tr>
                    <tr v-if="!seatTypeBreakdown.length">
                      <td colspan="3" class="admin-rooms__empty">
                        Sơ đồ chưa có hạng ghế để thống kê.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="admin-rooms__muted">
                Ghế đôi là một đơn vị ghế nhưng có sức chứa hai người. Trạng thái ghế trong kho
                không đại diện cho tình trạng đặt chỗ của từng suất chiếu.
              </p>
            </template>

            <p v-else class="admin-rooms__muted" role="status">
              Phòng chưa có sơ đồ ghế đã xuất bản. Chưa thể thống kê sức chứa và hạng ghế.
            </p>
          </section>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
