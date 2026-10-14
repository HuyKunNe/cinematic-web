import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { RoomLayoutGeometryResponse } from '@/services/api/generated/inventory-service/model'

type Point = { x: number; y: number }

type DragOptions = {
  enabled: () => boolean
  onPosition: (geometry: RoomLayoutGeometryResponse) => void
  onDrop: (geometry: RoomLayoutGeometryResponse) => void
  onCancel: () => void
}

type DragSession = {
  pointerId: number
  svg: SVGSVGElement
  origin: Point
  clientOrigin: Point
  initial: RoomLayoutGeometryResponse
  current: RoomLayoutGeometryResponse
  moved: boolean
}

const MAX_COORDINATE = 999999999.999
const DRAG_THRESHOLD = 4

export function useRoomLayoutElementDrag(canvas: Ref<SVGSVGElement | null>, options: DragOptions) {
  const active = ref(false)
  let session: DragSession | null = null

  function logicalPoint(svg: SVGSVGElement, event: PointerEvent): Point | null {
    try {
      const matrix = svg.getScreenCTM()
      if (!matrix) return null

      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY

      const converted = point.matrixTransform(matrix.inverse())

      return Number.isFinite(converted.x) && Number.isFinite(converted.y)
        ? { x: converted.x, y: converted.y }
        : null
    } catch {
      return null
    }
  }

  function coordinate(value: number) {
    return Number(Math.min(MAX_COORDINATE, Math.max(0, value)).toFixed(3))
  }

  function finish(drop: boolean) {
    const previous = session
    if (!previous) return

    session = null
    active.value = false
    window.removeEventListener('keydown', onKeyDown)

    try {
      if (previous.svg.hasPointerCapture(previous.pointerId)) {
        previous.svg.releasePointerCapture(previous.pointerId)
      }
    } catch {
      // SVG may already have been removed.
    }

    const changed =
      previous.current.x !== previous.initial.x || previous.current.y !== previous.initial.y

    if (drop && previous.moved && changed) {
      options.onDrop({ ...previous.current })
    } else {
      options.onCancel()
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!session || event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    finish(false)
  }

  function start(event: PointerEvent, geometry: RoomLayoutGeometryResponse) {
    const svg = canvas.value

    if (!svg || session || !options.enabled() || !event.isPrimary || event.button !== 0) {
      return false
    }

    const origin = logicalPoint(svg, event)
    if (!origin) return false

    try {
      svg.setPointerCapture(event.pointerId)
    } catch {
      return false
    }

    session = {
      pointerId: event.pointerId,
      svg,
      origin,
      clientOrigin: { x: event.clientX, y: event.clientY },
      initial: { ...geometry },
      current: { ...geometry },
      moved: false,
    }

    active.value = true
    window.addEventListener('keydown', onKeyDown)
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  function move(event: PointerEvent) {
    const current = session
    if (!current || event.pointerId !== current.pointerId) return

    if (!options.enabled()) {
      finish(false)
      return
    }

    if (
      !current.moved &&
      Math.hypot(event.clientX - current.clientOrigin.x, event.clientY - current.clientOrigin.y) <
        DRAG_THRESHOLD
    ) {
      return
    }

    const point = logicalPoint(current.svg, event)
    if (!point) {
      finish(false)
      return
    }

    current.moved = true
    current.current = {
      ...current.initial,
      x: coordinate(current.initial.x + point.x - current.origin.x),
      y: coordinate(current.initial.y + point.y - current.origin.y),
    }

    options.onPosition({ ...current.current })
    event.preventDefault()
  }

  function end(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return

    move(event)
    finish(true)
  }

  function cancel(event?: PointerEvent) {
    if (event && session && event.pointerId !== session.pointerId) return
    finish(false)
  }

  onBeforeUnmount(() => finish(false))

  return { active, start, move, end, cancel }
}
