<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminRoomCinemaQuery, useAdminRoomCatalogQuery } from '../api/admin-room-queries'
import { useAdminRoomSeatsQuery, useSetAdminSeatActivityMutation } from '../api/admin-seat-queries'
import { useAdminRoomSeatContext } from '../api/admin-room-seat-context'
import { isRoomSeatUuid, mapAdminSeatCatalog } from '../mappers/admin-seat-catalog.mapper'
import { adminSeatTypeOptions } from '../schemas/admin-seat-type-options'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'

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

const current = computed(() =>
  canManage.value && !invalidRoomId.value ? context.data.value : undefined,
)

const cinemaId = computed(() => {
  if (current.value?.cinema.id) return current.value.cinema.id

  return isRoomSeatUuid(route.query.cinemaId) ? route.query.cinemaId.toLowerCase() : ''
})

const cinemas = useAdminRoomCinemaQuery(canManage)

const rooms = useAdminRoomCatalogQuery(
  cinemaId,
  () => canManage.value && isRoomSeatUuid(cinemaId.value),
)

const seats = useAdminRoomSeatsQuery(
  roomId,
  () => canManage.value && context.isSuccess.value && Boolean(current.value),
)

const activity = useSetAdminSeatActivityMutation()
const selectedId = ref('')
const activityError = ref('')
const activityMessage = ref('')

const busy = computed(() => activity.isPending.value)

const ready = computed(
  () =>
    canManage.value &&
    Boolean(current.value) &&
    context.isSuccess.value &&
    !context.isFetching.value &&
    seats.isSuccess.value &&
    !seats.isFetching.value,
)

const catalog = computed(() => {
  if (!current.value || seats.data.value === undefined) {
    return { matrix: null, error: '' }
  }

  try {
    return {
      matrix: mapAdminSeatCatalog(seats.data.value, roomId.value),
      error: '',
    }
  } catch (error) {
    return {
      matrix: null,
      error: adminRoomErrorMessage(error, 'Không thể đọc danh mục ghế.'),
    }
  }
})

const selected = computed(() => {
  for (const row of catalog.value.matrix?.rows ?? []) {
    const cell = row.cells.find((item) => item.seat?.id === selectedId.value)

    if (cell?.seat) {
      return {
        seat: cell.seat,
        column: cell.column + 1,
        endColumn: cell.column + cell.span,
        span: cell.span,
      }
    }
  }

  return null
})

watch(
  roomId,
  () => {
    selectedId.value = ''
    activityError.value = ''
    activityMessage.value = ''
  },
  { flush: 'sync' },
)

onBeforeRouteLeave(() => !busy.value)
onBeforeRouteUpdate(() => !busy.value)

function changeCinema(event: Event) {
  if (busy.value) return

  const value = (event.target as HTMLSelectElement).value
  if (value && !isRoomSeatUuid(value)) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: '' },
    query: value ? { cinemaId: value } : {},
  })
}

function changeRoom(event: Event) {
  if (busy.value) return

  const value = (event.target as HTMLSelectElement).value
  if (value && !isRoomSeatUuid(value)) return

  void router.push({
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    params: { roomId: value },
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

async function changeActivity() {
  const seat = selected.value?.seat
  if (!seat || !ready.value || busy.value || catalog.value.error) return

  activityError.value = ''
  activityMessage.value = ''

  try {
    const updated = await activity.mutateAsync({
      roomId: roomId.value,
      seatId: seat.id,
      active: !seat.active,
    })

    activityMessage.value =
      `Đã ${updated.active ? 'kích hoạt' : 'tạm ngưng'} ` +
      `ghế ${updated.seatNumber || seat.seatNumber}.`
  } catch (error) {
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
        <h1 id="room-seats-title" tabindex="-1">Ma trận ghế của phòng</h1>
        <p class="seatmap-description">
          Xem danh mục ghế theo hàng và quản lý trạng thái từng ghế.
        </p>
      </div>

      <AppButton
        :disabled="!canManage || !current || busy"
        @click="
          router.push({
            name: ROUTE_NAMES.ADMIN_ROOM_LAYOUT,
            params: { roomId },
            query: cinemaId ? { cinemaId } : {},
          })
        "
      >
        Thiết kế ma trận ghế
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
      </section>

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
        Chọn rạp và phòng để xem danh mục ghế.
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
            <strong>{{ catalog.matrix?.seats.length ?? '—' }}</strong>
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
          {{ adminRoomErrorMessage(seats.error.value, 'Không thể tải danh mục ghế.') }}
          <template v-if="seats.data.value !== undefined">
            Đang hiển thị dữ liệu từ lần tải trước; thao tác ghi bị khóa.
          </template>
        </p>
        <p v-else-if="seats.isFetching.value" class="seatmap-feedback seatmap-muted" role="status">
          Đang cập nhật danh mục ghế…
        </p>
        <p v-if="catalog.error" class="seatmap-feedback seatmap-error" role="alert">
          {{ catalog.error }}
        </p>

        <div class="seatmap-layout">
          <section class="seatmap-panel" aria-labelledby="seatmap-title">
            <header class="seatmap-panel-heading">
              <div>
                <h2 id="seatmap-title">Ma trận ghế</h2>
                <p id="seatmap-help">Chọn ghế để xem thông tin. Ghế đôi chiếm 2 ô liền nhau.</p>
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
                {{
                  option.value === 'STANDARD'
                    ? 'STANDARD'
                    : option.value === 'VIP'
                      ? 'VIP'
                      : option.label
                }}
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

            <p v-if="!catalog.matrix" class="seatmap-muted" role="status">
              {{
                seats.isError.value || catalog.error
                  ? 'Chưa thể hiển thị ma trận ghế.'
                  : 'Đang tải danh mục ghế…'
              }}
            </p>

            <p v-else-if="!catalog.matrix.seats.length" class="seatmap-muted" role="status">
              Phòng chưa có ghế trong danh mục.
            </p>

            <div
              v-else
              class="seatmap-viewport"
              :style="{ '--seatmap-column-count': catalog.matrix.columnCount }"
            >
              <div class="seatmap-axis" aria-hidden="true">
                <div v-for="row in catalog.matrix.rows" :key="row.label" class="seatmap-row-label">
                  {{ row.label }}
                </div>
              </div>

              <div
                class="seatmap-scroll"
                role="region"
                aria-label="Ma trận ghế, có thể cuộn ngang"
                aria-describedby="seatmap-help"
                tabindex="0"
              >
                <div class="seatmap-content">
                  <div class="seatmap-stage"><span>MÀN HÌNH</span></div>

                  <div v-for="row in catalog.matrix.rows" :key="row.label" class="seatmap-row">
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
                <dt>Trạng thái</dt>
                <dd>{{ statusLabel(selected.seat.active) }}</dd>
              </div>
            </dl>
            <p v-else class="seatmap-muted">Chọn ghế để xem thông tin.</p>

            <AppButton
              v-if="selected"
              variant="secondary"
              :disabled="busy || !ready || Boolean(catalog.error)"
              :loading="activity.isPending.value"
              @click="changeActivity"
            >
              {{ selected.seat.active ? 'Tạm ngưng ghế' : 'Kích hoạt ghế' }}
            </AppButton>

            <p v-if="activityError" class="seatmap-error" role="alert">
              {{ activityError }}
            </p>
            <p v-if="activityMessage" role="status">{{ activityMessage }}</p>

            <template v-if="catalog.matrix">
              <h3 class="seatmap-details__subtitle">Thống kê</h3>
              <dl>
                <div>
                  <dt>Số hàng</dt>
                  <dd>{{ catalog.matrix.rows.length }}</dd>
                </div>
                <div>
                  <dt>Số cột</dt>
                  <dd>{{ catalog.matrix.columnCount }}</dd>
                </div>
                <div>
                  <dt>Tổng số ô</dt>
                  <dd>{{ catalog.matrix.rows.length * catalog.matrix.columnCount }}</dd>
                </div>
                <div>
                  <dt>Ô đã chiếm</dt>
                  <dd>{{ catalog.matrix.occupiedCount }}</dd>
                </div>
                <div v-for="option in adminSeatTypeOptions" :key="option.value">
                  <dt>
                    {{
                      option.value === 'STANDARD'
                        ? 'Ghế thường'
                        : option.value === 'VIP'
                          ? 'Ghế VIP'
                          : option.label
                    }}
                  </dt>
                  <dd>
                    {{
                      catalog.matrix.seats.filter((seat) => seat.seatType === option.value).length
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Ngừng sử dụng</dt>
                  <dd>{{ catalog.matrix.inactiveCount }}</dd>
                </div>
                <div>
                  <dt>Ô trống</dt>
                  <dd>{{ catalog.matrix.emptyCount }}</dd>
                </div>
                <div>
                  <dt>Tổng số chỗ</dt>
                  <dd>{{ catalog.matrix.capacity }}</dd>
                </div>

                <div>
                  <dt>Chỗ đang hoạt động</dt>
                  <dd>{{ catalog.matrix.activeCapacity }}</dd>
                </div>
              </dl>
            </template>
          </aside>
        </div>
      </template>
    </template>
  </section>
</template>
