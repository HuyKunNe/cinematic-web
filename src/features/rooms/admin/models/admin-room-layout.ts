import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutElementInput,
  RoomLayoutElementPositionResponse,
  RoomLayoutGeometryInput,
  RoomLayoutResponse,
  RoomLayoutSeatPositionResponse,
  SeatResponse,
} from '@/services/api/generated/inventory-service/model'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'

// key chỉ là identity của đối tượng trong editor, không gửi lên BE.
export type LayoutSeat = Omit<RoomLayoutSeatPositionResponse, 'id'> & { key: string }
export type LayoutElement = Omit<RoomLayoutElementPositionResponse, 'id'> & { key: string }
export type LayoutItem = LayoutSeat | LayoutElement
export type LayoutState = { seats: LayoutSeat[]; elements: LayoutElement[] }
export type GeometryKey = keyof RoomLayoutGeometryInput

export type PhysicalSeat = SeatResponse &
  Required<Pick<SeatResponse, 'id' | 'roomId' | 'seatNumber' | 'rowLabel' | 'seatType'>>

export const ROOM_LAYOUT_GRID_STEP = 50

export const geometryFields = [
  { key: 'x', label: 'Vị trí X' },
  { key: 'y', label: 'Vị trí Y' },
  { key: 'width', label: 'Chiều rộng' },
  { key: 'height', label: 'Chiều cao' },
  { key: 'rotationDegrees', label: 'Góc xoay (độ)' },
] as const satisfies readonly { key: GeometryKey; label: string }[]

export const elementLabels: Record<RoomLayoutElementInput['kind'], string> = {
  SCREEN: 'Màn hình',
  AISLE: 'Lối đi',
  EXIT: 'Lối ra',
}

export function seatTypeLabel(type: string) {
  return (
    {
      STANDARD: 'Thường',
      VIP: 'VIP',
      COUPLE: 'Đôi',
      ACCESSIBLE: 'Hỗ trợ tiếp cận',
    }[type] ?? type
  )
}

export function isLayoutSeat(item: LayoutItem): item is LayoutSeat {
  return 'seatId' in item
}

export function itemLabel(item: LayoutItem) {
  return isLayoutSeat(item)
    ? `Ghế ${item.seatNumberSnapshot}`
    : item.label?.trim() || elementLabels[item.kind]
}

export function isPhysicalSeat(seat: SeatResponse, roomId: string): seat is PhysicalSeat {
  return Boolean(
    seat.id &&
    seat.roomId === roomId &&
    seat.seatNumber?.trim() &&
    seat.rowLabel?.trim() &&
    seat.seatType,
  )
}

export function cloneLayoutState(state: LayoutState): LayoutState {
  return {
    seats: state.seats.map((seat) => ({ ...seat, geometry: { ...seat.geometry } })),
    elements: state.elements.map((element) => ({
      ...element,
      geometry: { ...element.geometry },
    })),
  }
}

export function fromLayoutContent(content: RoomLayoutContentResponse): LayoutState {
  return {
    seats: content.seats.map((seat) => ({
      key: `seat:${seat.seatId}`,
      seatId: seat.seatId,
      seatNumberSnapshot: seat.seatNumberSnapshot,
      rowLabelSnapshot: seat.rowLabelSnapshot,
      seatTypeSnapshot: seat.seatTypeSnapshot,
      geometry: { ...seat.geometry },
    })),
    elements: content.elements.map((element) => ({
      key: `element:${element.id}`,
      kind: element.kind,
      label: element.label ?? '',
      geometry: { ...element.geometry },
    })),
  }
}

export function toLayoutRequest(
  state: LayoutState,
  expectedVersion: number,
): ReplaceRoomLayoutContentRequest {
  return {
    expectedVersion,
    seats: state.seats.map((seat) => ({
      seatId: seat.seatId,
      geometry: { ...seat.geometry },
    })),
    elements: state.elements.map((element) => ({
      kind: element.kind,
      ...(element.label?.trim() ? { label: element.label.trim() } : {}),
      geometry: { ...element.geometry },
    })),
  }
}

export function layoutSignature(state: LayoutState) {
  const request = toLayoutRequest(state, 0)
  return JSON.stringify({ seats: request.seats, elements: request.elements })
}

export function readLayoutNumber(
  input: string | number,
  label: string,
  positive = false,
  rotation = false,
) {
  const text = typeof input === 'number' ? String(input) : input.trim()
  const value = Number(text)
  const limit = rotation ? 999_999.999 : 999_999_999.999

  if (
    !text ||
    !/^-?\d+(?:\.\d{1,3})?$/.test(text) ||
    !Number.isFinite(value) ||
    Math.abs(value) > limit ||
    (!rotation && (positive ? value <= 0 : value < 0))
  ) {
    throw new Error(
      `${label}: nhập số ${rotation ? 'hợp lệ' : positive ? 'lớn hơn 0' : 'không âm'}, tối đa 3 chữ số thập phân.`,
    )
  }

  return value
}

export function readGeometry(
  values: Record<GeometryKey, string | number>,
): RoomLayoutGeometryInput {
  return {
    x: readLayoutNumber(values.x, 'Vị trí X'),
    y: readLayoutNumber(values.y, 'Vị trí Y'),
    width: readLayoutNumber(values.width, 'Chiều rộng', true),
    height: readLayoutNumber(values.height, 'Chiều cao', true),
    rotationDegrees: readLayoutNumber(values.rotationDegrees, 'Góc xoay', false, true),
  }
}

export function validateLayoutState(state: LayoutState) {
  for (const item of [...state.seats, ...state.elements]) {
    readGeometry({
      x: String(item.geometry.x),
      y: String(item.geometry.y),
      width: String(item.geometry.width),
      height: String(item.geometry.height),
      rotationDegrees: String(item.geometry.rotationDegrees),
    })

    if (!isLayoutSeat(item) && (item.label?.trim().length ?? 0) > 150) {
      throw new Error('Nhãn đối tượng tối đa 150 ký tự.')
    }
  }
}

const round = (value: number) => Number(value.toFixed(3))

export function placeSeat(seat: PhysicalSeat, geometry: RoomLayoutGeometryInput): LayoutSeat {
  return {
    key: `seat:${seat.id}`,
    seatId: seat.id,
    seatNumberSnapshot: seat.seatNumber,
    rowLabelSnapshot: seat.rowLabel,
    seatTypeSnapshot: seat.seatType,
    geometry,
  }
}

export function initialSeatGeometry(layout: RoomLayoutResponse): RoomLayoutGeometryInput {
  const size = Math.max(0.001, round(Math.min(layout.canvasWidth, layout.canvasHeight) / 12))

  return { x: 0, y: 0, width: size, height: size, rotationDegrees: 0 }
}

export function makeLayoutElement(
  layout: RoomLayoutResponse,
  kind: RoomLayoutElementInput['kind'],
): LayoutElement {
  const screen = kind === 'SCREEN'

  return {
    key: `element:${crypto.randomUUID()}`,
    kind,
    label: elementLabels[kind],
    geometry: {
      x: screen ? round(layout.canvasWidth * 0.1) : 0,
      y: screen ? round(layout.canvasHeight * 0.05) : 0,
      width: Math.max(0.001, round(layout.canvasWidth * (screen ? 0.8 : 0.08))),
      height: Math.max(0.001, round(layout.canvasHeight * (screen ? 0.08 : 0.2))),
      rotationDegrees: 0,
    },
  }
}

// Gợi ý geometry từ ghế hoạt động thật. Không tạo thêm ghế vật lý.
export function arrangeActiveSeats(layout: RoomLayoutResponse, seats: PhysicalSeat[]): LayoutState {
  const active = seats.filter((seat) => seat.active === true)
  if (!active.length) throw new Error('Phòng chưa có ghế hoạt động để xếp.')

  const collator = new Intl.Collator('vi', { numeric: true })
  const rows = new Map<string, PhysicalSeat[]>()

  for (const seat of active) {
    const row = rows.get(seat.rowLabel) ?? []
    row.push(seat)
    rows.set(seat.rowLabel, row)
  }

  const groups = [...rows.entries()].sort(([a], [b]) => collator.compare(a, b))
  const columns = Math.max(...groups.map(([, row]) => row.length))
  const cellWidth = (layout.canvasWidth * 0.84) / columns
  const cellHeight = (layout.canvasHeight * 0.65) / groups.length
  const size = round(Math.min(cellWidth, cellHeight) * 0.7)

  if (size < 0.001) throw new Error('Khung sơ đồ quá nhỏ để xếp các ghế hiện có.')

  return {
    seats: groups.flatMap(([, row], rowIndex) =>
      row
        .sort((a, b) => collator.compare(a.seatNumber, b.seatNumber))
        .map((seat, columnIndex) =>
          placeSeat(seat, {
            x: round(layout.canvasWidth * 0.08 + columnIndex * cellWidth + (cellWidth - size) / 2),
            y: round(layout.canvasHeight * 0.25 + rowIndex * cellHeight + (cellHeight - size) / 2),
            width: size,
            height: size,
            rotationDegrees: 0,
          }),
        ),
    ),
    elements: [makeLayoutElement(layout, 'SCREEN')],
  }
}

export function alignSeatRows(
  layout: RoomLayoutResponse,
  state: LayoutState,
  anchorKey: string,
  horizontalGap: number,
  verticalGap: number,
): LayoutState {
  const anchor = state.seats.find((seat) => seat.key === anchorKey)
  if (!anchor) throw new Error('Chọn ghế đầu tiên làm mốc.')

  if (state.seats.some((seat) => seat.geometry.rotationDegrees !== 0)) {
    throw new Error('Căn hàng hiện chỉ hỗ trợ các ghế có góc xoay bằng 0.')
  }

  function seatIndex(seat: LayoutSeat) {
    const row = seat.rowLabelSnapshot
    const number = seat.seatNumberSnapshot

    if (!number.startsWith(row)) {
      throw new Error(`Ghế ${number} không có tên theo dạng ${row}1, ${row}2…`)
    }

    const suffix = number.slice(row.length)
    const index = Number(suffix)

    if (!/^\d+$/.test(suffix) || !Number.isInteger(index) || index < 1 || index > 999) {
      throw new Error(`Không xác định được số thứ tự của ghế ${number}.`)
    }

    return index
  }

  const collator = new Intl.Collator('vi', { numeric: true })
  const rows = [...new Set(state.seats.map((seat) => seat.rowLabelSnapshot))].sort(collator.compare)

  const indices = new Map<string, number>()
  const occupied = new Set<string>()

  for (const seat of state.seats) {
    const index = seatIndex(seat)
    const position = JSON.stringify([seat.rowLabelSnapshot, index])

    if (occupied.has(position)) {
      throw new Error(`Hàng ${seat.rowLabelSnapshot} có số thứ tự ghế bị trùng.`)
    }

    occupied.add(position)
    indices.set(seat.key, index)
  }

  const firstIndex = Math.min(...indices.values())

  if (anchor.rowLabelSnapshot !== rows[0] || indices.get(anchor.key) !== firstIndex) {
    throw new Error('Chọn ghế có số thứ tự nhỏ nhất của hàng đầu tiên làm mốc, ví dụ A1.')
  }

  // Lấy kích thước ghế mốc cho toàn bộ ghế trên sơ đồ.
  const { width, height } = anchor.geometry
  const columnStep = Math.max(...state.seats.map((seat) => seat.geometry.width)) + horizontalGap
  const rowStep = Math.max(...state.seats.map((seat) => seat.geometry.height)) + verticalGap

  const next = cloneLayoutState(state)

  for (const seat of next.seats) {
    const rowIndex = rows.indexOf(seat.rowLabelSnapshot)
    const columnIndex = indices.get(seat.key)! - firstIndex

    seat.geometry.x = round(anchor.geometry.x + columnIndex * columnStep)
    seat.geometry.y = round(anchor.geometry.y + rowIndex * rowStep)

    if (
      seat.geometry.x + seat.geometry.width > layout.canvasWidth ||
      seat.geometry.y + seat.geometry.height > layout.canvasHeight
    ) {
      throw new Error('Các hàng vượt khung sơ đồ. Giảm khoảng cách hoặc đổi vị trí ghế mốc.')
    }
  }

  validateLayoutState(next)
  return next
}

export function layoutErrorMessage(error: unknown): string {
  if (isAdminRoomApiError(error)) {
    const messages: Record<string, string> = {
      INVENTORY_ROOM_LAYOUT_NOT_FOUND: 'Sơ đồ không còn tồn tại.',
      INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT:
        'Sơ đồ đã được cập nhật ở nơi khác. Tải lại trước khi lưu.',
      INVENTORY_ROOM_LAYOUT_NOT_DRAFT: 'Sơ đồ đã được xuất bản. Tải lại để xem trạng thái mới.',
      INVENTORY_ROOM_LAYOUT_INCOMPLETE: 'Cần ít nhất một ghế và một màn hình để xuất bản.',
      INVENTORY_ROOM_LAYOUT_OUTSIDE_CANVAS:
        'Có đối tượng nằm ngoài khung sơ đồ, kể cả sau khi xoay.',
      INVENTORY_ROOM_LAYOUT_GEOMETRY_OVERLAP:
        'Có ghế chồng lên ghế khác hoặc màn hình, lối đi, lối ra.',
      INVENTORY_ROOM_LAYOUT_DUPLICATE_SEAT: 'Một ghế chỉ được xuất hiện một lần.',
      INVENTORY_ROOM_LAYOUT_SEAT_ROOM_MISMATCH: 'Ghế không thuộc phòng đang chỉnh.',
    }

    const translatedMessage = error.code ? messages[error.code] : undefined

    if (typeof translatedMessage === 'string') {
      return translatedMessage
    }
  }

  return adminRoomErrorMessage(error, 'Không thể cập nhật sơ đồ phòng.')
}
