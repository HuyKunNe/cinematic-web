import type {
  ReplaceRoomLayoutContentRequest,
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

  const matrix = mapAdminSeatCatalog(catalog, layout.roomId)
  if (!matrix.seats.length) {
    throw new Error('Phòng chưa có ghế catalog. Hãy tạo ghế trong trang Ghế của phòng.')
  }

  const { width, height, gapX, gapY } = ADMIN_SEAT_LAYOUT_GEOMETRY
  const requiredWidth = originX + (matrix.columnCount - 1) * (width + gapX) + width
  const requiredHeight = originY + (matrix.rows.length - 1) * (height + gapY) + height

  if (requiredWidth > layout.canvasWidth || requiredHeight > layout.canvasHeight) {
    throw new Error(
      `Vùng ghế cần canvas ít nhất ${requiredWidth} × ${requiredHeight}. ` +
        'Giảm X/Y bắt đầu hoặc tạo bản nháp có canvas lớn hơn.',
    )
  }

  const seats: ReplaceRoomLayoutContentRequest['seats'] = []

  matrix.rows.forEach((row, rowIndex) => {
    row.cells.forEach((seat, columnIndex) => {
      if (!seat) return

      seats.push({
        seatId: seat.id,
        geometry: {
          x: originX + columnIndex * (width + gapX),
          y: originY + rowIndex * (height + gapY),
          width,
          height,
          rotationDegrees: 0,
        },
      })
    })
  })

  return {
    expectedVersion: baseline.expectedVersion,
    seats,
    elements: baseline.elements.map((element) => ({
      ...element,
      geometry: { ...element.geometry },
    })),
  }
}
