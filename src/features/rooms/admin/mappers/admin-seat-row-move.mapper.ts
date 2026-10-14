import type {
  RoomLayoutContentResponse,
  RoomLayoutGeometryResponse,
} from '@/services/api/generated/inventory-service/model'

export type SeatRowMovePlan = {
  anchorSeatId: string
  anchor: RoomLayoutGeometryResponse
  rowLabels: string[]
  seats: {
    seatId: string
    geometry: RoomLayoutGeometryResponse
  }[]
}

const MAX_COORDINATE = 999999999

function coordinate(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_COORDINATE) {
    throw new Error('Tọa độ ghế không hợp lệ. Hãy tải lại nội dung.')
  }

  return Math.round(value)
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

  const selectedIds = new Set([...selectedSeatIds, anchorSeatId])
  const rowLabels = [
    ...new Set(
      content.seats
        .filter((seat) => selectedIds.has(seat.seatId))
        .map((seat) => seat.rowLabelSnapshot),
    ),
  ]

  const anchor = {
    ...anchorSeat.geometry,
    x: coordinate(anchorSeat.geometry.x),
    y: coordinate(anchorSeat.geometry.y),
  }

  const seats: SeatRowMovePlan['seats'] = []

  for (const rowLabel of rowLabels) {
    const rowSeats = content.seats
      .filter((seat) => seat.rowLabelSnapshot === rowLabel)
      .sort(
        (left, right) =>
          left.geometry.x - right.geometry.x || left.seatId.localeCompare(right.seatId),
      )

    const firstSeat = rowSeats[0]
    if (!firstSeat) continue

    // Hàng chứa ghế đang kéo căn theo Y của ghế đó.
    // Các hàng còn lại giữ Y của ghế ngoài cùng bên trái.
    const rowY =
      rowLabel === anchorSeat.rowLabelSnapshot ? anchor.y : coordinate(firstSeat.geometry.y)

    for (const seat of rowSeats) {
      seats.push({
        seatId: seat.seatId,
        geometry: {
          ...seat.geometry,
          x: coordinate(seat.geometry.x),
          y: rowY,
        },
      })
    }
  }

  return {
    anchorSeatId,
    anchor,
    rowLabels,
    seats,
  }
}

export function moveSeatRows(
  plan: SeatRowMovePlan,
  target: RoomLayoutGeometryResponse,
): Map<string, RoomLayoutGeometryResponse> {
  const xs = plan.seats.map((seat) => seat.geometry.x)
  const ys = plan.seats.map((seat) => seat.geometry.y)

  // Chặn bằng một độ lệch chung, tránh ép từng ghế làm méo hàng.
  const dx = Math.min(
    MAX_COORDINATE - Math.max(...xs),
    Math.max(-Math.min(...xs), Math.round(target.x - plan.anchor.x)),
  )

  const dy = Math.min(
    MAX_COORDINATE - Math.max(...ys),
    Math.max(-Math.min(...ys), Math.round(target.y - plan.anchor.y)),
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
