import type {
  RoomLayoutContentResponse,
  RoomLayoutGeometryResponse,
} from '@/services/api/generated/inventory-service/model'
import { ADMIN_SEAT_MATRIX_STEP, readAdminSeatMatrix } from './admin-seat-layout.mapper'

type Geometry = RoomLayoutGeometryResponse
type SeatPosition = RoomLayoutContentResponse['seats'][number]

export type SeatRowMovePlan = {
  anchorSeatId: string
  anchor: Geometry
  rowLabels: string[]
  movingIds: string[]
  movingRows: string[]
  content: RoomLayoutContentResponse
  origin: { x: number; y: number }
}

const collator = new Intl.Collator('vi', { numeric: true })
const EPSILON = 0.000001

function capacity(seat: SeatPosition) {
  return seat.seatTypeSnapshot === 'COUPLE' ? 2 : 1
}

function originOf(content: RoomLayoutContentResponse) {
  const { anchor } = readAdminSeatMatrix(content)

  return {
    x: Math.round(anchor.geometry.x),
    y: Math.round(anchor.geometry.y),
  }
}

function snap(value: number, origin: number, step: number) {
  return origin + Math.round((value - origin) / step) * step
}

function seatCell(seat: SeatPosition, geometry: Geometry): Geometry {
  return {
    ...geometry,
    width: capacity(seat) * ADMIN_SEAT_MATRIX_STEP.x,
    height: ADMIN_SEAT_MATRIX_STEP.y,
  }
}

function corners(geometry: Geometry) {
  const cx = geometry.x + geometry.width / 2
  const cy = geometry.y + geometry.height / 2
  const angle = (geometry.rotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return [
    [-geometry.width / 2, -geometry.height / 2],
    [geometry.width / 2, -geometry.height / 2],
    [geometry.width / 2, geometry.height / 2],
    [-geometry.width / 2, geometry.height / 2],
  ].map(([x, y]) => ({
    x: cx + x! * cos - y! * sin,
    y: cy + x! * sin + y! * cos,
  }))
}

function overlaps(left: Geometry, right: Geometry) {
  const a = corners(left)
  const b = corners(right)

  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index++) {
      const start = polygon[index]!
      const end = polygon[(index + 1) % polygon.length]!
      const nx = -(end.y - start.y)
      const ny = end.x - start.x
      const length = Math.hypot(nx, ny)

      if (!length) continue

      const project = (point: { x: number; y: number }) => (point.x * nx + point.y * ny) / length

      const pa = a.map(project)
      const pb = b.map(project)

      if (
        Math.max(...pa) <= Math.min(...pb) + EPSILON ||
        Math.max(...pb) <= Math.min(...pa) + EPSILON
      ) {
        return false
      }
    }
  }

  return true
}

function assertInside(content: RoomLayoutContentResponse, geometry: Geometry) {
  if (
    !Object.values(geometry).every(Number.isFinite) ||
    geometry.width <= 0 ||
    geometry.height <= 0 ||
    !Number.isInteger(geometry.x) ||
    !Number.isInteger(geometry.y) ||
    geometry.x > 999999999 ||
    geometry.y > 999999999
  ) {
    throw new Error('Geometry sau khi dịch không hợp lệ.')
  }

  if (
    corners(geometry).some(
      (point) =>
        point.x < -EPSILON ||
        point.y < -EPSILON ||
        point.x > content.layout.canvasWidth + EPSILON ||
        point.y > content.layout.canvasHeight + EPSILON,
    )
  ) {
    throw new Error('Canvas không còn đủ chỗ cho nhóm đối tượng sau khi dịch.')
  }
}

function assertOnGrid(geometry: Geometry, origin: { x: number; y: number }) {
  if (
    Math.abs(snap(geometry.x, origin.x, ADMIN_SEAT_MATRIX_STEP.x) - geometry.x) > EPSILON ||
    Math.abs(snap(geometry.y, origin.y, ADMIN_SEAT_MATRIX_STEP.y) - geometry.y) > EPSILON ||
    geometry.rotationDegrees !== 0
  ) {
    throw new Error('Ghế cần nằm thẳng và bám grid trước khi dịch.')
  }
}

function validateSeats(
  content: RoomLayoutContentResponse,
  result: Map<string, Geometry>,
  changedIds: Set<string>,
  origin: { x: number; y: number },
) {
  for (const seat of content.seats) {
    const geometry = result.get(seat.seatId)!

    if (changedIds.has(seat.seatId)) {
      assertInside(content, geometry)
      assertOnGrid(geometry, origin)
    }
  }

  for (let index = 0; index < content.seats.length; index++) {
    const seat = content.seats[index]!
    const geometry = result.get(seat.seatId)!

    for (const other of content.seats.slice(index + 1)) {
      if (!changedIds.has(seat.seatId) && !changedIds.has(other.seatId)) {
        continue
      }

      if (overlaps(seatCell(seat, geometry), seatCell(other, result.get(other.seatId)!))) {
        throw new Error('Các ghế còn chồng ô sau khi dịch. Hãy chọn một vị trí khác.')
      }
    }

    if (!changedIds.has(seat.seatId)) continue

    for (const element of content.elements) {
      if (overlaps(geometry, element.geometry)) {
        throw new Error('Nhóm ghế sau khi dịch đè lên lối đi hoặc phần tử không gian.')
      }
    }
  }
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

  const grouped = new Map<string, SeatPosition[]>()

  for (const seat of content.seats) {
    const row = grouped.get(seat.rowLabelSnapshot) ?? []
    row.push(seat)
    grouped.set(seat.rowLabelSnapshot, row)
  }

  const selected = new Set([...selectedSeatIds, anchorSeatId])
  const movingRows: string[] = []

  for (const [label, seats] of grouped) {
    const first = [...seats].sort(
      (left, right) =>
        collator.compare(left.seatNumberSnapshot, right.seatNumberSnapshot) ||
        left.seatId.localeCompare(right.seatId),
    )[0]!

    if (selected.has(first.seatId)) {
      movingRows.push(label)

      for (const seat of seats) selected.add(seat.seatId)
    }
  }

  return {
    anchorSeatId,
    anchor: { ...anchorSeat.geometry },
    movingIds: [...selected],
    movingRows,
    rowLabels: [
      ...new Set(
        content.seats
          .filter((seat) => selected.has(seat.seatId))
          .map((seat) => seat.rowLabelSnapshot),
      ),
    ],
    origin: originOf(content),
    content: {
      layout: { ...content.layout },
      seats: content.seats.map((seat) => ({
        ...seat,
        geometry: { ...seat.geometry },
      })),
      elements: content.elements.map((element) => ({
        ...element,
        geometry: { ...element.geometry },
      })),
    },
  }
}

export function moveSeatRows(plan: SeatRowMovePlan, target: Geometry): Map<string, Geometry> {
  const { content, origin } = plan
  const moving = new Set(plan.movingIds)

  const targetX = snap(target.x, origin.x, ADMIN_SEAT_MATRIX_STEP.x)
  const targetY = snap(target.y, origin.y, ADMIN_SEAT_MATRIX_STEP.y)
  const dx = targetX - plan.anchor.x
  const dy = targetY - plan.anchor.y

  if (dx === 0 && dy === 0) return new Map()

  const result = new Map(content.seats.map((seat) => [seat.seatId, { ...seat.geometry }]))

  for (const seat of content.seats) {
    if (!moving.has(seat.seatId)) continue

    result.set(seat.seatId, {
      ...seat.geometry,
      x: Math.round(seat.geometry.x + dx),
      y: Math.round(seat.geometry.y + dy),
    })
  }

  const rows = new Map<string, SeatPosition[]>()

  for (const seat of content.seats) {
    const row = rows.get(seat.rowLabelSnapshot) ?? []
    row.push(seat)
    rows.set(seat.rowLabelSnapshot, row)
  }

  const heads = new Map(
    [...rows].map(([label, seats]) => [
      label,
      [...seats].sort(
        (left, right) =>
          collator.compare(left.seatNumberSnapshot, right.seatNumberSnapshot) ||
          left.seatId.localeCompare(right.seatId),
      )[0]!,
    ]),
  )

  // Chèn hàng: xử lý theo vị trí đích từ trên xuống.
  const movingRows = [...plan.movingRows].sort(
    (left, right) =>
      result.get(heads.get(left)!.seatId)!.y - result.get(heads.get(right)!.seatId)!.y,
  )

  for (const label of movingRows) {
    const targetRowY = result.get(heads.get(label)!.seatId)!.y

    const stationaryRows = [...heads].filter(
      ([rowLabel, head]) => !plan.movingRows.includes(rowLabel) && !moving.has(head.seatId),
    )

    const occupied = stationaryRows.some(
      ([, head]) => Math.abs(result.get(head.seatId)!.y - targetRowY) < EPSILON,
    )

    if (!occupied) continue

    const shiftedLabels = new Set(
      stationaryRows
        .filter(([, head]) => result.get(head.seatId)!.y >= targetRowY)
        .map(([rowLabel]) => rowLabel),
    )

    for (const seat of content.seats) {
      if (moving.has(seat.seatId) || !shiftedLabels.has(seat.rowLabelSnapshot)) {
        continue
      }

      const geometry = result.get(seat.seatId)!

      result.set(seat.seatId, {
        ...geometry,
        y: geometry.y + ADMIN_SEAT_MATRIX_STEP.y,
      })
    }
  }

  // Chèn ghế riêng lẻ; các ghế thuộc hàng đang kéo không xử lý lại.
  const individuals = content.seats
    .filter((seat) => moving.has(seat.seatId) && !plan.movingRows.includes(seat.rowLabelSnapshot))
    .sort(
      (left, right) =>
        result.get(left.seatId)!.y - result.get(right.seatId)!.y ||
        result.get(left.seatId)!.x - result.get(right.seatId)!.x ||
        left.seatId.localeCompare(right.seatId),
    )

  for (const seat of individuals) {
    const destination = result.get(seat.seatId)!
    const destinationEnd = destination.x + capacity(seat) * ADMIN_SEAT_MATRIX_STEP.x

    const stationary = content.seats.filter(
      (other) =>
        !moving.has(other.seatId) &&
        other.rowLabelSnapshot === seat.rowLabelSnapshot &&
        Math.abs(result.get(other.seatId)!.y - destination.y) < EPSILON,
    )

    const collided = stationary.filter((other) => {
      const geometry = result.get(other.seatId)!

      return (
        geometry.x < destinationEnd &&
        geometry.x + capacity(other) * ADMIN_SEAT_MATRIX_STEP.x > destination.x
      )
    })

    if (!collided.length) continue

    const firstX = Math.min(...collided.map((other) => result.get(other.seatId)!.x))

    // Bao gồm trường hợp thả vào ô thứ hai của một ghế COUPLE.
    const shift =
      Math.ceil(
        Math.max(capacity(seat) * ADMIN_SEAT_MATRIX_STEP.x, destinationEnd - firstX) /
          ADMIN_SEAT_MATRIX_STEP.x,
      ) * ADMIN_SEAT_MATRIX_STEP.x

    for (const other of stationary) {
      const geometry = result.get(other.seatId)!
      if (geometry.x < firstX) continue

      result.set(other.seatId, {
        ...geometry,
        x: geometry.x + shift,
      })
    }
  }

  const changed = new Map<string, Geometry>()

  for (const seat of content.seats) {
    const geometry = result.get(seat.seatId)!

    if (geometry.x !== seat.geometry.x || geometry.y !== seat.geometry.y) {
      changed.set(seat.seatId, geometry)
    }
  }

  validateSeats(content, result, new Set(changed.keys()), origin)
  return changed
}
