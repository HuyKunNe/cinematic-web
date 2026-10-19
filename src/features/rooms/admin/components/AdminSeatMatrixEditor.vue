<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import {
  matrixRowLabel,
  matrixSeatTypes,
  useAdminSeatMatrix,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  change: [value: SeatMatrixDocument]
}>()

type StructureAction = {
  label: string
  message: string
  run: () => boolean
  unavailable?: () => boolean
  danger?: boolean
}

const matrix = useAdminSeatMatrix()
const { document, selection, selectedSeat, statistics } = matrix

const prefix = useId()
const table = ref<HTMLTableElement | null>(null)
const drafts = ref<Record<string, string>>({})
const fieldErrors = ref<Record<string, string>>({})
const status = ref('Ma trận mới có 6 hàng, 6 cột và chưa có ghế.')
const error = ref('')

const selectedTitle = computed(() => {
  const label = matrixRowLabel(selection.value.row)

  return selectedSeat.value
    ? `${label}${selectedSeat.value.number}`
    : `${label} · ô ${selection.value.column + 1}`
})

const structureGroups: {
  title: string
  actions: StructureAction[]
}[] = [
  {
    title: 'Thao tác hàng',
    actions: [
      {
        label: 'Chèn hàng phía trên',
        message: 'Đã chèn hàng phía trên và cập nhật nhãn hàng.',
        run: () => matrix.insertRow(selection.value.row),
      },
      {
        label: 'Chèn hàng phía dưới',
        message: 'Đã chèn hàng phía dưới và cập nhật nhãn hàng.',
        run: () => matrix.insertRow(selection.value.row + 1),
      },
      {
        label: 'Xóa hàng đang chọn',
        message: 'Đã xóa hàng cùng các ghế và cập nhật nhãn hàng.',
        run: matrix.deleteSelectedRow,
        unavailable: () => statistics.value.rows <= 1,
        danger: true,
      },
    ],
  },
  {
    title: 'Thao tác cột',
    actions: [
      {
        label: 'Chèn cột bên trái',
        message: 'Đã chèn cột bên trái trên tất cả hàng.',
        run: () => matrix.insertColumn(selection.value.column),
      },
      {
        label: 'Chèn cột bên phải',
        message: 'Đã chèn cột bên phải trên tất cả hàng.',
        run: () => matrix.insertColumn(selection.value.column + 1),
      },
      {
        label: 'Xóa cột đang chọn',
        message: 'Đã xóa cột trên tất cả hàng và đánh số lại ghế.',
        run: matrix.deleteSelectedColumn,
        unavailable: () => statistics.value.columns <= 1,
        danger: true,
      },
    ],
  },
]

watch(document, () => emit('change', matrix.snapshot()), { deep: true })

function cellKey(row: number, column: number) {
  return `${row}:${column}`
}

function fieldErrorId(row: number, column: number) {
  return `${prefix}-cell-error-${row}-${column}`
}

function announce(message: string, isError = false) {
  error.value = isError ? message : ''
  status.value = isError ? '' : message
}

function updateDraft(row: number, column: number, event: Event) {
  if (props.disabled) return

  const key = cellKey(row, column)
  drafts.value[key] = (event.target as HTMLInputElement).value
  delete fieldErrors.value[key]
  error.value = ''
}

function commit(row: number, column: number) {
  if (props.disabled) return

  const key = cellKey(row, column)
  const raw = drafts.value[key]

  if (raw === undefined) return

  const result = matrix.addSeat(row, column, raw)

  if (!result.ok) {
    drafts.value[key] = ''
    fieldErrors.value[key] = result.message
    announce(result.message, true)
    return
  }

  delete drafts.value[key]
  delete fieldErrors.value[key]

  if (result.changed) {
    announce(`Đã thêm ghế hàng ${matrixRowLabel(row)} và đánh số lại theo vị trí.`)
  }
}

function onEnter(event: KeyboardEvent, row: number, column: number) {
  if (event.isComposing) return

  event.preventDefault()
  commit(row, column)
}

async function focusSelected() {
  await nextTick()

  table.value
    ?.querySelector<HTMLInputElement>(
      `[data-cell="${cellKey(selection.value.row, selection.value.column)}"]`,
    )
    ?.focus()
}

async function selectRow(row: number) {
  if (props.disabled) return

  matrix.select(row, selection.value.column)
  await focusSelected()
}

async function mutate(action: () => boolean, message: string) {
  if (props.disabled || !action()) return

  drafts.value = {}
  fieldErrors.value = {}
  announce(message)
  await focusSelected()
}

function runStructureAction(action: StructureAction) {
  if (action.unavailable?.()) return
  void mutate(action.run, action.message)
}

function changeType(event: Event) {
  if (props.disabled) return

  const value = (event.target as HTMLSelectElement).value

  if (matrix.changeSelectedType(value)) {
    announce(`Đã đổi loại ghế ${selectedTitle.value}.`)
  }
}

function reset() {
  if (props.disabled) return

  if (
    statistics.value.seats > 0 &&
    !window.confirm('Tạo ma trận 6 × 6 trống và bỏ các ghế đang chỉnh?')
  ) {
    return
  }

  matrix.reset()
  drafts.value = {}
  fieldErrors.value = {}
  announce('Đã tạo ma trận mới: 6 hàng, 6 cột và 0 ghế.')
}
</script>

<template>
  <fieldset class="seat-matrix-editor" :disabled="disabled">
    <legend class="admin-visually-hidden">Chỉnh sửa ma trận ghế</legend>

    <div class="seat-matrix-editor__toolbar">
      <button type="button" @click="reset">Tạo ma trận mới</button>
      <span>{{ statistics.rows }} hàng × {{ statistics.columns }} cột</span>
    </div>

    <div class="seat-matrix-editor__workspace">
      <section
        class="seat-matrix-editor__panel seat-matrix-editor__main"
        :aria-labelledby="`${prefix}-title`"
      >
        <header class="seat-matrix-editor__heading">
          <div>
            <h2 :id="`${prefix}-title`">Ma trận ghế</h2>
            <p :id="`${prefix}-help`">
              Nhập số nguyên dương chưa dùng trong hàng vào ô trống. Ghế tự đánh số từ trái sang
              phải, bỏ qua ô trống.
            </p>
          </div>
          <span class="seat-matrix-editor__badge"> {{ statistics.seats }} ghế </span>
        </header>

        <p :id="`${prefix}-status`" role="status" aria-live="polite">
          {{ status }}
        </p>
        <p v-if="error" class="seat-matrix-editor__error" role="alert">
          {{ error }}
        </p>

        <div
          class="seat-matrix-editor__scroll"
          role="region"
          aria-label="Ma trận ghế, có thể cuộn ngang"
          tabindex="0"
        >
          <div class="seat-matrix-editor__frame">
            <div class="seat-matrix-editor__screen">MÀN HÌNH CHIẾU</div>

            <table ref="table" :aria-describedby="`${prefix}-help ${prefix}-status`">
              <caption class="admin-visually-hidden">
                Cột đầu là nhãn hàng. Mỗi ô còn lại có thể trống hoặc chứa một ghế.
              </caption>

              <tbody>
                <tr v-for="(row, rowIndex) in document.rows" :key="rowIndex">
                  <th scope="row">
                    <button
                      type="button"
                      :aria-label="`Chọn hàng ${matrixRowLabel(rowIndex)}`"
                      :aria-pressed="selection.row === rowIndex"
                      @click="selectRow(rowIndex)"
                    >
                      {{ matrixRowLabel(rowIndex) }}
                    </button>
                  </th>

                  <td
                    v-for="(seat, columnIndex) in row"
                    :key="columnIndex"
                    :data-seat-type="seat?.seatType"
                    :class="{
                      'is-selected': selection.row === rowIndex && selection.column === columnIndex,
                    }"
                  >
                    <input
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      :spellcheck="false"
                      :data-cell="cellKey(rowIndex, columnIndex)"
                      :readonly="Boolean(seat)"
                      :value="drafts[cellKey(rowIndex, columnIndex)] ?? seat?.number ?? ''"
                      :aria-invalid="fieldErrors[cellKey(rowIndex, columnIndex)] ? true : undefined"
                      :aria-describedby="
                        fieldErrors[cellKey(rowIndex, columnIndex)]
                          ? fieldErrorId(rowIndex, columnIndex)
                          : `${prefix}-help`
                      "
                      :aria-label="
                        seat
                          ? `Ghế ${matrixRowLabel(rowIndex)}${seat.number}, ${seat.seatType}`
                          : `Ô trống hàng ${matrixRowLabel(rowIndex)}, vị trí ${columnIndex + 1}`
                      "
                      @focus="matrix.select(rowIndex, columnIndex)"
                      @input="updateDraft(rowIndex, columnIndex, $event)"
                      @blur="commit(rowIndex, columnIndex)"
                      @keydown.enter="onEnter($event, rowIndex, columnIndex)"
                    />

                    <span
                      v-if="fieldErrors[cellKey(rowIndex, columnIndex)]"
                      :id="fieldErrorId(rowIndex, columnIndex)"
                      class="admin-visually-hidden"
                    >
                      {{ fieldErrors[cellKey(rowIndex, columnIndex)] }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <button
              class="seat-matrix-editor__add-column"
              type="button"
              @click="
                mutate(
                  () => matrix.insertColumn(document.columns),
                  'Đã thêm cột trống trên tất cả hàng.',
                )
              "
            >
              <span aria-hidden="true">＋</span>
              Thêm cột
            </button>

            <button
              class="seat-matrix-editor__add-row"
              type="button"
              @click="mutate(() => matrix.insertRow(document.rows.length), 'Đã thêm hàng trống.')"
            >
              <span aria-hidden="true">＋</span>
              Thêm hàng
            </button>
          </div>
        </div>

        <footer>
          <span>
            {{ statistics.rows }} hàng · {{ statistics.columns }} cột · {{ statistics.empty }} ô
            trống
          </span>
          <span>Tab để chọn ô · Enter để xác nhận</span>
        </footer>
      </section>

      <aside class="seat-matrix-editor__inspector" aria-label="Thuộc tính ma trận">
        <section class="seat-matrix-editor__panel">
          <h2>{{ selectedTitle }}</h2>
          <p>
            {{ selectedSeat ? 'Đổi loại ghế hoặc xóa ghế trong ô.' : 'Ô này chưa có ghế.' }}
          </p>

          <label :for="`${prefix}-type`">Loại ghế</label>
          <select
            :id="`${prefix}-type`"
            :value="selectedSeat?.seatType ?? 'STANDARD'"
            :disabled="!selectedSeat || disabled"
            @change="changeType"
          >
            <option v-for="option in matrixSeatTypes" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <button
            type="button"
            class="is-danger"
            :disabled="!selectedSeat || disabled"
            @click="
              mutate(
                matrix.clearSelectedSeat,
                'Đã xóa ghế, giữ nguyên ô trống và đánh số lại hàng.',
              )
            "
          >
            Xóa ghế trong ô
          </button>
        </section>

        <section
          v-for="group in structureGroups"
          :key="group.title"
          class="seat-matrix-editor__panel"
        >
          <h2>{{ group.title }}</h2>

          <button
            v-for="action in group.actions"
            :key="action.label"
            type="button"
            :class="{ 'is-danger': action.danger }"
            :disabled="disabled || Boolean(action.unavailable?.())"
            @click="runStructureAction(action)"
          >
            {{ action.label }}
          </button>
        </section>

        <section class="seat-matrix-editor__panel">
          <h2>Thống kê</h2>
          <dl>
            <div>
              <dt>Số hàng</dt>
              <dd>{{ statistics.rows }}</dd>
            </div>
            <div>
              <dt>Số cột</dt>
              <dd>{{ statistics.columns }}</dd>
            </div>
            <div>
              <dt>Tổng số ghế</dt>
              <dd>{{ statistics.seats }}</dd>
            </div>
            <div>
              <dt>Ô trống</dt>
              <dd>{{ statistics.empty }}</dd>
            </div>
            <div v-for="option in matrixSeatTypes" :key="option.value">
              <dt>{{ option.value }}</dt>
              <dd>{{ statistics[option.value] }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  </fieldset>
</template>

<style scoped>
.seat-matrix-editor {
  --matrix-cell-size: var(--space-16);
  --matrix-axis-size: var(--space-16);
  --matrix-edge-size: 6rem;
  --matrix-main-basis: 32rem;
  --matrix-inspector-size: 20rem;
  --matrix-axis-layer: 1;
  --matrix-seat-tint: 12%;
  --matrix-screen-spacing: 0.14em;

  display: grid;
  min-width: 0;
  margin: 0;
  padding: 0;
  gap: var(--space-4);
  border: 0;
}

.seat-matrix-editor__toolbar,
.seat-matrix-editor__panel {
  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.seat-matrix-editor__toolbar,
.seat-matrix-editor__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.seat-matrix-editor__toolbar {
  align-items: center;
}

.seat-matrix-editor__workspace {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-4);
}

.seat-matrix-editor__main {
  flex: 999 1 var(--matrix-main-basis);
}

.seat-matrix-editor__inspector {
  display: grid;
  flex: 1 1 var(--matrix-inspector-size);
  min-width: 0;
  gap: var(--space-4);
}

.seat-matrix-editor__inspector .seat-matrix-editor__panel {
  display: grid;
  gap: var(--space-3);
}

.seat-matrix-editor h2 {
  margin: 0;
  font-size: var(--font-size-md);
}

.seat-matrix-editor p,
.seat-matrix-editor footer,
.seat-matrix-editor label,
.seat-matrix-editor__toolbar > span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.seat-matrix-editor__heading p {
  margin: var(--space-2) 0 0;
}

.seat-matrix-editor__badge {
  padding: var(--space-1) var(--space-2);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.seat-matrix-editor footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.seat-matrix-editor__scroll {
  max-width: 100%;
  overflow-x: auto;
  padding: var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  overscroll-behavior-inline: contain;
}

.seat-matrix-editor__frame {
  display: grid;
  width: max-content;
  grid-template-columns: max-content var(--matrix-edge-size);
  gap: var(--space-3);
  margin-inline: auto;
}

.seat-matrix-editor__screen {
  display: grid;
  grid-column: 1;
  grid-row: 1;
  min-height: var(--control-height-md);
  place-items: center;
  margin-inline-start: var(--matrix-axis-size);
  border-top: var(--space-1) solid var(--color-primary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  letter-spacing: var(--matrix-screen-spacing);
}

.seat-matrix-editor table {
  grid-column: 1;
  grid-row: 2;
  border-collapse: collapse;
}

.seat-matrix-editor th,
.seat-matrix-editor td {
  min-width: var(--matrix-cell-size);
  height: var(--matrix-cell-size);
  padding: var(--space-2);
  border: var(--border-width-thin) solid var(--color-border);
  text-align: center;
}

.seat-matrix-editor th {
  position: sticky;
  left: 0;
  z-index: var(--matrix-axis-layer);
  background: var(--color-surface);
}

.seat-matrix-editor input {
  width: calc(var(--matrix-cell-size) - var(--space-2) * 2);
  min-height: var(--control-height-md);
  padding: 0;
  border: var(--border-width-thin) dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  text-align: center;
}

.seat-matrix-editor [data-seat-type='STANDARD'] {
  --matrix-seat-color: var(--color-success);
}

.seat-matrix-editor [data-seat-type='VIP'] {
  --matrix-seat-color: var(--color-primary);
}

.seat-matrix-editor [data-seat-type='COUPLE'] {
  --matrix-seat-color: var(--color-warning);
}

.seat-matrix-editor [data-seat-type='ACCESSIBLE'] {
  --matrix-seat-color: var(--color-text-secondary);
}

.seat-matrix-editor input[readonly] {
  border-style: solid;
  border-color: var(--matrix-seat-color);
  background: color-mix(
    in srgb,
    var(--matrix-seat-color) var(--matrix-seat-tint),
    var(--color-surface)
  );
  cursor: pointer;
}

.seat-matrix-editor td.is-selected {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: calc(var(--focus-ring-width) * -1);
}

.seat-matrix-editor button,
.seat-matrix-editor select {
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.seat-matrix-editor select {
  width: 100%;
  min-width: 0;
}

.seat-matrix-editor button:not(:disabled):hover {
  border-color: var(--color-primary);
}

.seat-matrix-editor button[aria-pressed='true'] {
  color: var(--color-primary);
}

.seat-matrix-editor__add-column {
  display: flex;
  grid-column: 2;
  grid-row: 2;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.seat-matrix-editor__add-row {
  grid-column: 1;
  grid-row: 3;
  margin-inline-start: var(--matrix-axis-size);
}

.seat-matrix-editor .is-danger,
.seat-matrix-editor .seat-matrix-editor__error {
  color: var(--color-error);
}

.seat-matrix-editor input[aria-invalid='true'] {
  border-style: solid;
  border-color: var(--color-error);
}

.seat-matrix-editor :is(button, input, select, .seat-matrix-editor__scroll):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.seat-matrix-editor :disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.seat-matrix-editor dl {
  display: grid;
  margin: 0;
  gap: var(--space-2);
}

.seat-matrix-editor dl > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.seat-matrix-editor dt {
  color: var(--color-text-secondary);
}

.seat-matrix-editor dd {
  margin: 0;
}
</style>
