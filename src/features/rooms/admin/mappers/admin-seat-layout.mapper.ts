import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutGeometryResponse,
  RoomLayoutResponse,
  SeatResponse,
} from '@/services/api/generated/inventory-service/model'
import { mapAdminSeatCatalog } from './admin-seat-catalog.mapper'

export const ADMIN_SEAT_LAYOUT_GEOMETRY = {
  width: 40,
  height: 30,
  gapX: 40,
  gapY: 40,
} as const

export const ADMIN_SEAT_MATRIX_STEP = {
  x: ADMIN_SEAT_LAYOUT_GEOMETRY.width + ADMIN_SEAT_LAYOUT_GEOMETRY.gapX,
  y: ADMIN_SEAT_LAYOUT_GEOMETRY.height + ADMIN_SEAT_LAYOUT_GEOMETRY.gapY,
} as const

export type SeatMatrixItem = {
  seatId: string
  seatNumber: string
  rowLabel: string
  type: string
}

export type SeatMatrixEntry = SeatMatrixItem & {
  column: number
  capacity: 1 | 2
}

export type AdminSeatMatrix = {
  rows: {
    label: string
    entries: SeatMatrixEntry[]
    capacity: number
  }[]
  columnCount: number
  seatCount: number
}

const collator = new Intl.Collator('vi', { numeric: true })
const MAX_COORDINATE = 999999999

function coordinate(value: number) {
  const rounded = Math.round(value)

  if (!Number.isFinite(value) || rounded < 0 || rounded > MAX_COORDINATE) {
    throw new Error('Tọa độ ma trận phải nằm trong khoảng 0–999999999.')
  }

  return rounded
}

export function buildAdminSeatMatrix(input: readonly SeatMatrixItem[]): AdminSeatMatrix {
  const sorted = [...input].sort(
    (left, right) =>
      collator.compare(left.rowLabel, right.rowLabel) ||
      collator.compare(left.seatNumber, right.seatNumber) ||
      left.seatId.localeCompare(right.seatId),
  )

  const grouped = new Map<string, SeatMatrixItem[]>()

  for (const seat of sorted) {
    const row = grouped.get(seat.rowLabel) ?? []
    row.push(seat)
    grouped.set(seat.rowLabel, row)
  }

  const rows = [...grouped].map(([label, items]) => {
    let column = 0

    const entries: SeatMatrixEntry[] = items.map((seat) => {
      const capacity: 1 | 2 = seat.type === 'COUPLE' ? 2 : 1
      const entry = { ...seat, column, capacity }

      column += capacity
      return entry
    })

    return { label, entries, capacity: column }
  })

  return {
    rows,
    columnCount: Math.max(0, ...rows.map((row) => row.capacity)),
    seatCount: sorted.length,
  }
}

export function getAdminSeatMatrixGeometry(
  matrix: AdminSeatMatrix,
  originX: number,
  originY: number,
): Map<string, RoomLayoutGeometryResponse> {
  const x = coordinate(originX)
  const y = coordinate(originY)
  const { width, height, gapX } = ADMIN_SEAT_LAYOUT_GEOMETRY

  const result = new Map<string, RoomLayoutGeometryResponse>()

  matrix.rows.forEach((row, rowIndex) => {
    for (const seat of row.entries) {
      result.set(seat.seatId, {
        x: coordinate(x + seat.column * ADMIN_SEAT_MATRIX_STEP.x),
        y: coordinate(y + rowIndex * ADMIN_SEAT_MATRIX_STEP.y),
        width: seat.capacity * width + (seat.capacity - 1) * gapX,
        height,
        rotationDegrees: 0,
      })
    }
  })

  return result
}

export function readAdminSeatMatrix(content: RoomLayoutContentResponse) {
  const matrix = buildAdminSeatMatrix(
    content.seats.map((seat) => ({
      seatId: seat.seatId,
      seatNumber: seat.seatNumberSnapshot,
      rowLabel: seat.rowLabelSnapshot,
      type: seat.seatTypeSnapshot,
    })),
  )

  const anchor = content.seats.find(
    (seat) =>
      seat.rowLabelSnapshot.trim().toUpperCase() === 'A' &&
      seat.seatNumberSnapshot.trim().toUpperCase() === 'A1',
  )

  if (!anchor) {
    throw new Error('Sơ đồ cần ghế A1 để xác định gốc ma trận.')
  }

  if (matrix.rows[0]?.entries[0]?.seatId !== anchor.seatId) {
    throw new Error('A1 phải là ghế đầu tiên của hàng đầu tiên trong ma trận.')
  }

  return { matrix, anchor }
}

export function buildAdminSeatMatrixRequest(
  content: RoomLayoutContentResponse,
  baseline: ReplaceRoomLayoutContentRequest,
): ReplaceRoomLayoutContentRequest {
  if (content.layout.status !== 'DRAFT' || baseline.expectedVersion !== content.layout.version) {
    throw new Error('Chỉ căn ma trận cho bản nháp hiện tại.')
  }

  const { matrix, anchor } = readAdminSeatMatrix(content)
  const positions = getAdminSeatMatrixGeometry(matrix, anchor.geometry.x, anchor.geometry.y)

  return {
    expectedVersion: baseline.expectedVersion,
    seats: baseline.seats.map((seat) => {
      const geometry = positions.get(seat.seatId)

      if (!geometry) {
        throw new Error('Không thể xác định ô ma trận của ghế.')
      }

      return { seatId: seat.seatId, geometry }
    }),
    elements: baseline.elements.map((element) => ({
      ...element,
      geometry: { ...element.geometry },
    })),
  }
}

export function buildAdminSeatLayoutRequest(
  layout: RoomLayoutResponse,
  baseline: ReplaceRoomLayoutContentRequest,
  catalog: readonly SeatResponse[],
  originX: number,
  originY: number,
): ReplaceRoomLayoutContentRequest {
  if (
    layout.status !== 'DRAFT' ||
    baseline.seats.length !== 0 ||
    baseline.expectedVersion !== layout.version
  ) {
    throw new Error('Chỉ khởi tạo ghế cho bản nháp chưa có geometry ghế.')
  }

  if (
    !Number.isSafeInteger(originX) ||
    !Number.isSafeInteger(originY) ||
    originX < 0 ||
    originY < 0
  ) {
    throw new Error('X/Y bắt đầu phải là số nguyên không âm.')
  }

  const catalogMatrix = mapAdminSeatCatalog(catalog, layout.roomId)

  const matrix = buildAdminSeatMatrix(
    catalogMatrix.seats.map((seat) => ({
      seatId: seat.id,
      seatNumber: seat.seatNumber,
      rowLabel: seat.rowLabel,
      type: seat.seatType!,
    })),
  )

  if (!matrix.seatCount) {
    throw new Error('Phòng chưa có ghế catalog. Hãy tạo ghế trong trang Ghế của phòng.')
  }

  const firstSeat = matrix.rows[0]?.entries[0]

  if (
    firstSeat?.rowLabel.trim().toUpperCase() !== 'A' ||
    firstSeat.seatNumber.trim().toUpperCase() !== 'A1'
  ) {
    throw new Error('Cần A1 là ghế đầu tiên để tạo ma trận theo mốc A1.')
  }

  const requiredWidth =
    originX + matrix.columnCount * ADMIN_SEAT_MATRIX_STEP.x - ADMIN_SEAT_LAYOUT_GEOMETRY.gapX

  const requiredHeight =
    originY + matrix.rows.length * ADMIN_SEAT_MATRIX_STEP.y - ADMIN_SEAT_LAYOUT_GEOMETRY.gapY

  if (requiredWidth > layout.canvasWidth || requiredHeight > layout.canvasHeight) {
    throw new Error(
      `Vùng ghế cần canvas ít nhất ${requiredWidth} × ${requiredHeight}. ` +
        'Giảm X/Y bắt đầu hoặc tạo bản nháp có canvas lớn hơn.',
    )
  }

  const positions = getAdminSeatMatrixGeometry(matrix, originX, originY)

  return {
    expectedVersion: baseline.expectedVersion,
    seats: [...positions].map(([seatId, geometry]) => ({ seatId, geometry })),
    elements: baseline.elements.map((element) => ({
      ...element,
      geometry: { ...element.geometry },
    })),
  }
}
