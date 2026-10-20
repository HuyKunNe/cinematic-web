<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import {
  MATRIX_LIMITS,
  matrixRowLabel,
  matrixSeatSpan,
  matrixSeatTypes,
  useAdminSeatMatrix,
  type MatrixCell,
  type MatrixSeat,
  type SeatMatrixDocument,
} from '../composables/use-admin-seat-matrix'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    initialDocument?: SeatMatrixDocument
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  change: [value: SeatMatrixDocument]
  pending: [value: boolean]
}>()

type StructureAction = {
  label: string
  message: string
  run: () => boolean
  unavailable?: () => boolean
  danger?: boolean
}

type RenderedCell = {
  seat: MatrixCell
  column: number
  span: 1 | 2
}

type PendingSeat = {
  key: string
  row: number
  column: number
  raw: string
  seatType: MatrixSeat['seatType']
}

const ROW_DRAG_TYPE = 'application/x-cinema-matrix-row'

const matrix = useAdminSeatMatrix(props.initialDocument)

const {
  document,
  selection,
  selectedSeat,
  selectedSpan,
  statistics,
  operationError,
  canUndo,
  canRedo,
} = matrix

const prefix = useId()
const table = ref<HTMLTableElement | null>(null)
const draftControls = ref<HTMLDivElement | null>(null)

const draggedRow = ref<number | null>(null)
const dropTargetRow = ref<number | null>(null)

const drafts = ref<Record<string, string>>({})
const draftTypes = ref<Record<string, MatrixSeat['seatType']>>({})
const newSeatType = ref<MatrixSeat['seatType'] | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const navigationColumn = ref<number | null>(null)

const status = ref(
  `Ma trận có ${statistics.value.rows} hàng, ` +
    `${statistics.value.columns} cột và ${statistics.value.seats} ghế.`,
)
const error = ref('')

const selectedKey = computed(() => cellKey(selection.value.row, selection.value.column))

const selectedDraftType = computed(
  () => draftTypes.value[selectedKey.value] ?? newSeatType.value ?? 'STANDARD',
)

const hasPending = computed(
  () =>
    Object.values(drafts.value).some((value) => value.trim().length > 0) ||
    Object.keys(fieldErrors.value).length > 0,
)

const selectedHasDraft = computed(
  () =>
    Boolean(drafts.value[selectedKey.value]?.trim()) ||
    draftTypes.value[selectedKey.value] !== undefined ||
    fieldErrors.value[selectedKey.value] !== undefined,
)

const selectedTitle = computed(() => {
  const label = matrixRowLabel(selection.value.row)

  return selectedSeat.value
    ? `${label}${selectedSeat.value.number}`
    : `${label} · ô ${selection.value.column + 1}`
})

const structureGroups: {
  title: string
  description?: string
  actions: StructureAction[]
}[] = [
  {
    title: 'Thao tác ô',
    actions: [
      {
        label: 'Chèn ô bên phải',
        message: 'Đã chèn ô trống bên phải trong hàng đang chọn.',
        run: () =>
          matrix.insertCell(selection.value.row, selection.value.column + selectedSpan.value),
      },
      {
        label: 'Xóa ô',
        message: 'Đã xóa vùng ô đang chọn, dịch các ô phía sau sang trái và đánh số lại hàng.',
        run: matrix.deleteSelectedCell,
        danger: true,
      },
    ],
  },
  {
    title: 'Thao tác hàng',
    actions: [
      {
        label: 'Chèn hàng phía trên',
        message: 'Đã chèn hàng phía trên và cập nhật nhãn hàng.',
        run: () => matrix.insertRow(selection.value.row),
        unavailable: () => statistics.value.rows >= MATRIX_LIMITS.dimension,
      },
      {
        label: 'Chèn hàng phía dưới',
        message: 'Đã chèn hàng phía dưới và cập nhật nhãn hàng.',
        run: () => matrix.insertRow(selection.value.row + 1),
        unavailable: () => statistics.value.rows >= MATRIX_LIMITS.dimension,
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
        unavailable: () => statistics.value.columns >= MATRIX_LIMITS.dimension,
      },
      {
        label: 'Chèn cột bên phải',
        message: 'Đã chèn cột bên phải trên tất cả hàng.',
        run: () => matrix.insertColumn(selection.value.column + selectedSpan.value),
        unavailable: () => statistics.value.columns >= MATRIX_LIMITS.dimension,
      },
      {
        label: 'Xóa cột đang chọn',
        message: 'Đã xóa cột và đánh số lại ghế. Ghế đôi đi qua cột này được xóa toàn bộ.',
        run: matrix.deleteSelectedColumn,
        unavailable: () => statistics.value.columns <= 1,
        danger: true,
      },
    ],
  },
]

watch(
  document,
  () => {
    clearRowDrag()
    emit('change', matrix.snapshot())
  },
  { deep: true, flush: 'sync' },
)

watch(hasPending, (value) => emit('pending', value), {
  immediate: true,
  flush: 'sync',
})

watch(
  () => props.disabled,
  (value) => {
    if (value) clearRowDrag()
  },
  { flush: 'sync' },
)

function renderedRow(row: readonly MatrixCell[]): RenderedCell[] {
  const result: RenderedCell[] = []

  for (let column = 0; column < row.length;) {
    const seat = row[column] ?? null
    const span = matrixSeatSpan(seat)

    result.push({ seat, column, span })
    column += span
  }

  return result
}

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

function clearInputs() {
  drafts.value = {}
  draftTypes.value = {}
  fieldErrors.value = {}
}

function clearRowDrag() {
  draggedRow.value = null
  dropTargetRow.value = null
}

function pendingSeats(): PendingSeat[] {
  return Object.entries(drafts.value)
    .map(([key, raw]) => {
      const [row, column] = key.split(':').map(Number)

      return {
        key,
        row: row!,
        column: column!,
        raw,
        seatType: draftTypes.value[key] ?? newSeatType.value ?? 'STANDARD',
      }
    })
    .sort((a, b) => a.row - b.row || a.column - b.column)
}

function pendingCoupleError(row: number, column: number, seatType: string) {
  if (seatType === 'COUPLE' && drafts.value[cellKey(row, column + 1)]?.trim()) {
    return (
      'Ô bên phải đang có số ghế chưa xác nhận. ' +
      'Hãy xác nhận hoặc bỏ nhập ô đó trước khi tạo ghế đôi.'
    )
  }

  return ''
}

function showFieldError(row: number, column: number, message: string) {
  fieldErrors.value[cellKey(row, column)] = message
  announce(message, true)
}

async function focusSelected() {
  await nextTick()

  table.value
    ?.querySelector<HTMLInputElement>(
      `[data-cell="${cellKey(selection.value.row, selection.value.column)}"]`,
    )
    ?.focus()
}

function focusPending(key: string, message: string) {
  const [row, column] = key.split(':').map(Number)

  matrix.select(row!, column!)
  announce(message, true)
  void focusSelected()
}

function protectPending() {
  if (!hasPending.value) return false

  const first =
    pendingSeats().find((item) => item.raw.trim())?.key ?? Object.keys(fieldErrors.value)[0]

  const message = 'Hãy xác nhận hoặc bỏ nhập ghế đang chờ trước khi thay đổi ma trận.'

  if (first) focusPending(first, message)
  else announce(message, true)

  return true
}

function onRowDragStart(event: DragEvent, rowIndex: number) {
  clearRowDrag()

  if (props.disabled || statistics.value.rows < 2 || protectPending() || !event.dataTransfer) {
    event.preventDefault()
    return
  }

  event.stopPropagation()
  matrix.select(rowIndex, selection.value.column)

  draggedRow.value = rowIndex
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(ROW_DRAG_TYPE, prefix)
  event.dataTransfer.setData('text/plain', matrixRowLabel(rowIndex))

  const rowElement =
    event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('tr') : null

  if (rowElement) {
    event.dataTransfer.setDragImage(rowElement, 0, rowElement.getBoundingClientRect().height / 2)
  }

  announce(`Đang kéo hàng ${matrixRowLabel(rowIndex)}.`)
}

function onRowDragOver(event: DragEvent, rowIndex: number) {
  if (props.disabled || draggedRow.value === null || hasPending.value) return

  event.preventDefault()
  event.stopPropagation()

  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

  dropTargetRow.value = rowIndex === draggedRow.value ? null : rowIndex
}

function onTableDragLeave(event: DragEvent) {
  if (event.relatedTarget instanceof Node && table.value?.contains(event.relatedTarget)) {
    return
  }

  dropTargetRow.value = null
}

function onRowDrop(event: DragEvent, rowIndex: number) {
  const fromIndex = draggedRow.value
  if (fromIndex === null) return

  event.preventDefault()
  event.stopPropagation()

  const ownDrag = event.dataTransfer?.getData(ROW_DRAG_TYPE) === prefix
  clearRowDrag()

  if (props.disabled || !ownDrag || fromIndex === rowIndex) return

  void mutate(
    () => matrix.moveRow(fromIndex, rowIndex),
    `Đã chuyển hàng ${matrixRowLabel(fromIndex)} đến vị trí ` +
      `${matrixRowLabel(rowIndex)} và cập nhật nhãn hàng.`,
  )
}

function onRowDragEnd() {
  const cancelled = draggedRow.value !== null
  clearRowDrag()

  if (cancelled) {
    announce('Đã kết thúc kéo hàng, vị trí không thay đổi.')
  }
}

async function onRowHandleKeyDown(event: KeyboardEvent, rowIndex: number) {
  if (
    props.disabled ||
    event.isComposing ||
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !['ArrowUp', 'ArrowDown'].includes(event.key)
  ) {
    return
  }

  const source = event.currentTarget

  if (!(source instanceof HTMLButtonElement)) return

  event.preventDefault()
  event.stopPropagation()

  const targetRow = rowIndex + (event.key === 'ArrowUp' ? -1 : 1)

  if (targetRow < 0 || targetRow >= statistics.value.rows) return
  if (protectPending()) return

  clearRowDrag()
  matrix.select(rowIndex, selection.value.column)

  if (!matrix.moveRow(rowIndex, targetRow)) {
    if (operationError.value) {
      announce(operationError.value, true)
    }

    return
  }

  clearInputs()
  announce(`Đã chuyển hàng đến vị trí ${matrixRowLabel(targetRow)}.`)

  await nextTick()

  // Giữ lựa chọn focus mới nếu người dùng đã chuyển nơi khác.
  if (props.disabled || source.ownerDocument.activeElement !== source) {
    return
  }

  const handle = table.value?.querySelector<HTMLButtonElement>(
    `button[data-row-handle="${targetRow}"]`,
  )

  handle?.focus()
}

function updateDraft(row: number, column: number, event: Event) {
  if (props.disabled) return

  const key = cellKey(row, column)
  const raw = (event.target as HTMLInputElement).value

  drafts.value[key] = raw

  if (raw.trim()) {
    // Ghi nhận loại đang dùng khi bắt đầu nhập ô này.
    draftTypes.value[key] ??= newSeatType.value ?? 'STANDARD'
  } else {
    delete draftTypes.value[key]
  }

  delete fieldErrors.value[key]
  error.value = ''
}

async function changeDraftType(event: Event) {
  if (props.disabled || selectedSeat.value) return

  const target = event.target as HTMLSelectElement
  const option = matrixSeatTypes.find((item) => item.value === target.value)

  if (!option) {
    target.value = draftTypes.value[selectedKey.value] ?? newSeatType.value ?? ''
    return
  }

  const { row, column } = selection.value
  const key = cellKey(row, column)

  // Giữ lựa chọn cho các ô nhập tiếp theo.
  newSeatType.value = option.value
  delete fieldErrors.value[key]

  if (!drafts.value[key]?.trim()) {
    delete draftTypes.value[key]

    announce(`Các ghế nhập tiếp theo sẽ dùng loại ${option.label}.`)
    return
  }

  // Ô đã có số: áp dụng ngay loại vừa chọn.
  draftTypes.value[key] = option.value

  if (commit(row, column)) {
    await focusSelected()
  }
}
function commit(row: number, column: number) {
  if (props.disabled) return false

  const key = cellKey(row, column)
  const raw = drafts.value[key]
  if (raw === undefined) return true

  const seatType = draftTypes.value[key] ?? newSeatType.value ?? 'STANDARD'
  const overlapError = raw.trim() ? pendingCoupleError(row, column, seatType) : ''

  if (overlapError) {
    showFieldError(row, column, overlapError)
    return false
  }

  const result = matrix.addSeat(row, column, raw, seatType)

  if (!result.ok) {
    showFieldError(row, column, result.message)
    return false
  }

  delete drafts.value[key]
  delete fieldErrors.value[key]

  if (result.changed) {
    delete draftTypes.value[key]

    if (seatType === 'COUPLE') {
      const coveredKey = cellKey(row, column + 1)
      delete drafts.value[coveredKey]
      delete draftTypes.value[coveredKey]
      delete fieldErrors.value[coveredKey]
    }

    const seat = document.value.rows[row]?.[column]

    announce(
      seat
        ? `Đã thêm ghế ${matrixRowLabel(row)}${seat.number}, loại ${seat.seatType}.`
        : `Đã cập nhật hàng ${matrixRowLabel(row)}.`,
    )
  }

  return true
}

async function onCellBlur(event: FocusEvent, row: number, column: number) {
  const source = event.currentTarget
  const destination = event.relatedTarget

  if (destination === null) return

  if (destination instanceof Node && draftControls.value?.contains(destination)) {
    return
  }

  // Ghi nhận trước khi commit vì ô bên phải có thể bị gộp.
  const destinationIsRightCell =
    destination instanceof HTMLInputElement &&
    table.value?.contains(destination) === true &&
    destination.dataset.cell === cellKey(row, column + 1)

  if (!commit(row, column)) return

  if (
    !destinationIsRightCell ||
    !(source instanceof HTMLInputElement) ||
    !(destination instanceof HTMLInputElement) ||
    document.value.rows[row]?.[column]?.seatType !== 'COUPLE'
  ) {
    return
  }

  await nextTick()

  if (props.disabled || destination.isConnected || !source.isConnected) {
    return
  }

  const activeElement = source.ownerDocument.activeElement

  // Không lấy lại focus nếu người dùng đã chọn điều khiển khác.
  if (activeElement !== source.ownerDocument.body && activeElement !== source) {
    return
  }

  matrix.select(row, column)
  navigationColumn.value = column
  source.focus()
}

function onCellFocus(row: number, column: number) {
  navigationColumn.value = column
  matrix.select(row, column)
}

function onEnter(event: KeyboardEvent, row: number, column: number) {
  if (event.isComposing) return

  event.preventDefault()
  commit(row, column)
}

async function onSpace(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (
    props.disabled ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  // Giữ phím không tạo liên tiếp nhiều ghế.
  if (event.repeat) return

  const row = document.value.rows[rowIndex]

  if (!row || columnIndex < 0 || columnIndex >= document.value.columns || row[columnIndex]) {
    return
  }

  matrix.select(rowIndex, columnIndex)

  // Không tạo ghế trong phần thứ hai của ghế đôi.
  if (selection.value.column !== columnIndex) return

  const key = cellKey(rowIndex, columnIndex)

  // Giữ loại đã chọn cho ô hoặc loại đang dùng liên tiếp.
  draftTypes.value[key] ??= selectedDraftType.value

  if (!drafts.value[key]?.trim()) {
    const nextNumber = row.reduce((count, seat) => count + (seat ? 1 : 0), 0) + 1

    drafts.value[key] = String(nextNumber)
  }

  if (commit(rowIndex, columnIndex)) {
    await focusSelected()
  }
}

async function onArrowKey(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (
    props.disabled ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
  ) {
    return
  }

  const source = event.currentTarget

  if (!(source instanceof HTMLInputElement)) return

  event.preventDefault()
  event.stopPropagation()

  if (!commit(rowIndex, columnIndex)) return

  const row = document.value.rows[rowIndex]

  if (!row) return

  const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'

  // Giữ cột vật lý ban đầu khi đi dọc qua ghế đôi.
  const preferredColumn = Math.min(
    Math.max(navigationColumn.value ?? columnIndex, 0),
    document.value.columns - 1,
  )

  let targetRow = rowIndex
  let targetColumn = columnIndex

  if (vertical) {
    targetRow += event.key === 'ArrowUp' ? -1 : 1

    const targetSeats = document.value.rows[targetRow]

    if (!targetSeats) return

    const target = renderedRow(targetSeats).find(
      (cell) => cell.column <= preferredColumn && preferredColumn < cell.column + cell.span,
    )

    if (!target) return

    targetColumn = target.column
  } else {
    const cells = renderedRow(row)
    const currentIndex = cells.findIndex((cell) => cell.column === columnIndex)

    if (currentIndex < 0) return

    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const target = cells[currentIndex + direction]

    if (!target) return

    targetColumn = target.column
  }

  await nextTick()

  if (source.ownerDocument.activeElement !== source) return

  const input = table.value?.querySelector<HTMLInputElement>(
    `input[data-cell="${cellKey(targetRow, targetColumn)}"]`,
  )

  if (!input) return

  matrix.select(targetRow, targetColumn)
  input.focus()

  // onCellFocus chạy khi focus đổi. Khôi phục cột mong muốn
  // sau đó để lần nhấn ↑/↓ tiếp theo không bị lệch.
  navigationColumn.value = vertical ? preferredColumn : targetColumn
}

function findTabTarget(
  rowIndex: number,
  columnIndex: number,
  direction: -1 | 1,
): { row: number; column: number } | null {
  const row = document.value.rows[rowIndex]

  if (!row) return null

  const cells = renderedRow(row)
  const currentIndex = cells.findIndex((cell) => cell.column === columnIndex)

  if (currentIndex < 0) return null

  const nextCell = cells[currentIndex + direction]

  if (nextCell) {
    return {
      row: rowIndex,
      column: nextCell.column,
    }
  }

  const adjacentRowIndex = rowIndex + direction
  const adjacentRow = document.value.rows[adjacentRowIndex]

  if (!adjacentRow) return null

  const adjacentCells = renderedRow(adjacentRow)
  const edgeCell = direction === 1 ? adjacentCells[0] : adjacentCells[adjacentCells.length - 1]

  if (!edgeCell) return null

  return {
    row: adjacentRowIndex,
    column: edgeCell.column,
  }
}

async function onTab(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (props.disabled || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  const source = event.currentTarget

  if (!(source instanceof HTMLInputElement)) return

  if (!commit(rowIndex, columnIndex)) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const direction = event.shiftKey ? -1 : 1
  const target = findTabTarget(rowIndex, columnIndex, direction)

  // Shift+Tab ở ô đầu vẫn dùng thứ tự focus của trình duyệt.
  if (!target && direction === -1) return

  event.preventDefault()
  event.stopPropagation()

  await nextTick()

  if (props.disabled || source.ownerDocument.activeElement !== source) {
    return
  }

  if (!target) {
    // Sau ô cuối: chuyển đến điều khiển khả dụng tiếp theo.
    // Đợi render xong để tránh focus vào input vừa bị gộp.
    const editor = table.value?.closest('fieldset')

    const nextControl = editor?.querySelector<HTMLElement>(
      [
        '.seat-matrix-editor__add-column:enabled',
        '.seat-matrix-editor__add-row:enabled',
        '.seat-matrix-editor__inspector select:enabled',
      ].join(', '),
    )

    nextControl?.focus()
    return
  }

  const input = table.value?.querySelector<HTMLInputElement>(
    `input[data-cell="${cellKey(target.row, target.column)}"]`,
  )

  if (!input) return

  matrix.select(target.row, target.column)
  input.focus()
}

async function onEscape(event: KeyboardEvent, row: number, column: number) {
  if (
    props.disabled ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    document.value.rows[row]?.[column]
  ) {
    return
  }

  const key = cellKey(row, column)

  // Tính cả bản nhập vừa bị xóa hết ký tự.
  const hasDraft =
    Object.prototype.hasOwnProperty.call(drafts.value, key) ||
    draftTypes.value[key] !== undefined ||
    fieldErrors.value[key] !== undefined

  if (!hasDraft) return

  event.preventDefault()
  event.stopPropagation()

  matrix.select(row, column)
  await cancelSelectedDraft()
}

async function cancelSelectedDraft() {
  if (props.disabled || selectedSeat.value) return

  const key = selectedKey.value

  delete drafts.value[key]
  delete draftTypes.value[key]
  delete fieldErrors.value[key]

  announce('Đã bỏ dữ liệu đang nhập của ô này.')
  await focusSelected()
}

async function selectCell(row: number, column: number) {
  if (props.disabled || draggedRow.value !== null) return

  matrix.select(row, column)
  navigationColumn.value = selection.value.column

  await focusSelected()
}

async function selectRow(row: number) {
  await selectCell(row, selection.value.column)
}

async function mutate(action: () => boolean, message: string) {
  if (props.disabled || protectPending()) return

  clearRowDrag()
  const changed = action()

  if (!changed) {
    if (operationError.value) announce(operationError.value, true)
    return
  }

  clearInputs()
  announce(message)
  await focusSelected()
}

function runStructureAction(action: StructureAction) {
  if (action.unavailable?.()) return
  void mutate(action.run, action.message)
}

function applyHistory(direction: 'undo' | 'redo') {
  return mutate(
    direction === 'undo' ? matrix.undo : matrix.redo,
    direction === 'undo' ? 'Đã hoàn tác thao tác ma trận.' : 'Đã làm lại thao tác ma trận.',
  )
}

function onHistoryKeyDown(event: KeyboardEvent) {
  if (
    props.disabled ||
    event.isComposing ||
    event.altKey ||
    !(event.ctrlKey || event.metaKey) ||
    !(event.target instanceof HTMLElement)
  ) {
    return
  }

  const target = event.target

  if (target.matches('textarea, select') || target.isContentEditable) {
    return
  }

  if (target instanceof HTMLInputElement && !target.readOnly) {
    const cell = target.dataset.cell
    const isMatrixInput = cell !== undefined && table.value?.contains(target) === true

    if (!isMatrixInput) return

    // Có bản nhập, kể cả vừa xóa hết ký tự:
    // giữ undo/redo văn bản của trình duyệt.
    const hasTextDraft = Object.prototype.hasOwnProperty.call(drafts.value, cell)

    if (hasTextDraft) return
  }

  const key = event.key.toLowerCase()
  let direction: 'undo' | 'redo' | null = null

  if (key === 'z') {
    direction = event.shiftKey ? 'redo' : 'undo'
  } else if (key === 'y' && !event.shiftKey) {
    direction = 'redo'
  }

  if (!direction) return

  const available = direction === 'undo' ? canUndo.value : canRedo.value

  if (!available) return

  event.preventDefault()
  event.stopPropagation()

  void applyHistory(direction)
}

function changeType(event: Event) {
  if (props.disabled) return

  const target = event.target as HTMLSelectElement

  if (protectPending()) {
    target.value = selectedSeat.value?.seatType ?? 'STANDARD'
    return
  }

  if (!matrix.changeSelectedType(target.value)) {
    target.value = selectedSeat.value?.seatType ?? 'STANDARD'

    if (operationError.value) announce(operationError.value, true)
    return
  }

  clearInputs()

  announce(
    selectedSeat.value?.seatType === 'COUPLE'
      ? `Ghế ${selectedTitle.value} đã gộp 2 ô liền nhau.`
      : `Đã đổi loại ghế ${selectedTitle.value}.`,
  )
}

function reset() {
  if (props.disabled) return

  if (
    (statistics.value.seats > 0 || hasPending.value) &&
    !window.confirm('Tạo ma trận 6 × 6 trống và bỏ các ghế cùng dữ liệu đang nhập?')
  ) {
    return
  }

  clearRowDrag()
  const changed = matrix.reset()
  clearInputs()

  announce(
    changed
      ? 'Đã tạo ma trận mới. Có thể hoàn tác để khôi phục ma trận trước đó.'
      : 'Ma trận hiện tại đã là 6 × 6 trống.',
  )
}

function prepareSave(): SeatMatrixDocument | null {
  if (props.disabled) return null

  clearRowDrag()

  const entries = pendingSeats()
  const preview = useAdminSeatMatrix(matrix.snapshot())
  const remainingErrors = { ...fieldErrors.value }

  for (const entry of entries) {
    const overlapError = entry.raw.trim()
      ? pendingCoupleError(entry.row, entry.column, entry.seatType)
      : ''

    if (overlapError) {
      showFieldError(entry.row, entry.column, overlapError)
      focusPending(entry.key, overlapError)
      return null
    }

    const result = preview.addSeat(entry.row, entry.column, entry.raw, entry.seatType)

    if (!result.ok) {
      showFieldError(entry.row, entry.column, result.message)
      focusPending(entry.key, result.message)
      return null
    }

    delete remainingErrors[entry.key]
  }

  const remainingErrorKey = Object.keys(remainingErrors)[0]

  if (remainingErrorKey) {
    focusPending(remainingErrorKey, remainingErrors[remainingErrorKey]!)
    return null
  }

  for (const entry of entries) {
    if (!commit(entry.row, entry.column)) {
      focusPending(entry.key, fieldErrors.value[entry.key] ?? 'Không thể thêm ghế.')
      return null
    }
  }

  clearInputs()
  return matrix.snapshot()
}

defineExpose({
  prepareSave,
})
</script>

<template>
  <fieldset
    class="seat-matrix-editor"
    :disabled="disabled"
    :style="{ '--matrix-column-count': document.columns }"
    @keydown="onHistoryKeyDown"
  >
    <legend class="admin-visually-hidden">Chỉnh sửa ma trận ghế</legend>

    <div class="seat-matrix-editor__toolbar">
      <button type="button" @click="reset">Tạo ma trận mới</button>

      <div class="seat-matrix-editor__history" role="group" aria-label="Lịch sử chỉnh sửa">
        <button
          type="button"
          :disabled="disabled || !canUndo"
          title="Ctrl/⌘ + Z khi không nhập văn bản"
          @click="applyHistory('undo')"
        >
          ↶ Hoàn tác
        </button>
        <button
          type="button"
          :disabled="disabled || !canRedo"
          title="Ctrl/⌘ + Shift + Z hoặc Ctrl + Y"
          @click="applyHistory('redo')"
        >
          ↷ Làm lại
        </button>
      </div>

      <span>{{ statistics.rows }} hàng × {{ statistics.columns }} cột</span>
    </div>

    <div class="seat-matrix-editor__workspace">
      <section
        class="seat-matrix-editor__panel seat-matrix-editor__main"
        :aria-labelledby="`${prefix}-title`"
      >
        <h2 :id="`${prefix}-title`" class="admin-visually-hidden">Ma trận ghế</h2>

        <p :id="`${prefix}-help`" class="admin-visually-hidden">
          Nhập số trực tiếp trong ô trống rồi chọn loại ghế để áp dụng ngay. Có thể nhấn Enter trong
          ô để xác nhận. Ghế đôi gộp hai ô liền nhau.
        </p>

        <p :id="`${prefix}-row-drag-help`" class="admin-visually-hidden">
          Kéo nhãn hàng để đổi thứ tự. Khi nhãn hàng được focus, dùng Alt và mũi tên lên hoặc xuống
          để di chuyển hàng.
        </p>

        <p :id="`${prefix}-status`" class="admin-visually-hidden" role="status" aria-live="polite">
          {{ status }}
        </p>

        <p v-if="error" class="seat-matrix-editor__error" role="alert">{{ error }}</p>

        <div
          class="seat-matrix-editor__scroll"
          role="region"
          aria-label="Ma trận ghế, có thể cuộn ngang"
          tabindex="0"
        >
          <div class="seat-matrix-editor__frame">
            <div class="seat-matrix-editor__screen">MÀN HÌNH CHIẾU</div>

            <table
              ref="table"
              :aria-describedby="`${prefix}-help ${prefix}-status`"
              @dragleave="onTableDragLeave"
            >
              <caption class="admin-visually-hidden">
                Cột đầu là nhãn hàng và điểm kéo hàng. Ghế thường chiếm một ô, ghế đôi gộp hai ô.
              </caption>

              <colgroup>
                <col class="seat-matrix-editor__axis-column" />
                <col
                  v-for="column in document.columns"
                  :key="column"
                  class="seat-matrix-editor__seat-column"
                />
              </colgroup>

              <tbody>
                <tr
                  v-for="(row, rowIndex) in document.rows"
                  :key="rowIndex"
                  :class="{
                    'is-row-dragging': draggedRow === rowIndex,
                    'is-row-drop-before':
                      draggedRow !== null && dropTargetRow === rowIndex && rowIndex < draggedRow,
                    'is-row-drop-after':
                      draggedRow !== null && dropTargetRow === rowIndex && rowIndex > draggedRow,
                  }"
                  @dragover="onRowDragOver($event, rowIndex)"
                  @drop="onRowDrop($event, rowIndex)"
                >
                  <th scope="row">
                    <button
                      class="seat-matrix-editor__row-handle"
                      type="button"
                      :data-row-handle="rowIndex"
                      :draggable="!disabled && statistics.rows > 1"
                      :aria-label="`Chọn hoặc kéo hàng ${matrixRowLabel(rowIndex)}`"
                      :aria-describedby="`${prefix}-row-drag-help`"
                      :aria-pressed="selection.row === rowIndex"
                      title="Kéo để đổi thứ tự hàng · Alt + ↑/↓ để di chuyển"
                      @click="selectRow(rowIndex)"
                      @keydown="onRowHandleKeyDown($event, rowIndex)"
                      @dragstart="onRowDragStart($event, rowIndex)"
                      @dragend="onRowDragEnd"
                    >
                      {{ matrixRowLabel(rowIndex) }}
                    </button>
                  </th>

                  <td
                    v-for="cell in renderedRow(row)"
                    :key="cell.column"
                    :colspan="cell.span"
                    :data-seat-type="cell.seat?.seatType"
                    :class="{
                      'is-selected': selection.row === rowIndex && selection.column === cell.column,
                    }"
                    @click="selectCell(rowIndex, cell.column)"
                  >
                    <input
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      :spellcheck="false"
                      :data-cell="cellKey(rowIndex, cell.column)"
                      :readonly="Boolean(cell.seat)"
                      :value="
                        drafts[cellKey(rowIndex, cell.column)] ??
                        (cell.seat ? `${matrixRowLabel(rowIndex)}${cell.seat.number}` : '')
                      "
                      :aria-invalid="fieldErrors[cellKey(rowIndex, cell.column)] ? true : undefined"
                      :aria-describedby="
                        fieldErrors[cellKey(rowIndex, cell.column)]
                          ? fieldErrorId(rowIndex, cell.column)
                          : `${prefix}-help`
                      "
                      :aria-label="
                        cell.seat
                          ? `Ghế ${matrixRowLabel(rowIndex)}${cell.seat.number}, ${
                              cell.seat.seatType
                            }, chiếm ${cell.span} ô`
                          : `Ô trống hàng ${matrixRowLabel(rowIndex)}, vị trí ${cell.column + 1}`
                      "
                      @focus="onCellFocus(rowIndex, cell.column)"
                      @input="updateDraft(rowIndex, cell.column, $event)"
                      @blur="onCellBlur($event, rowIndex, cell.column)"
                      @keydown.enter="onEnter($event, rowIndex, cell.column)"
                      @keydown.space="onSpace($event, rowIndex, cell.column)"
                      @keydown.tab="onTab($event, rowIndex, cell.column)"
                      @keydown.esc="onEscape($event, rowIndex, cell.column)"
                      @keydown="onArrowKey($event, rowIndex, cell.column)"
                    />

                    <span
                      v-if="fieldErrors[cellKey(rowIndex, cell.column)]"
                      :id="fieldErrorId(rowIndex, cell.column)"
                      class="admin-visually-hidden"
                    >
                      {{ fieldErrors[cellKey(rowIndex, cell.column)] }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <button
              class="seat-matrix-editor__add-column"
              type="button"
              :disabled="disabled || statistics.columns >= MATRIX_LIMITS.dimension"
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
              :disabled="disabled || statistics.rows >= MATRIX_LIMITS.dimension"
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
          <span> ↑ ↓ ← → di chuyển · Space điền ghế · Tab ô tiếp theo · Enter xác nhận </span>
        </footer>
      </section>

      <aside class="seat-matrix-editor__inspector" aria-label="Thuộc tính ma trận">
        <section class="seat-matrix-editor__panel">
          <h2>{{ selectedTitle }}</h2>

          <div v-if="!selectedSeat" ref="draftControls" class="seat-matrix-editor__draft-controls">
            <label :for="`${prefix}-new-type`">Loại ghế</label>
            <select
              :id="`${prefix}-new-type`"
              :value="draftTypes[selectedKey] ?? newSeatType ?? ''"
              :aria-describedby="`${prefix}-draft-help`"
              @change="changeDraftType"
            >
              <option value="" disabled>Chọn loại ghế</option>
              <option v-for="option in matrixSeatTypes" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <p :id="`${prefix}-draft-help`" class="admin-visually-hidden">
              {{
                selectedDraftType === 'COUPLE'
                  ? 'Chọn loại sau khi nhập số để áp dụng ngay. Ghế đôi cần thêm một ô trống bên phải.'
                  : 'Nhập số trong ô ma trận rồi chọn loại ghế để áp dụng ngay.'
              }}
            </p>

            <button type="button" :disabled="!selectedHasDraft" @click="cancelSelectedDraft">
              Bỏ nhập
            </button>
          </div>

          <template v-else>
            <label :for="`${prefix}-type`">Loại ghế</label>
            <select
              :id="`${prefix}-type`"
              :value="selectedSeat.seatType"
              :disabled="disabled"
              @change="changeType"
            >
              <option v-for="option in matrixSeatTypes" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <button
              type="button"
              class="is-danger"
              :disabled="disabled"
              @click="
                mutate(
                  matrix.clearSelectedSeat,
                  'Đã xóa ghế, giữ nguyên các ô trống và đánh số lại hàng.',
                )
              "
            >
              Xóa ghế
            </button>
          </template>
        </section>

        <section
          v-for="group in structureGroups"
          :key="group.title"
          class="seat-matrix-editor__panel"
        >
          <h2>{{ group.title }}</h2>

          <p v-if="group.description">{{ group.description }}</p>

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
      </aside>
    </div>
  </fieldset>
</template>

<style scoped>
.seat-matrix-editor {
  --matrix-seat-width: 40px;
  --matrix-seat-height: 30px;
  --matrix-column-gap: 40px;
  --matrix-row-gap: 40px;
  --matrix-couple-span: 2;
  --matrix-cell-width: calc(var(--matrix-seat-width) + var(--matrix-column-gap));
  --matrix-cell-height: calc(var(--matrix-seat-height) + var(--matrix-row-gap));
  --matrix-couple-width: calc(
    var(--matrix-cell-width) * var(--matrix-couple-span) - var(--matrix-column-gap)
  );
  --matrix-axis-size: 40px;
  --matrix-edge-size: 6rem;
  --matrix-main-basis: 32rem;
  --matrix-inspector-size: 20rem;
  --matrix-axis-layer: 1;
  --matrix-seat-tint: 12%;
  --matrix-screen-spacing: 0.14em;
  --matrix-row-drop-line: var(--space-1);
  --matrix-row-drag-opacity: var(--opacity-disabled);
  --matrix-table-width: calc(
    var(--matrix-axis-size) + var(--matrix-cell-width) * var(--matrix-column-count)
  );

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

.seat-matrix-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.seat-matrix-editor__history {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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
  width: var(--matrix-table-width);
  table-layout: fixed;
  border-collapse: collapse;
}

.seat-matrix-editor__axis-column {
  width: var(--matrix-axis-size);
}

.seat-matrix-editor__seat-column {
  width: var(--matrix-cell-width);
}

.seat-matrix-editor th,
.seat-matrix-editor td {
  box-sizing: border-box;
  height: var(--matrix-cell-height);
  padding: 0;
  border: var(--border-width-thin) solid var(--color-border);
  text-align: center;
  vertical-align: middle;
}

.seat-matrix-editor th {
  position: sticky;
  left: 0;
  z-index: var(--matrix-axis-layer);
  background: var(--color-surface);
}

.seat-matrix-editor tr.is-row-dragging {
  opacity: var(--matrix-row-drag-opacity);
}

.seat-matrix-editor tr.is-row-drop-before > :is(th, td) {
  box-shadow: inset 0 var(--matrix-row-drop-line) 0 var(--color-primary);
}

.seat-matrix-editor tr.is-row-drop-after > :is(th, td) {
  box-shadow: inset 0 calc(var(--matrix-row-drop-line) * -1) 0 var(--color-primary);
}

.seat-matrix-editor td {
  cursor: pointer;
}

.seat-matrix-editor table input {
  display: block;
  box-sizing: border-box;
  width: var(--matrix-seat-width);
  min-width: 0;
  height: var(--matrix-seat-height);
  min-height: 0;
  margin-inline: auto;
  padding: 0;
  border: var(--border-width-thin) dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--font-size-xs);
  text-align: center;
}

.seat-matrix-editor td[data-seat-type='COUPLE'] input {
  width: var(--matrix-couple-width);
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

.seat-matrix-editor table input[readonly] {
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
  box-sizing: border-box;
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  font: inherit;
}

.seat-matrix-editor th button {
  width: 100%;
  padding-inline: var(--space-1);
  font-size: var(--font-size-xs);
}

.seat-matrix-editor .seat-matrix-editor__row-handle[draggable='true'] {
  cursor: grab;
}

.seat-matrix-editor .seat-matrix-editor__row-handle[draggable='true']:active {
  cursor: grabbing;
}

.seat-matrix-editor select {
  width: 100%;
  min-width: 0;
}

.seat-matrix-editor__draft-controls {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
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
</style>
