<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { SeatResponse } from '@/services/api/generated/inventory-service/model'

const props = defineProps<{
  roomId: string
  seats: readonly SeatResponse[]
  editable: boolean
}>()

defineSlots<{
  actions(props: { seat: SeatResponse }): unknown
}>()

type MatrixSeat = SeatResponse & {
  id: string
  rowLabel: string
  seatNumber: string
}

type MatrixRow = {
  label: string
  cells: (string | null)[]
}

const root = ref<HTMLElement | null>(null)
const instructionsId = useId()
const matrixRows = ref<MatrixRow[]>([])
const columns = ref(1)
const selectedId = ref('')
const movingId = ref('')
const draggedId = ref('')
const dirty = ref(false)
const notice = ref('')

const collator = new Intl.Collator('vi', { numeric: true })

const catalog = computed(() => {
  const byId = new Map<string, MatrixSeat>()

  for (const seat of props.seats) {
    if (
      !seat.id ||
      seat.roomId !== props.roomId ||
      !seat.rowLabel?.trim() ||
      !seat.seatNumber?.trim() ||
      byId.has(seat.id)
    ) {
      return {
        byId: new Map<string, MatrixSeat>(),
        error: 'Dữ liệu ghế không hợp lệ. Hãy tải lại danh sách.',
      }
    }

    byId.set(seat.id, seat as MatrixSeat)
  }

  return { byId, error: '' }
})

const selectedSeat = computed(() => catalog.value.byId.get(selectedId.value))
const canEdit = computed(
  () => props.editable && !catalog.value.error && matrixRows.value.length > 0,
)

// Đổi active/seatType không làm mất bản sắp xếp.
// Đổi phòng, thêm/xóa hoặc đổi tên/hàng ghế sẽ khởi tạo lại.
const structureKey = computed(() =>
  JSON.stringify([
    props.roomId,
    props.seats
      .map((seat) => [seat.id ?? '', seat.rowLabel ?? '', seat.seatNumber ?? ''])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]),
)

function rebuild() {
  const grouped = new Map<string, MatrixSeat[]>()

  for (const seat of catalog.value.byId.values()) {
    const items = grouped.get(seat.rowLabel) ?? []
    items.push(seat)
    grouped.set(seat.rowLabel, items)
  }

  const groups = [...grouped].sort(([a], [b]) => collator.compare(a, b))
  columns.value = Math.max(1, ...groups.map(([, items]) => items.length))

  matrixRows.value = groups.map(([label, items]) => {
    items.sort((a, b) => collator.compare(a.seatNumber, b.seatNumber) || a.id.localeCompare(b.id))

    const cells: (string | null)[] = items.map((seat) => seat.id)
    while (cells.length < columns.value) cells.push(null)

    return { label, cells }
  })

  selectedId.value = ''
  movingId.value = ''
  draggedId.value = ''
  dirty.value = false
}

watch(
  structureKey,
  () => {
    const hadChanges = dirty.value
    rebuild()
    notice.value = hadChanges ? 'Danh mục ghế đã thay đổi. Bản sắp xếp tạm được khởi tạo lại.' : ''
  },
  { immediate: true, flush: 'sync' },
)

watch(canEdit, (enabled) => {
  if (!enabled) {
    movingId.value = ''
    draggedId.value = ''
  }
})

function seatAt(id: string | null) {
  return id ? catalog.value.byId.get(id) : undefined
}

function addColumn() {
  if (!canEdit.value) return

  columns.value += 1
  for (const row of matrixRows.value) row.cells.push(null)
  dirty.value = true
  notice.value = `Đã thêm cột ${columns.value}. Chưa lưu.`
}

function resetArrangement() {
  if (!canEdit.value) return
  rebuild()
  notice.value = 'Đã đặt lại bản sắp xếp tạm.'
}

async function focusSeat(id: string) {
  await nextTick()

  const button = [
    ...(root.value?.querySelectorAll<HTMLButtonElement>('[data-seat-id]') ?? []),
  ].find((element) => element.dataset.seatId === id)

  button?.focus()
}

function moveSeat(id: string, targetRow: number, targetColumn: number) {
  if (!canEdit.value) return

  const sourceRow = matrixRows.value.findIndex((row) => row.cells.includes(id))
  const destination = matrixRows.value[targetRow]

  if (sourceRow < 0 || !destination) return

  // Đổi rowLabel là thao tác danh mục khác, chưa thuộc round này.
  if (sourceRow !== targetRow) {
    notice.value = 'Chỉ di chuyển trong cùng hàng. Hàng của ghế được giữ nguyên.'
    return
  }

  const sourceColumn = destination.cells.indexOf(id)
  if (sourceColumn === targetColumn) {
    movingId.value = ''
    return
  }

  const cells = [...destination.cells]
  cells[sourceColumn] = null

  if (cells[targetColumn]) {
    // Dịch toàn bộ phần phía sau sang phải, kể cả các ô trống.
    cells.splice(targetColumn, 0, null)
  }

  cells[targetColumn] = id
  const nextColumns = Math.max(columns.value, cells.length)

  matrixRows.value = matrixRows.value.map((row, index) => {
    const nextCells = index === targetRow ? cells : [...row.cells]
    while (nextCells.length < nextColumns) nextCells.push(null)
    return { label: row.label, cells: nextCells }
  })

  columns.value = nextColumns
  selectedId.value = id
  movingId.value = ''
  dirty.value = true
  notice.value = `Đã chuyển ${catalog.value.byId.get(id)?.seatNumber} đến cột ${
    targetColumn + 1
  }. Chưa lưu.`

  void focusSeat(id)
}

function clickCell(row: number, column: number, id: string | null) {
  if (movingId.value && canEdit.value) {
    moveSeat(movingId.value, row, column)
    return
  }

  selectedId.value = id ?? ''
}

function startDrag(event: DragEvent, id: string | null) {
  if (!canEdit.value || !id || !event.dataTransfer) {
    event.preventDefault()
    return
  }

  draggedId.value = id
  selectedId.value = id
  movingId.value = ''
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', id)
}

function allowDrop(event: DragEvent) {
  if (!canEdit.value || !draggedId.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function drop(event: DragEvent, row: number, column: number) {
  if (!draggedId.value || !canEdit.value) return
  event.preventDefault()

  const id = draggedId.value
  draggedId.value = ''
  moveSeat(id, row, column)
}

function cancelMove(event: KeyboardEvent) {
  if (!movingId.value && !draggedId.value) return
  event.preventDefault()
  event.stopPropagation()
  movingId.value = ''
  draggedId.value = ''
  notice.value = 'Đã hủy thao tác di chuyển.'
}
</script>

<template>
  <section
    ref="root"
    class="admin-seat-matrix"
    data-reference="admin-room-seats"
    aria-label="Ma trận ghế của phòng"
    @keydown.esc="cancelMove"
  >
    <p class="admin-seat-matrix__note">
      Bản sắp xếp tạm, chưa lưu. Đóng dialog sẽ mất vị trí đã sắp xếp. Màn hình, lối đi và cửa thoát
      hiểm được cấu hình riêng.
    </p>

    <p v-if="catalog.error" class="admin-seat-matrix__error" role="alert">
      {{ catalog.error }}
    </p>

    <template v-else-if="matrixRows.length">
      <div class="admin-seat-matrix__actions">
        <AppButton variant="secondary" size="sm" :disabled="!canEdit" @click="addColumn">
          Thêm cột
        </AppButton>

        <AppButton
          variant="secondary"
          size="sm"
          :disabled="!canEdit || !selectedSeat"
          @click="movingId = selectedId"
        >
          Di chuyển ghế đã chọn
        </AppButton>

        <AppButton
          variant="ghost"
          size="sm"
          :disabled="!canEdit || !dirty"
          @click="resetArrangement"
        >
          Đặt lại sắp xếp
        </AppButton>

        <span>{{ columns }} cột · {{ seats.length }} ghế</span>
      </div>

      <p :id="instructionsId" class="admin-seat-matrix__note">
        Chọn ghế để xem thông tin. Kéo ghế vào ô đích hoặc chọn “Di chuyển ghế đã chọn”, rồi bấm ô
        đích. Có thể dùng Tab và Enter. Escape hủy thao tác di chuyển.
      </p>

      <p v-if="movingId" class="admin-seat-matrix__note" role="status">
        Chọn ô đích cho {{ seatAt(movingId)?.seatNumber }}.
      </p>

      <div class="admin-seat-matrix__viewport" :style="{ '--matrix-columns': columns }">
        <div class="admin-seat-matrix__axis">
          <div class="admin-seat-matrix__axis-heading">Hàng</div>
          <div v-for="row in matrixRows" :key="row.label" class="admin-seat-matrix__row-label">
            {{ row.label }}
          </div>
        </div>

        <div
          class="admin-seat-matrix__scroll"
          role="region"
          aria-label="Các ô vị trí ghế"
          :aria-describedby="instructionsId"
          tabindex="0"
        >
          <div class="admin-seat-matrix__columns" aria-hidden="true">
            <span v-for="column in columns" :key="column">{{ column }}</span>
          </div>

          <div
            v-for="(row, rowIndex) in matrixRows"
            :key="row.label"
            class="admin-seat-matrix__row"
          >
            <button
              v-for="(id, columnIndex) in row.cells"
              :key="columnIndex"
              class="admin-seat-matrix__cell"
              type="button"
              :class="{
                'is-selected': Boolean(id && id === selectedId),
                'is-inactive': seatAt(id)?.active === false,
              }"
              :data-seat-id="id ?? undefined"
              :draggable="Boolean(id && canEdit)"
              :aria-pressed="Boolean(id && id === selectedId)"
              :aria-label="`Hàng ${row.label}, cột ${columnIndex + 1}: ${
                seatAt(id)?.seatNumber ?? 'ô trống'
              }${seatAt(id)?.active === false ? ', tạm ngưng' : ''}`"
              @click="clickCell(rowIndex, columnIndex, id)"
              @dragstart="startDrag($event, id)"
              @dragend="draggedId = ''"
              @dragover="allowDrop"
              @drop="drop($event, rowIndex, columnIndex)"
            >
              <span v-if="id" class="admin-seat-matrix__seat">
                {{ seatAt(id)?.seatNumber }}
              </span>
              <span v-else class="admin-seat-matrix__empty" aria-hidden="true"> · </span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedSeat" class="admin-seat-matrix__details">
        <slot name="actions" :seat="selectedSeat" />
      </div>
    </template>

    <p v-else class="admin-seat-matrix__note">Phòng chưa có ghế.</p>

    <p v-if="notice" class="admin-seat-matrix__note" role="status" aria-live="polite">
      {{ notice }}
    </p>
  </section>
</template>

<style scoped src="@/styles/admin-seat-matrix.css"></style>
