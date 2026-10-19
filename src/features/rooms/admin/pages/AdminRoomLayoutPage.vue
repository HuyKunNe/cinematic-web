<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import AdminSeatMatrixEditor from '../components/AdminSeatMatrixEditor.vue'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const dirty = ref(false)

const roomId = computed(() =>
  typeof route.params.roomId === 'string' ? route.params.roomId.toLowerCase() : '',
)

const validRoom = computed(() => isRoomSeatUuid(roomId.value))

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const context = useAdminRoomSeatContext(roomId, canManage)

const current = computed(() =>
  canManage.value && validRoom.value ? context.data.value : undefined,
)

const cinemaId = computed(() => {
  if (current.value?.cinema.id) return current.value.cinema.id

  return isRoomSeatUuid(route.query.cinemaId) ? route.query.cinemaId.toLowerCase() : ''
})

function onMatrixChanged() {
  dirty.value = true
}

function backToRooms() {
  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOMS,
    query: cinemaId.value ? { cinemaId: cinemaId.value } : {},
  })
}

function backToSeats() {
  if (!validRoom.value) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: roomId.value },
    query: cinemaId.value ? { cinemaId: cinemaId.value } : {},
  })
}

function confirmLeave() {
  return !dirty.value || window.confirm('Rời trang và bỏ các thay đổi ma trận chưa lưu?')
}

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  dirty,
  (value) => {
    if (value) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

watch(roomId, () => {
  dirty.value = false
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
})

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
</script>

<template>
  <section
    class="room-matrix-page"
    data-reference="admin-room-layout"
    aria-labelledby="room-matrix-title"
  >
    <header class="room-matrix-page__heading">
      <div>
        <p class="room-matrix-page__eyebrow">
          {{ current ? `${current.cinema.name} · ${current.room.name}` : 'Cấu hình sơ đồ phòng' }}
        </p>
        <h1 id="room-matrix-title">Thiết kế ma trận ghế</h1>
        <p>Tạo ghế và bố trí các hàng, cột trong sơ đồ phòng chiếu.</p>
      </div>

      <div class="room-matrix-page__actions">
        <AppButton variant="secondary" @click="backToRooms"> Quay lại phòng </AppButton>

        <AppButton v-if="validRoom && canManage" variant="secondary" @click="backToSeats">
          Ghế của phòng
        </AppButton>

        <AppButton variant="secondary" disabled title="Chức năng lưu ma trận chưa khả dụng">
          Lưu nháp
        </AppButton>

        <AppButton disabled title="Chức năng xuất bản ma trận chưa khả dụng"> Xuất bản </AppButton>
      </div>
    </header>

    <p v-if="!canManage" class="room-matrix-page__error" role="alert">
      Bạn không có quyền quản lý sơ đồ phòng.
    </p>

    <p v-else-if="!validRoom" class="room-matrix-page__error" role="alert">
      Mã phòng trong đường dẫn không hợp lệ.
    </p>

    <template v-else>
      <div v-if="context.isError.value" class="room-matrix-page__feedback">
        <p class="room-matrix-page__error" role="alert">
          {{ adminRoomErrorMessage(context.error.value, 'Không thể tải thông tin phòng.') }}
        </p>
        <AppButton
          variant="secondary"
          :loading="context.isFetching.value"
          @click="context.refetch()"
        >
          Tải lại thông tin phòng
        </AppButton>
      </div>

      <template v-if="current">
        <aside class="room-matrix-page__notice">
          <strong>{{ dirty ? 'Có thay đổi chưa lưu' : 'Ma trận mới' }}</strong>
          <p>
            Ma trận này đang được chỉnh trong trang hiện tại. Chức năng lưu và mở lại ma trận chưa
            khả dụng. Các sơ đồ đã lưu trước đây chưa được nạp vào trình chỉnh sửa này.
          </p>
        </aside>

        <AdminSeatMatrixEditor
          :key="roomId"
          :disabled="context.isFetching.value || context.isError.value"
          @change="onMatrixChanged"
        />
      </template>

      <p v-else-if="!context.isError.value" class="room-matrix-page__muted" role="status">
        Đang tải thông tin phòng…
      </p>
    </template>
  </section>
</template>

<style scoped>
.room-matrix-page {
  display: grid;
  min-width: 0;
  gap: var(--space-5);
}

.room-matrix-page__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.room-matrix-page__heading h1 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: var(--admin-movies-heading-size);
  line-height: var(--line-height-heading);
}

.room-matrix-page__heading > div:first-child > p:last-child {
  margin: var(--space-2) 0 0;
  color: var(--color-text-secondary);
}

.room-matrix-page__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.room-matrix-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.room-matrix-page__notice {
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.room-matrix-page__notice strong {
  color: var(--color-warning);
}

.room-matrix-page__notice p {
  margin: var(--space-2) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.room-matrix-page__feedback {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.room-matrix-page__error {
  margin: 0;
  color: var(--color-error);
}

.room-matrix-page__muted {
  color: var(--color-text-secondary);
}
</style>
