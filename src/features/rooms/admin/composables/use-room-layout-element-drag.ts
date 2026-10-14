import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { RoomLayoutGeometryResponse } from '@/services/api/generated/inventory-service/model'

type Point = { x: number; y: number }

type DragOptions = {
  enabled: () => boolean
  onPosition: (x: number, y: number) => void
}

type DragSession = {
  pointerId: number
  svg: SVGSVGElement
  origin: Point
  geometry: RoomLayoutGeometryResponse
}

const MAX_COORDINATE = 999999999.999

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
    const bounded = Math.min(MAX_COORDINATE, Math.max(0, value))
    return Number(bounded.toFixed(3))
  }

  function finish(restore: boolean) {
    const previous = session
    if (!previous) return

    // Clear first: releasing capture also emits lostpointercapture.
    session = null
    active.value = false
    window.removeEventListener('keydown', onKeyDown)

    if (restore) {
      options.onPosition(previous.geometry.x, previous.geometry.y)
    }

    try {
      if (previous.svg.hasPointerCapture(previous.pointerId)) {
        previous.svg.releasePointerCapture(previous.pointerId)
      }
    } catch {
      // The SVG may already have been removed.
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!session || event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    finish(true)
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
      geometry: { ...geometry },
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
      finish(true)
      return
    }

    const point = logicalPoint(current.svg, event)
    if (!point) {
      finish(true)
      return
    }

    options.onPosition(
      coordinate(current.geometry.x + point.x - current.origin.x),
      coordinate(current.geometry.y + point.y - current.origin.y),
    )

    event.preventDefault()
  }

  function end(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return

    move(event)
    finish(false)
  }

  function cancel(event?: PointerEvent) {
    if (event && session && event.pointerId !== session.pointerId) return
    finish(true)
  }

  onBeforeUnmount(() => finish(true))

  return { active, start, move, end, cancel }
}
