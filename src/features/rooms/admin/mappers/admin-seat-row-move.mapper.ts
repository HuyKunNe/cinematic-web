import type {
  RoomLayoutContentResponse,
  RoomLayoutGeometryResponse,
} from '@/services/api/generated/inventory-service/model'
import {
  ADMIN_SEAT_LAYOUT_GEOMETRY,
  ADMIN_SEAT_MATRIX_STEP,
  getAdminSeatMatrixGeometry,
  readAdminSeatMatrix,
} from './admin-seat-layout.mapper'

export type SeatRowMovePlan = {
  anchorSeatId: string
  anchor: RoomLayoutGeometryResponse
  rowLabels: string[]
  stepX: number
  stepY: number
  seats: {
    seatId: string
    geometry: RoomLayoutGeometryResponse
  }[]
}

const MAX_COORDINATE = 999999999

function coordinate(value: number) {
  const result = Math.round(value)

  if (!Number.isFinite(value) || result < 0 || result > MAX_COORDINATE) {
    throw new Error('Tọa độ ghế không hợp lệ. Hãy tải lại nội dung.')
  }

  return result
}

function snap(value: number, origin: number, step: number) {
  const minimumCell = Math.ceil(-origin / step)
  const maximumCell = Math.floor((MAX_COORDINATE - origin) / step)

  const cell = Math.min(maximumCell, Math.max(minimumCell, Math.round((value - origin) / step)))

  return origin + cell * step
}

export function createSeatRowMovePlan(
  content: RoomLayoutContentResponse,
  anchorSeatId: string,
  selectedSeatIds: readonly string[],
): SeatRowMovePlan {
  const anchorSeat = content.seats.find((seat) => seat.seatId === anchorSeatId)

  if (!anchorSeat) {
    throw new Error('Ghế đang kéo không còn trong sơ đồ.')
  }

  const { matrix, anchor: a1 } = readAdminSeatMatrix(content)
  const originX = coordinate(a1.geometry.x)
  const originY = coordinate(a1.geometry.y)
  const selectedIds = new Set([...selectedSeatIds, anchorSeatId])
  const moveWholeMatrix = selectedIds.has(a1.seatId)

  const rowLabels = matrix.rows
    .filter((row) => moveWholeMatrix || row.entries.some((seat) => selectedIds.has(seat.seatId)))
    .map((row) => row.label)

  let positions: Map<string, RoomLayoutGeometryResponse>

  if (moveWholeMatrix) {
    positions = getAdminSeatMatrixGeometry(matrix, originX, originY)
  } else {
    positions = new Map()

    for (const row of matrix.rows) {
      if (!rowLabels.includes(row.label)) continue

      const firstEntry = row.entries[0]
      const firstSeat = content.seats.find((seat) => seat.seatId === firstEntry?.seatId)

      if (!firstSeat) {
        throw new Error('Không thể xác định ghế đầu hàng.')
      }

      const rowX = snap(firstSeat.geometry.x, originX, ADMIN_SEAT_MATRIX_STEP.x)
      const rowY = snap(
        row.label === anchorSeat.rowLabelSnapshot ? anchorSeat.geometry.y : firstSeat.geometry.y,
        originY,
        ADMIN_SEAT_MATRIX_STEP.y,
      )

      for (const seat of row.entries) {
        positions.set(seat.seatId, {
          x: coordinate(rowX + seat.column * ADMIN_SEAT_MATRIX_STEP.x),
          y: coordinate(rowY),
          width:
            seat.capacity * ADMIN_SEAT_LAYOUT_GEOMETRY.width +
            (seat.capacity - 1) * ADMIN_SEAT_LAYOUT_GEOMETRY.gapX,
          height: ADMIN_SEAT_LAYOUT_GEOMETRY.height,
          rotationDegrees: 0,
        })
      }
    }
  }

  const anchor = positions.get(anchorSeatId)

  if (!anchor) {
    throw new Error('Không thể xác định vị trí ghế đang kéo.')
  }

  return {
    anchorSeatId,
    anchor: { ...anchor },
    rowLabels,
    stepX: moveWholeMatrix ? 1 : ADMIN_SEAT_MATRIX_STEP.x,
    stepY: moveWholeMatrix ? 1 : ADMIN_SEAT_MATRIX_STEP.y,
    seats: [...positions].map(([seatId, geometry]) => ({
      seatId,
      geometry: { ...geometry },
    })),
  }
}

export function moveSeatRows(
  plan: SeatRowMovePlan,
  target: RoomLayoutGeometryResponse,
): Map<string, RoomLayoutGeometryResponse> {
  const xs = plan.seats.map((seat) => seat.geometry.x)
  const ys = plan.seats.map((seat) => seat.geometry.y)

  function delta(requested: number, minimum: number, maximum: number, step: number) {
    return Math.min(
      Math.floor(maximum / step) * step,
      Math.max(Math.ceil(minimum / step) * step, Math.round(requested / step) * step),
    )
  }

  const dx = delta(
    target.x - plan.anchor.x,
    -Math.min(...xs),
    MAX_COORDINATE - Math.max(...xs),
    plan.stepX,
  )

  const dy = delta(
    target.y - plan.anchor.y,
    -Math.min(...ys),
    MAX_COORDINATE - Math.max(...ys),
    plan.stepY,
  )

  return new Map(
    plan.seats.map((seat) => [
      seat.seatId,
      {
        ...seat.geometry,
        x: seat.geometry.x + dx,
        y: seat.geometry.y + dy,
      },
    ]),
  )
}
