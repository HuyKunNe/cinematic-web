<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useAdminRoomCatalogQuery, useAdminRoomCinemaQuery } from '../api/admin-room-queries'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import { useAdminRoomSeatsQuery, useSetAdminSeatActivityMutation } from '../api/admin-seat-queries'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'
import { adminSeatTypeOptions } from '../schemas/admin-seat-type-options'
import { useAdminRoomMatrixLayoutsQuery } from '../api/admin-room-matrix-queries'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const rawRoomId = computed(() =>
  typeof route.params.roomId === 'string' ? route.params.roomId : '',
)

const roomId = computed(() => rawRoomId.value.toLowerCase())
const invalidRoomId = computed(() => Boolean(rawRoomId.value) && !isRoomSeatUuid(roomId.value))

const context = useAdminRoomSeatContext(roomId, canManage)

const current = computed(() => {
  if (!canManage.value || !isRoomSeatUuid(roomId.value)) return undefined

  const value = context.data.value
  return value?.room.id === roomId.value ? value : undefined
})

const cinemaId = computed(() => {
  if (current.value?.cinema.id) return current.value.cinema.id

  return isRoomSeatUuid(route.query.cinemaId) ? route.query.cinemaId.toLowerCase() : ''
})

const cinemas = useAdminRoomCinemaQuery(canManage)

const rooms = useAdminRoomCatalogQuery(
  cinemaId,
  () => canManage.value && isRoomSeatUuid(cinemaId.value),
)

const pickedLayoutId = ref('')

const versions = useAdminRoomMatrixLayoutsQuery(
  roomId,
  () =>
    canManage.value &&
    context.isSuccess.value &&
    !context.isFetching.value &&
    Boolean(current.value),
)

const publishedVersions = computed(() =>
  current.value
    ? (versions.data.value ?? []).filter((layout) => layout.status === 'PUBLISHED')
    : [],
)

const seats = useAdminRoomSeatsQuery(
  roomId,
  () =>
    canManage.value &&
    context.isSuccess.value &&
    !context.isFetching.value &&
    Boolean(current.value),
  pickedLayoutId,
)

const activity = useSetAdminSeatActivityMutation()
const selectedId = ref('')
const activityError = ref('')
const activityMessage = ref('')

let scope = 0

const busy = computed(() => activity.isPending.value)

const matrix = computed(() => {
  const value = seats.data.value

  if (
    !current.value ||
    !value ||
    value.layout.roomId !== roomId.value ||
    (pickedLayoutId.value && value.layout.id !== pickedLayoutId.value)
  ) {
    return null
  }

  return value
})

const ready = computed(
  () =>
    canManage.value &&
    Boolean(current.value) &&
    context.isSuccess.value &&
    !context.isFetching.value &&
    seats.isSuccess.value &&
    !seats.isFetching.value &&
    Boolean(matrix.value),
)

const selected = computed(() => {
  for (const row of matrix.value?.rows ?? []) {
    const cell = row.cells.find((item) => item.seat?.id === selectedId.value)

    if (cell?.seat) {
      return {
        seat: cell.seat,
        column: cell.column + 1,
        endColumn: cell.column + cell.span,
      }
    }
  }

  return null
})

watch(
  [roomId, canManage],
  () => {
    scope += 1
    pickedLayoutId.value = ''
    selectedId.value = ''
    activityError.value = ''
    activityMessage.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => matrix.value?.layout.id,
  () => {
    selectedId.value = ''
    activityError.value = ''
    activityMessage.value = ''
  },
)

onBeforeRouteLeave(() => !busy.value)
onBeforeRouteUpdate(() => !busy.value)

function changeCinema(event: Event) {
  if (busy.value || !(event.target instanceof HTMLSelectElement)) return

  const value = event.target.value
  if (value && !isRoomSeatUuid(value)) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: '' },
    query: value ? { cinemaId: value } : {},
  })
}

function changeRoom(event: Event) {
  if (busy.value || !(event.target instanceof HTMLSelectElement)) return

  const value = event.target.value
  if (value && !isRoomSeatUuid(value)) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: value },
    query: cinemaId.value ? { cinemaId: cinemaId.value } : {},
  })
}

function changeVersion(event: Event) {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) return

  const requestedId = select.value
  select.value = pickedLayoutId.value

  if (
    !current.value ||
    busy.value ||
    context.isFetching.value ||
    versions.isFetching.value ||
    requestedId === pickedLayoutId.value
  ) {
    return
  }

  if (
    requestedId !== '' &&
    (!isRoomSeatUuid(requestedId) ||
      !publishedVersions.value.some((layout) => layout.id === requestedId))
  ) {
    return
  }

  scope += 1
  selectedId.value = ''
  activityError.value = ''
  activityMessage.value = ''
  pickedLayoutId.value = requestedId
  select.value = requestedId
}

function openLayout() {
  if (!current.value || busy.value) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_LAYOUT,
    params: { roomId: roomId.value },
    query: cinemaId.value ? { cinemaId: cinemaId.value } : {},
  })
}

function typeLabel(type?: string) {
  return adminSeatTypeOptions.find((option) => option.value === type)?.label ?? '—'
}

function statusLabel(active?: boolean) {
  return active === true ? 'Đang hoạt động' : active === false ? 'Tạm ngưng' : '—'
}

function columnLabel(start: number, end: number) {
  return start === end ? String(start) : `${start}–${end}`
}

async function reloadSeats() {
  if (
    !canManage.value ||
    !current.value ||
    context.isFetching.value ||
    busy.value ||
    seats.isFetching.value ||
    versions.isFetching.value
  ) {
    return
  }

  activityError.value = ''
  activityMessage.value = ''

  await Promise.allSettled([versions.refetch(), seats.refetch()])
}

async function changeActivity() {
  const seat = selected.value?.seat
  if (!seat || !ready.value || busy.value) return

  const requestedRoomId = roomId.value
  const token = scope

  activityError.value = ''
  activityMessage.value = ''

  try {
    const updated = await activity.mutateAsync({
      roomId: requestedRoomId,
      seatId: seat.id,
      active: !seat.active,
    })

    if (token !== scope || requestedRoomId !== roomId.value) return

    const label =
      matrix.value?.seats.find((item) => item.id === seat.id)?.seatNumber ?? seat.seatNumber

    activityMessage.value = `Đã ${updated.active ? 'kích hoạt' : 'tạm ngưng'} ghế ${label}.`
  } catch (error) {
    if (token !== scope || requestedRoomId !== roomId.value) return

    activityError.value = adminRoomErrorMessage(error, 'Không thể cập nhật trạng thái ghế.')
  }
}
</script>

<template>
  <section
    class="room-seats-page"
    data-reference="admin-room-seats"
    aria-labelledby="room-seats-title"
  >
    <header class="seatmap-heading">
      <div>
        <p class="seatmap-eyebrow">Cấu hình phòng chiếu</p>
        <h1 id="room-seats-title" tabindex="-1">Sơ đồ ghế của phòng</h1>
        <p class="seatmap-description">Xem sơ đồ đã xuất bản và quản lý trạng thái từng ghế.</p>
      </div>

      <AppButton :disabled="!canManage || !current || busy" @click="openLayout">
        Thiết kế sơ đồ ghế
      </AppButton>
    </header>

    <p v-if="!canManage" class="seatmap-error" role="alert">
      Tài khoản không có quyền quản lý ghế.
    </p>

    <template v-else>
      <section class="seatmap-toolbar" aria-label="Chọn rạp và phòng">
        <label class="seatmap-field">
          <span>Rạp</span>
          <select
            :value="cinemaId"
            :disabled="busy || cinemas.isFetching.value"
            @change="changeCinema"
          >
            <option value="">Chọn rạp</option>
            <option
              v-if="current && !cinemas.data.value?.some((item) => item.id === current?.cinema.id)"
              :value="current.cinema.id"
            >
              {{ current.cinema.name }}
            </option>
            <option v-for="cinema in cinemas.data.value ?? []" :key="cinema.id" :value="cinema.id">
              {{ cinema.name }}{{ cinema.active === false ? ' · Tạm ngưng' : '' }}
            </option>
          </select>
        </label>

        <label class="seatmap-field">
          <span>Phòng</span>
          <select
            :value="roomId"
            :disabled="busy || !cinemaId || rooms.isFetching.value"
            @change="changeRoom"
          >
            <option value="">Chọn phòng</option>
            <option
              v-if="current && !rooms.data.value?.some((item) => item.id === current?.room.id)"
              :value="current.room.id"
            >
              {{ current.room.name }}
            </option>
            <option v-for="room in rooms.data.value ?? []" :key="room.id" :value="room.id">
              {{ room.name }}{{ room.active === false ? ' · Tạm ngưng' : '' }}
            </option>
          </select>
        </label>

        <label class="seatmap-field">
          <span>Phiên bản sơ đồ</span>
          <select
            :value="pickedLayoutId"
            :disabled="busy || !current || context.isFetching.value || versions.isFetching.value"
            @change="changeVersion"
          >
            <option value="">Mới nhất đã xuất bản</option>

            <option
              v-if="
                pickedLayoutId && !publishedVersions.some((layout) => layout.id === pickedLayoutId)
              "
              :value="pickedLayoutId"
              disabled
            >
              Phiên bản đang chọn · Không có trong danh sách
            </option>

            <option v-for="layout in publishedVersions" :key="layout.id" :value="layout.id">
              Phiên bản {{ layout.layoutVersion }} · Đã xuất bản
            </option>
          </select>
        </label>

        <AppButton
          variant="secondary"
          :disabled="
            busy ||
            !current ||
            context.isFetching.value ||
            seats.isFetching.value ||
            versions.isFetching.value
          "
          :loading="seats.isFetching.value || versions.isFetching.value"
          @click="reloadSeats"
        >
          Tải lại sơ đồ
        </AppButton>
      </section>
      <p
        v-if="current && versions.isError.value"
        class="seatmap-feedback seatmap-error"
        role="alert"
      >
        {{ adminRoomErrorMessage(versions.error.value, 'Không thể tải danh sách phiên bản.') }}
        Chọn “Tải lại sơ đồ” để cập nhật danh sách.
      </p>
      <div v-if="cinemas.isError.value" class="seatmap-feedback">
        <p class="seatmap-error" role="alert">
          {{ adminRoomErrorMessage(cinemas.error.value, 'Không thể tải danh sách rạp.') }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          :loading="cinemas.isFetching.value"
          @click="cinemas.refetch()"
        >
          Tải lại rạp
        </AppButton>
      </div>

      <div v-if="cinemaId && rooms.isError.value" class="seatmap-feedback">
        <p class="seatmap-error" role="alert">
          {{ adminRoomErrorMessage(rooms.error.value, 'Không thể tải danh sách phòng.') }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          :loading="rooms.isFetching.value"
          @click="rooms.refetch()"
        >
          Tải lại phòng
        </AppButton>
      </div>

      <p v-if="invalidRoomId" class="seatmap-error" role="alert">
        Mã phòng trong đường dẫn không hợp lệ.
      </p>

      <p v-else-if="!roomId" class="seatmap-muted" role="status">
        Chọn rạp và phòng để xem sơ đồ đã xuất bản.
      </p>

      <div v-else-if="context.isError.value" class="seatmap-feedback">
        <p class="seatmap-error" role="alert">
          {{ adminRoomErrorMessage(context.error.value) }}
        </p>
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="busy"
          :loading="context.isFetching.value"
          @click="context.refetch()"
        >
          Tải lại thông tin phòng
        </AppButton>
      </div>

      <p v-else-if="!current" class="seatmap-muted" role="status">Đang tải thông tin phòng…</p>

      <template v-if="current">
        <section class="seatmap-summary" aria-label="Thông tin phòng">
          <article class="seatmap-stat">
            <span>Rạp</span>
            <strong>{{ current.cinema.name }}</strong>
          </article>
          <article class="seatmap-stat">
            <span>Phòng</span>
            <strong>{{ current.room.name }}</strong>
          </article>
          <article class="seatmap-stat">
            <span>Tổng số ghế</span>
            <strong>{{ matrix?.seats.length ?? '—' }}</strong>
          </article>
          <article class="seatmap-stat">
            <span>Trạng thái</span>
            <strong>
              <span class="seatmap-status" :class="current.room.active ? 'is-active' : 'is-paused'">
                {{ statusLabel(current.room.active) }}
              </span>
            </strong>
          </article>
        </section>

        <p
          v-if="current.room.active === false"
          class="seatmap-feedback seatmap-muted"
          role="status"
        >
          Phòng đang tạm ngưng. Có thể xem và đổi trạng thái ghế.
        </p>

        <p v-if="seats.isError.value" class="seatmap-feedback seatmap-error" role="alert">
          {{ adminRoomErrorMessage(seats.error.value, 'Không thể tải sơ đồ đã xuất bản.') }}
          <template v-if="matrix">
            Đang hiển thị dữ liệu từ lần tải trước; thao tác ghi bị khóa.
          </template>
        </p>
        <p v-else-if="seats.isFetching.value" class="seatmap-feedback seatmap-muted" role="status">
          Đang cập nhật sơ đồ đã xuất bản…
        </p>

        <div class="seatmap-layout">
          <section class="seatmap-panel" aria-labelledby="seatmap-title">
            <header class="seatmap-panel-heading">
              <div>
                <h2 id="seatmap-title">Sơ đồ ghế</h2>
                <p id="seatmap-help">
                  <template v-if="matrix">
                    Phiên bản {{ matrix.layout.layoutVersion }} · Đã xuất bản.
                  </template>
                  Chọn ghế để xem thông tin. Ghế đôi chiếm 2 ô liền nhau.
                </p>
              </div>
            </header>

            <div class="seatmap-legend" aria-label="Chú giải">
              <span v-for="option in adminSeatTypeOptions" :key="option.value">
                <i
                  class="seatmap-legend__dot"
                  :class="{
                    'is-standard': option.value === 'STANDARD',
                    'is-premium': option.value === 'VIP',
                    'is-couple': option.value === 'COUPLE',
                    'is-accessible': option.value === 'ACCESSIBLE',
                  }"
                  aria-hidden="true"
                ></i>
                {{ option.label }}
              </span>
              <span>
                <i class="seatmap-legend__dot is-selected" aria-hidden="true"></i>
                Đang chọn
              </span>
              <span>
                <i class="seatmap-legend__dot is-blocked" aria-hidden="true"></i>
                Ngừng sử dụng
              </span>
              <span>
                <i class="seatmap-legend__dot is-empty" aria-hidden="true"></i>
                Ô trống
              </span>
            </div>

            <p v-if="!matrix" class="seatmap-muted" role="status">
              {{
                seats.isError.value
                  ? 'Chưa thể hiển thị sơ đồ. Chọn “Tải lại sơ đồ” để thử lại.'
                  : seats.isFetching.value || seats.data.value === undefined
                    ? 'Đang tải sơ đồ đã xuất bản…'
                    : 'Phòng chưa có sơ đồ đã xuất bản. Mở trang thiết kế để tạo và xuất bản.'
              }}
            </p>

            <div
              v-else
              class="seatmap-viewport"
              :style="{ '--seatmap-column-count': matrix.columnCount }"
            >
              <div class="seatmap-axis" aria-hidden="true">
                <div v-for="row in matrix.rows" :key="row.label" class="seatmap-row-label">
                  {{ row.label }}
                </div>
              </div>

              <div
                class="seatmap-scroll"
                role="region"
                aria-label="Sơ đồ ghế, có thể cuộn ngang"
                aria-describedby="seatmap-help"
                tabindex="0"
              >
                <div class="seatmap-content">
                  <div class="seatmap-stage"><span>MÀN HÌNH</span></div>

                  <div v-for="row in matrix.rows" :key="row.label" class="seatmap-row">
                    <div
                      v-for="{ seat, column, span } in row.cells"
                      :key="seat?.id ?? `empty-${column}`"
                      class="seatmap-slot"
                      :class="{ 'is-couple': span === 2 }"
                    >
                      <button
                        v-if="seat"
                        class="seatmap-cell"
                        type="button"
                        :class="{
                          'is-standard': seat.seatType === 'STANDARD',
                          'is-premium': seat.seatType === 'VIP',
                          'is-couple': seat.seatType === 'COUPLE',
                          'is-accessible': seat.seatType === 'ACCESSIBLE',
                          'is-blocked': !seat.active,
                          'is-selected': selectedId === seat.id,
                        }"
                        :disabled="busy"
                        :aria-pressed="selectedId === seat.id"
                        :aria-label="`${seat.seatNumber}, hàng ${row.label}, cột hiển thị ${columnLabel(
                          column + 1,
                          column + span,
                        )}, chiếm ${span} ô, ${typeLabel(seat.seatType)}, ${statusLabel(
                          seat.active,
                        )}`"
                        @click="selectedId = seat.id"
                      >
                        {{ seat.seatNumber }}
                      </button>

                      <span
                        v-else
                        class="seatmap-cell seatmap-cell--empty"
                        role="img"
                        :aria-label="`Ô trống tại hàng ${row.label}, cột ${column + 1}`"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside class="seatmap-panel seatmap-details" aria-labelledby="seatmap-details-title">
            <header class="seatmap-panel-heading">
              <div>
                <h2 id="seatmap-details-title">Chi tiết ghế</h2>
                <p>Thông tin vị trí đang chọn.</p>
              </div>
            </header>

            <dl v-if="selected">
              <div>
                <dt>Mã ghế</dt>
                <dd>{{ selected.seat.seatNumber }}</dd>
              </div>
              <div>
                <dt>Hàng</dt>
                <dd>{{ selected.seat.rowLabel }}</dd>
              </div>
              <div>
                <dt>Cột hiển thị</dt>
                <dd>{{ columnLabel(selected.column, selected.endColumn) }}</dd>
              </div>
              <div>
                <dt>Loại ghế</dt>
                <dd>{{ typeLabel(selected.seat.seatType) }}</dd>
              </div>
              <div>
                <dt>Sức chứa</dt>
                <dd>{{ selected.seat.capacity }}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>{{ statusLabel(selected.seat.active) }}</dd>
              </div>
            </dl>
            <p v-else class="seatmap-muted">Chọn ghế để xem thông tin.</p>

            <AppButton
              v-if="selected"
              variant="secondary"
              :disabled="busy || !ready"
              :loading="activity.isPending.value"
              @click="changeActivity"
            >
              {{ selected.seat.active ? 'Tạm ngưng ghế' : 'Kích hoạt ghế' }}
            </AppButton>

            <p v-if="activityError" class="seatmap-error" role="alert">
              {{ activityError }}
            </p>
            <p v-if="activityMessage" role="status">{{ activityMessage }}</p>

            <template v-if="matrix">
              <h3 class="seatmap-details__subtitle">Thống kê</h3>
              <dl>
                <div>
                  <dt>Số hàng</dt>
                  <dd>{{ matrix.rows.length }}</dd>
                </div>
                <div>
                  <dt>Số cột</dt>
                  <dd>{{ matrix.columnCount }}</dd>
                </div>
                <div>
                  <dt>Tổng số ô</dt>
                  <dd>{{ matrix.rows.length * matrix.columnCount }}</dd>
                </div>
                <div>
                  <dt>Ô đã chiếm</dt>
                  <dd>{{ matrix.occupiedCount }}</dd>
                </div>
                <div v-for="option in adminSeatTypeOptions" :key="option.value">
                  <dt>{{ option.label }}</dt>
                  <dd>
                    {{ matrix.seats.filter((seat) => seat.seatType === option.value).length }}
                  </dd>
                </div>
                <div>
                  <dt>Ngừng sử dụng</dt>
                  <dd>{{ matrix.inactiveCount }}</dd>
                </div>
                <div>
                  <dt>Ô trống</dt>
                  <dd>{{ matrix.emptyCount }}</dd>
                </div>
                <div>
                  <dt>Tổng số chỗ</dt>
                  <dd>{{ matrix.capacity }}</dd>
                </div>
                <div>
                  <dt>Chỗ đang hoạt động</dt>
                  <dd>{{ matrix.activeCapacity }}</dd>
                </div>
              </dl>
            </template>
          </aside>
        </div>
      </template>
    </template>
  </section>
</template>
