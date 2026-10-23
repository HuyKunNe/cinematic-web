<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import AdminRoomCapacityCell from '@/features/rooms/admin/components/AdminRoomCapacityCell.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminCinemaDetailQuery } from '../api/admin-cinema-queries'
import { useAdminRoomCatalogQuery } from '@/features/rooms/admin/api/admin-room-queries'
import { adminCinemaErrorMessage } from '../schemas/admin-cinema.schema'
import {
  adminRoomErrorMessage,
  adminRoomTypeLabel,
} from '@/features/rooms/admin/schemas/admin-room.schema'

const props = defineProps<{
  cinemaId: string
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

const activeTab = ref<'overview' | 'rooms' | 'amenities' | undefined>('overview')
const cinemaId = computed(() => props.cinemaId)

const cinema = useAdminCinemaDetailQuery(() => props.cinemaId, canManage)
const rooms = useAdminRoomCatalogQuery(
  cinemaId,
  () => canManage.value && activeTab.value === 'rooms',
)

const tabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'rooms', label: 'Phòng chiếu' },
  { id: 'amenities', label: 'Tiện ích' },
] as const

function statusLabel(active?: boolean) {
  if (active === true) return 'Đang hoạt động'
  if (active === false) return 'Tạm ngưng'
  return 'Chưa xác định'
}

function display(value?: string | null) {
  return value?.trim() || 'Chưa cập nhật'
}

function close() {
  emit('close')
}

function onOpenChange(open: boolean) {
  if (!open) close()
}

function focusCloseButton(event: Event) {
  event.preventDefault()
  document.getElementById('admin-cinema-detail-close')?.focus()
}

function restoreFocus(event: Event) {
  event.preventDefault()

  requestAnimationFrame(() => {
    const target =
      document.getElementById(props.returnFocusId) ?? document.getElementById('admin-cinemas-title')

    target?.focus()
  })
}

function onTabKeydown(event: KeyboardEvent) {
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.value)
  let nextIndex = currentIndex

  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else return

  event.preventDefault()
  activeTab.value = tabs[nextIndex]?.id
  document.getElementById(`admin-cinema-detail-tab-${tabs[nextIndex]?.id}`)?.focus()
}

function cinemaError(error: unknown) {
  return adminCinemaErrorMessage(error, 'Không thể tải thông tin cụm rạp.')
}
</script>

<template>
  <DialogRoot :open="true" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="admin-cinema-dialog__overlay" />

      <DialogContent
        class="admin-cinema-dialog"
        @open-auto-focus="focusCloseButton"
        @close-auto-focus="restoreFocus"
      >
        <header class="admin-cinema-dialog__heading">
          <div>
            <DialogTitle class="admin-cinema-dialog__title">
              {{ cinema.data.value?.name || 'Chi tiết cụm rạp' }}
            </DialogTitle>
            <DialogDescription class="admin-cinemas__muted">
              Thông tin và năng lực phòng chiếu của cụm rạp.
            </DialogDescription>
          </div>

          <AppButton id="admin-cinema-detail-close" variant="ghost" size="sm" @click="close">
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-cinemas__error" role="alert">
          Tài khoản không có quyền xem thông tin quản lý cụm rạp.
        </p>

        <template v-else>
          <div v-if="cinema.isFetching.value && !cinema.data.value" class="admin-cinemas__feedback">
            <p role="status">Đang tải thông tin cụm rạp…</p>
          </div>

          <div
            v-else-if="cinema.isError.value && !cinema.data.value"
            class="admin-cinemas__feedback"
          >
            <p class="admin-cinemas__error" role="alert">
              {{ cinemaError(cinema.error.value) }}
            </p>
            <AppButton
              variant="secondary"
              :loading="cinema.isFetching.value"
              @click="cinema.refetch()"
            >
              Thử lại
            </AppButton>
          </div>

          <template v-else-if="cinema.data.value">
            <div
              class="admin-cinema-detail__tabs"
              role="tablist"
              aria-label="Thông tin cụm rạp"
              @keydown="onTabKeydown"
            >
              <button
                v-for="tab in tabs"
                :id="`admin-cinema-detail-tab-${tab.id}`"
                :key="tab.id"
                class="admin-cinema-detail__tab"
                :class="{ 'is-active': activeTab === tab.id }"
                type="button"
                role="tab"
                :aria-selected="activeTab === tab.id"
                :aria-controls="`admin-cinema-detail-panel-${tab.id}`"
                :tabindex="activeTab === tab.id ? 0 : -1"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <section
              id="admin-cinema-detail-panel-overview"
              class="admin-cinema-detail__panel"
              role="tabpanel"
              aria-labelledby="admin-cinema-detail-tab-overview"
              tabindex="0"
              :hidden="activeTab !== 'overview'"
            >
              <dl class="admin-cinema-detail__grid">
                <div>
                  <dt>Tên cụm rạp</dt>
                  <dd>{{ display(cinema.data.value.name) }}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{{ statusLabel(cinema.data.value.active) }}</dd>
                </div>
                <div>
                  <dt>Địa chỉ</dt>
                  <dd>{{ display(cinema.data.value.address) }}</dd>
                </div>
                <div>
                  <dt>Thành phố</dt>
                  <dd>{{ display(cinema.data.value.city) }}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{{ display(cinema.data.value.phone) }}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{{ display(cinema.data.value.email) }}</dd>
                </div>
                <div>
                  <dt>Giờ mở cửa</dt>
                  <dd>{{ display(cinema.data.value.openingHours) }}</dd>
                </div>
                <div>
                  <dt>Múi giờ</dt>
                  <dd>{{ display(cinema.data.value.timeZone) }}</dd>
                </div>
              </dl>
            </section>

            <section
              id="admin-cinema-detail-panel-rooms"
              class="admin-cinema-detail__panel"
              role="tabpanel"
              aria-labelledby="admin-cinema-detail-tab-rooms"
              tabindex="0"
              :hidden="activeTab !== 'rooms'"
              :aria-busy="rooms.isFetching.value"
            >
              <p v-if="rooms.isFetching.value && !rooms.data.value" role="status">
                Đang tải danh sách phòng…
              </p>

              <div
                v-else-if="rooms.isError.value && !rooms.data.value"
                class="admin-cinemas__feedback"
              >
                <p class="admin-cinemas__error" role="alert">
                  {{ adminRoomErrorMessage(rooms.error.value, 'Không thể tải danh sách phòng.') }}
                </p>
                <AppButton
                  variant="secondary"
                  :loading="rooms.isFetching.value"
                  @click="rooms.refetch()"
                >
                  Thử lại
                </AppButton>
              </div>

              <template v-else-if="rooms.data.value">
                <div
                  class="admin-cinemas__table-scroll"
                  role="region"
                  aria-label="Danh sách phòng thuộc cụm rạp"
                  tabindex="0"
                >
                  <table class="admin-cinemas__table admin-cinema-detail__table">
                    <caption class="admin-visually-hidden">
                      Phòng chiếu thuộc cụm rạp đã chọn
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Phòng chiếu</th>
                        <th scope="col">Loại phòng</th>
                        <th scope="col">Định dạng</th>
                        <th scope="col">Sức chứa</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(room, index) in rooms.data.value" :key="room.id ?? index">
                        <td>{{ room.name || 'Chưa có tên phòng' }}</td>
                        <td>{{ adminRoomTypeLabel(room.roomType) }}</td>
                        <td aria-label="Định dạng chưa được API hỗ trợ">Chưa có dữ liệu từ API</td>
                        <td>
                          <AdminRoomCapacityCell v-if="room.id" :key="room.id" :room-id="room.id" />
                          <span v-else>Chưa có mã phòng</span>
                        </td>
                        <td>{{ statusLabel(room.active) }}</td>
                      </tr>
                      <tr v-if="!rooms.data.value.length">
                        <td colspan="5" class="admin-cinemas__empty">
                          Cụm rạp chưa có phòng chiếu.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </section>

            <section
              id="admin-cinema-detail-panel-amenities"
              class="admin-cinema-detail__panel"
              role="tabpanel"
              aria-labelledby="admin-cinema-detail-tab-amenities"
              tabindex="0"
              :hidden="activeTab !== 'amenities'"
            >
              <p class="admin-cinemas__muted">
                BE hiện chưa cung cấp trường hoặc endpoint tiện ích cho cụm rạp.
              </p>
            </section>
          </template>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
