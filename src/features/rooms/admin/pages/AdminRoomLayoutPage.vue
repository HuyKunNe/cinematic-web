<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import type { RoomLayoutGeometryResponse } from '@/services/api/generated/inventory-service/model'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import {
  useAdminRoomLayoutsQuery,
  useAdminRoomLayoutContentQuery,
} from '../api/admin-room-layout-queries'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const roomId = computed(() =>
  typeof route.params.roomId === 'string' ? route.params.roomId.toLowerCase() : '',
)

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const validRoom = computed(() => isRoomSeatUuid(roomId.value))
const context = useAdminRoomSeatContext(roomId, canManage)

const current = computed(() =>
  canManage.value && validRoom.value ? context.data.value : undefined,
)

const canRead = computed(() => canManage.value && validRoom.value && context.isSuccess.value)

const layouts = useAdminRoomLayoutsQuery(roomId, canRead)
const chosenId = ref('')
const selectedKey = ref('')
const zoom = ref(100)

const selectedVersion = computed(() => {
  const items = layouts.data.value ?? []
  return items.find((item) => item.id === chosenId.value) ?? items[0]
})

const layoutId = computed(() => selectedVersion.value?.id ?? '')
const contentQuery = useAdminRoomLayoutContentQuery(roomId, layoutId, canRead)

const content = computed(() =>
  canRead.value && layoutId.value ? contentQuery.data.value : undefined,
)

const layout = computed(() => content.value?.layout ?? selectedVersion.value)

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    SEAT: 'Ghế',
    SCREEN: 'Màn hình',
    AISLE: 'Lối đi',
    EXIT: 'Lối ra',
    STANDARD: 'Ghế thường',
    VIP: 'VIP',
    COUPLE: 'Ghế đôi',
    ACCESSIBLE: 'Hỗ trợ tiếp cận',
  }

  return labels[kind] ?? kind
}

const objects = computed(() => [
  ...(content.value?.seats ?? []).map((seat) => ({
    key: `seat:${seat.id}`,
    name: seat.seatNumberSnapshot,
    kind: 'SEAT',
    type: seat.seatTypeSnapshot as string,
    row: seat.rowLabelSnapshot,
    geometry: seat.geometry,
  })),
  ...(content.value?.elements ?? []).map((element) => ({
    key: `element:${element.id}`,
    name: element.label?.trim() || kindLabel(element.kind),
    kind: element.kind as string,
    type: element.kind as string,
    row: '',
    geometry: element.geometry,
  })),
])

const selected = computed(() => objects.value.find((object) => object.key === selectedKey.value))

const geometryFields = [
  { key: 'x', label: 'Vị trí X' },
  { key: 'y', label: 'Vị trí Y' },
  { key: 'width', label: 'Chiều rộng' },
  { key: 'height', label: 'Chiều cao' },
  { key: 'rotationDegrees', label: 'Góc xoay (độ)' },
] as const

const rowCount = computed(
  () => new Set(content.value?.seats.map((seat) => seat.rowLabelSnapshot) ?? []).size,
)

function outsideCanvas(geometry: RoomLayoutGeometryResponse) {
  if (!layout.value) return false

  const angle = (geometry.rotationDegrees * Math.PI) / 180
  const halfWidth = geometry.width / 2
  const halfHeight = geometry.height / 2
  const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfHeight
  const extentY = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfHeight
  const centerX = geometry.x + halfWidth
  const centerY = geometry.y + halfHeight
  const tolerance = 0.0000001

  return (
    centerX - extentX < -tolerance ||
    centerY - extentY < -tolerance ||
    centerX + extentX > layout.value.canvasWidth + tolerance ||
    centerY + extentY > layout.value.canvasHeight + tolerance
  )
}

const outsideCount = computed(
  () => objects.value.filter((object) => outsideCanvas(object.geometry)).length,
)

function rotation(geometry: RoomLayoutGeometryResponse) {
  return `rotate(${geometry.rotationDegrees} ${
    geometry.x + geometry.width / 2
  } ${geometry.y + geometry.height / 2})`
}

function formatDate(value?: string) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function backToSeats() {
  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: validRoom.value ? roomId.value : '' },
    query: current.value ? { cinemaId: current.value.cinema.id } : {},
  })
}

watch(
  roomId,
  () => {
    chosenId.value = ''
    selectedKey.value = ''
    zoom.value = 100
  },
  { flush: 'sync' },
)

watch(layoutId, () => {
  selectedKey.value = ''
  zoom.value = 100
})

watch(objects, (items) => {
  if (!items.some((item) => item.key === selectedKey.value)) {
    selectedKey.value = ''
  }
})
</script>

<template>
  <section
    class="room-layout-page"
    data-reference="admin-room-layout"
    aria-labelledby="room-layout-title"
  >
    <header class="layout-heading">
      <div>
        <p class="layout-eyebrow">
          {{ current ? `${current.cinema.name} · ${current.room.name}` : 'Cấu hình phòng chiếu' }}
        </p>
        <h1 id="room-layout-title">Thiết kế không gian phòng</h1>
        <p>Thiết lập vị trí, kích thước và góc xoay trước khi xuất bản sơ đồ.</p>
      </div>

      <div class="layout-heading__actions">
        <AppButton variant="secondary" @click="backToSeats">Quay lại phòng</AppButton>
        <AppButton variant="secondary" disabled title="Lưu nháp chưa được triển khai.">
          Lưu nháp
        </AppButton>
        <AppButton disabled title="Xuất bản chưa được triển khai."> Xuất bản layout </AppButton>
      </div>
    </header>

    <p v-if="!canManage" class="layout-error" role="alert">
      Tài khoản không có quyền quản lý sơ đồ phòng.
    </p>
    <p v-else-if="!validRoom" class="layout-error" role="alert">
      Mã phòng trong đường dẫn không hợp lệ.
    </p>

    <div v-else-if="context.isError.value" class="layout-feedback">
      <p class="layout-error" role="alert">
        {{ adminRoomErrorMessage(context.error.value, 'Không thể tải thông tin phòng.') }}
      </p>
      <AppButton variant="secondary" :loading="context.isFetching.value" @click="context.refetch()">
        Tải lại thông tin phòng
      </AppButton>
    </div>

    <p v-else-if="!current" class="layout-muted" role="status">Đang tải thông tin phòng…</p>

    <template v-else>
      <aside class="layout-draft-notice" role="status">
        <span class="layout-draft-notice__dot" aria-hidden="true"></span>
        <span>
          <strong>
            {{
              layout
                ? layout.status === 'DRAFT'
                  ? 'Bản nháp'
                  : 'Đã xuất bản'
                : 'Chưa chọn phiên bản'
            }}
          </strong>
          <template v-if="layout"> · Phiên bản {{ layout.layoutVersion }}</template>
        </span>
        <span class="layout-draft-notice__meta">
          Cập nhật lần cuối: {{ formatDate(layout?.updatedAt) }}
        </span>
      </aside>

      <section class="layout-toolbar layout-panel" aria-label="Công cụ thiết kế">
        <div class="layout-tools" role="group" aria-label="Công cụ đặt đối tượng">
          <button class="layout-tool" type="button" @click="backToSeats">Xếp ghế theo hàng</button>
          <button class="layout-tool" type="button" disabled>+ Màn hình</button>
          <button class="layout-tool" type="button" disabled>+ Lối đi</button>
          <button class="layout-tool" type="button" disabled>+ Lối ra</button>
        </div>

        <div class="layout-toolbar__actions">
          <button class="layout-icon-button" type="button" disabled aria-label="Hoàn tác">↶</button>
          <button class="layout-icon-button" type="button" disabled aria-label="Làm lại">↷</button>
          <span class="layout-toolbar__divider" aria-hidden="true"></span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Thu nhỏ sơ đồ"
            :disabled="!content || zoom <= 50"
            @click="zoom = Math.max(50, zoom - 25)"
          >
            −
          </button>
          <span class="layout-zoom" aria-live="polite">{{ zoom }}%</span>
          <button
            class="layout-icon-button"
            type="button"
            aria-label="Phóng to sơ đồ"
            :disabled="!content || zoom >= 200"
            @click="zoom = Math.min(200, zoom + 25)"
          >
            ＋
          </button>
        </div>
      </section>

      <div class="layout-workspace">
        <section class="layout-canvas-panel layout-panel" aria-labelledby="layout-canvas-title">
          <header class="layout-canvas-heading">
            <div>
              <h2 id="layout-canvas-title">Sơ đồ phòng</h2>
              <p>Chọn đối tượng để xem thuộc tính đã lưu.</p>
            </div>
            <span class="layout-seat-count">{{ content?.seats.length ?? '—' }} ghế</span>
          </header>

          <div class="layout-legend" aria-label="Chú thích">
            <span><i class="layout-legend__swatch layout-legend__swatch--standard"></i>Thường</span>
            <span><i class="layout-legend__swatch layout-legend__swatch--vip"></i>VIP</span>
            <span
              ><i class="layout-legend__swatch layout-legend__swatch--selected"></i>Đang chọn</span
            >
          </div>

          <p v-if="contentQuery.isError.value" class="layout-error" role="alert">
            {{ adminRoomErrorMessage(contentQuery.error.value, 'Không thể tải nội dung sơ đồ.') }}
            <template v-if="content">Đang hiển thị nội dung từ lần tải trước.</template>
          </p>
          <p v-else-if="contentQuery.isFetching.value" class="layout-muted" role="status">
            Đang tải nội dung sơ đồ…
          </p>

          <p v-if="outsideCount" class="layout-warning" role="status">
            {{ outsideCount }} đối tượng vượt giới hạn canvas. Geometry được giữ nguyên.
          </p>

          <div
            class="layout-canvas-scroll"
            role="region"
            aria-label="Sơ đồ phòng, có thể cuộn"
            tabindex="0"
          >
            <svg
              v-if="content"
              class="layout-preview-svg"
              :style="{ '--layout-zoom-factor': zoom / 100 }"
              :viewBox="`0 0 ${content.layout.canvasWidth} ${content.layout.canvasHeight}`"
              :width="content.layout.canvasWidth"
              :height="content.layout.canvasHeight"
              aria-label="Đối tượng trong sơ đồ phòng"
            >
              <g
                v-for="object in objects"
                :key="object.key"
                class="layout-preview-object"
                :class="{
                  'is-vip': object.type === 'VIP',
                  'is-screen': object.kind === 'SCREEN',
                  'is-aisle': object.kind === 'AISLE',
                  'is-exit': object.kind === 'EXIT',
                  'is-selected': selectedKey === object.key,
                }"
                :transform="rotation(object.geometry)"
                role="button"
                tabindex="0"
                :aria-label="`${kindLabel(object.type)} ${object.name}`"
                :aria-pressed="selectedKey === object.key"
                @click="selectedKey = object.key"
                @keydown.enter.prevent="selectedKey = object.key"
                @keydown.space.prevent="selectedKey = object.key"
              >
                <title>{{ object.name }}</title>
                <rect
                  :x="object.geometry.x"
                  :y="object.geometry.y"
                  :width="object.geometry.width"
                  :height="object.geometry.height"
                />
                <text
                  :x="object.geometry.x + object.geometry.width / 2"
                  :y="object.geometry.y + object.geometry.height / 2"
                  text-anchor="middle"
                  dominant-baseline="middle"
                >
                  {{ object.name }}
                </text>
              </g>
            </svg>

            <p v-else class="layout-muted">
              {{
                layoutId ? 'Chưa có nội dung để hiển thị.' : 'Chọn phiên bản để xem sơ đồ phòng.'
              }}
            </p>
          </div>

          <p v-if="content && !objects.length" class="layout-muted">
            Phiên bản này chưa có ghế hoặc phần tử không gian.
          </p>

          <footer class="layout-canvas-footer">
            <span
              >{{ content?.seats.length ?? 0 }} ghế · {{ content?.elements.length ?? 0 }} phần
              tử</span
            >
            <span>Kéo ngang để xem toàn bộ sơ đồ trên màn hình nhỏ</span>
          </footer>
        </section>

        <aside class="layout-inspector">
          <section
            class="layout-inspector-panel layout-panel"
            aria-labelledby="layout-object-title"
          >
            <header class="layout-canvas-heading">
              <div>
                <p class="layout-inspector__eyebrow">ĐỐI TƯỢNG ĐANG CHỌN</p>
                <h2 id="layout-object-title">{{ selected?.name ?? 'Chưa chọn đối tượng' }}</h2>
              </div>
              <span v-if="selected" class="layout-seat-type-badge">
                {{ kindLabel(selected.type) }}
              </span>
            </header>

            <p class="layout-muted">Loại ghế và trạng thái được chỉnh trong trang Ghế của phòng.</p>

            <template v-if="selected">
              <label v-for="field in geometryFields" :key="field.key" class="layout-field">
                <span>{{ field.label }}</span>
                <input type="text" :value="selected.geometry[field.key]" readonly />
              </label>

              <div v-if="selected.kind === 'SEAT'" class="layout-seat-info">
                <span
                  >Hàng <strong>{{ selected.row }}</strong></span
                >
                <span
                  >Mã ghế <strong>{{ selected.name }}</strong></span
                >
              </div>
            </template>

            <p v-else class="layout-muted">Chọn đối tượng trên canvas để xem geometry.</p>

            <AppButton variant="secondary" class="layout-inspector__button" disabled>
              Áp dụng vị trí
            </AppButton>
          </section>

          <section
            class="layout-inspector-panel layout-panel"
            aria-labelledby="layout-summary-title"
          >
            <header class="layout-canvas-heading">
              <div>
                <h2 id="layout-summary-title">Thông tin sơ đồ</h2>
                <p>Chọn phiên bản của phòng.</p>
              </div>
            </header>

            <label class="layout-field">
              <span>Phiên bản</span>
              <select
                :value="layoutId"
                :disabled="layouts.isFetching.value || !layouts.data.value?.length"
                @change="chosenId = ($event.target as HTMLSelectElement).value"
              >
                <option value="" disabled>Chọn phiên bản</option>
                <option v-for="item in layouts.data.value ?? []" :key="item.id" :value="item.id">
                  Phiên bản {{ item.layoutVersion }} ·
                  {{ item.status === 'DRAFT' ? 'Bản nháp' : 'Đã xuất bản' }}
                </option>
              </select>
            </label>

            <p v-if="layouts.isError.value" class="layout-error" role="alert">
              {{ adminRoomErrorMessage(layouts.error.value, 'Không thể tải phiên bản sơ đồ.') }}
              <template v-if="layouts.data.value"
                >Đang hiển thị danh sách từ lần tải trước.</template
              >
            </p>
            <p v-else-if="layouts.isFetching.value" class="layout-muted" role="status">
              Đang tải phiên bản…
            </p>
            <p
              v-else-if="layouts.isSuccess.value && !layouts.data.value?.length"
              class="layout-muted"
            >
              Phòng chưa có phiên bản sơ đồ. Tạo bản nháp sẽ được bổ sung ở round tiếp theo.
            </p>

            <AppButton
              variant="secondary"
              :loading="layouts.isFetching.value"
              @click="layouts.refetch()"
            >
              Tải lại phiên bản
            </AppButton>
            <AppButton
              variant="secondary"
              :disabled="!layoutId"
              :loading="contentQuery.isFetching.value"
              @click="contentQuery.refetch()"
            >
              Tải lại nội dung
            </AppButton>

            <dl v-if="content" class="layout-summary">
              <div>
                <dt>Số hàng</dt>
                <dd>{{ rowCount }}</dd>
              </div>
              <div>
                <dt>Tổng số ghế</dt>
                <dd>{{ content.seats.length }}</dd>
              </div>
              <div>
                <dt>Phần tử không gian</dt>
                <dd>{{ content.elements.length }}</dd>
              </div>
              <div>
                <dt>Canvas</dt>
                <dd>{{ content.layout.canvasWidth }} × {{ content.layout.canvasHeight }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>
