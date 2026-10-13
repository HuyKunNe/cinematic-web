<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  RoomLayoutGeometryInput,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import {
  isLayoutSeat,
  itemLabel,
  ROOM_LAYOUT_GRID_STEP,
  seatTypeLabel,
  type LayoutItem,
  type LayoutState,
} from '../models/admin-room-layout'

const props = defineProps<{
  layout: RoomLayoutResponse
  state: LayoutState
  selectedKey: string
  zoom: number
  disabled: boolean
  showGrid: boolean
  draggable: boolean
  beginMove: (key: string) => RoomLayoutGeometryInput | null
}>()

const emit = defineEmits<{
  select: [key: string]
  move: [payload: { key: string; x: number; y: number }]
  error: [message: string]
}>()

const svg = ref<SVGSVGElement | null>(null)
const items = computed(() => [...props.state.elements, ...props.state.seats])
const gridStep = ROOM_LAYOUT_GRID_STEP
const majorGridStep = gridStep * 5
const gridId = computed(() => `room-layout-grid-${props.layout.id}`)
const majorGridId = computed(() => `room-layout-major-grid-${props.layout.id}`)

const rulerStep = computed(() => {
  const longestSide = Math.max(props.layout.canvasWidth, props.layout.canvasHeight)
  return majorGridStep * Math.max(1, Math.ceil(longestSide / (majorGridStep * 8)))
})

function coordinateMarks(length: number) {
  if (!Number.isFinite(length) || length <= 0) return []

  const step = rulerStep.value
  const marks = Array.from({ length: Math.floor(length / step) + 1 }, (_, index) => index * step)
  if (marks.at(-1) !== length) marks.push(length)
  return marks
}

const xMarks = computed(() => coordinateMarks(props.layout.canvasWidth))
const yMarks = computed(() => coordinateMarks(props.layout.canvasHeight))
const coordinateFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 3,
})

type DragState = {
  pointerId: number
  key: string
  startX: number
  startY: number
  geometry: RoomLayoutGeometryInput
  x: number
  y: number
  moved: boolean
}

const drag = ref<DragState | null>(null)

function canvasPoint(event: PointerEvent) {
  const matrix = svg.value?.getScreenCTM()
  if (!matrix) return null

  return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
}

function movementBounds(geometry: RoomLayoutGeometryInput) {
  const angle = (geometry.rotationDegrees * Math.PI) / 180
  const rotatedWidth =
    Math.abs(Math.cos(angle)) * geometry.width + Math.abs(Math.sin(angle)) * geometry.height
  const rotatedHeight =
    Math.abs(Math.sin(angle)) * geometry.width + Math.abs(Math.cos(angle)) * geometry.height

  const marginX = Math.max(0, (rotatedWidth - geometry.width) / 2)
  const marginY = Math.max(0, (rotatedHeight - geometry.height) / 2)

  // Làm tròn vào phía trong khung, theo độ chính xác geometry.
  return {
    minX: Math.ceil(marginX * 1000) / 1000,
    minY: Math.ceil(marginY * 1000) / 1000,
    maxX: Math.floor((props.layout.canvasWidth - geometry.width - marginX) * 1000) / 1000,
    maxY: Math.floor((props.layout.canvasHeight - geometry.height - marginY) * 1000) / 1000,
  }
}

function startDrag(event: PointerEvent, key: string) {
  if (drag.value || props.disabled || !props.draggable || !event.isPrimary || event.button !== 0)
    return

  const point = canvasPoint(event)
  const canvas = svg.value
  if (!point || !canvas) return

  const geometry = props.beginMove(key)
  if (!geometry) return

  const bounds = movementBounds(geometry)
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    emit('error', 'Đối tượng quá lớn để kéo trong khung sơ đồ.')
    return
  }

  event.preventDefault()
  canvas.focus()
  canvas.setPointerCapture(event.pointerId)

  drag.value = {
    pointerId: event.pointerId,
    key,
    startX: point.x,
    startY: point.y,
    geometry: { ...geometry },
    x: geometry.x,
    y: geometry.y,
    moved: false,
  }
}

function updateDrag(event: PointerEvent) {
  const current = drag.value
  if (!current || current.pointerId !== event.pointerId) return

  const point = canvasPoint(event)
  if (!point) return

  if (!current.moved && point.x === current.startX && point.y === current.startY) return

  current.moved = true

  const bounds = movementBounds(current.geometry)
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const roundCoordinate = (value: number) => Number(value.toFixed(3))

  current.x = roundCoordinate(
    clamp(current.geometry.x + point.x - current.startX, bounds.minX, bounds.maxX),
  )
  current.y = roundCoordinate(
    clamp(current.geometry.y + point.y - current.startY, bounds.minY, bounds.maxY),
  )
}

function cancelDrag() {
  const current = drag.value
  drag.value = null

  if (current && svg.value?.hasPointerCapture(current.pointerId)) {
    svg.value.releasePointerCapture(current.pointerId)
  }
}

function finishDrag(event: PointerEvent) {
  if (drag.value?.pointerId !== event.pointerId) return

  updateDrag(event)
  const current = drag.value
  cancelDrag()

  if (
    current?.moved &&
    props.draggable &&
    !props.disabled &&
    (current.x !== current.geometry.x || current.y !== current.geometry.y)
  ) {
    emit('move', {
      key: current.key,
      x: current.x,
      y: current.y,
    })
  }
}

watch(
  () => [props.layout.id, props.draggable, props.disabled, props.zoom, props.showGrid],
  cancelDrag,
)
onBeforeUnmount(cancelDrag)

function transform(item: LayoutItem) {
  const current = drag.value
  const geometry = current?.key === item.key ? current.geometry : item.geometry
  const x = current?.key === item.key ? current.x : geometry.x
  const y = current?.key === item.key ? current.y : geometry.y

  return `translate(${x + geometry.width / 2} ${
    y + geometry.height / 2
  }) rotate(${geometry.rotationDegrees})`
}

function category(item: LayoutItem) {
  return (isLayoutSeat(item) ? item.seatTypeSnapshot : item.kind).toLowerCase()
}

function accessibleLabel(item: LayoutItem) {
  const type = isLayoutSeat(item) ? `, ${seatTypeLabel(item.seatTypeSnapshot)}` : ''
  return `${itemLabel(item)}${type}${props.selectedKey === item.key ? ', đang chọn' : ''}`
}

function select(key: string) {
  if (!props.disabled) emit('select', key)
}
</script>

<template>
  <div class="layout-canvas-scroll" tabindex="0" aria-label="Sơ đồ phòng, có thể cuộn ngang">
    <div
      class="layout-canvas"
      :class="{ 'has-rulers': showGrid }"
      :style="{ '--room-layout-zoom': zoom }"
    >
      <div v-if="showGrid" class="layout-ruler__corner" aria-hidden="true">X/Y</div>

      <div v-if="showGrid" class="layout-ruler is-x" aria-hidden="true">
        <span
          v-for="value in xMarks"
          :key="value"
          class="layout-ruler__mark"
          :style="{ left: `${(value / layout.canvasWidth) * 100}%` }"
        >
          {{ coordinateFormatter.format(value) }}
        </span>
      </div>

      <div v-if="showGrid" class="layout-ruler is-y" aria-hidden="true">
        <span
          v-for="value in yMarks"
          :key="value"
          class="layout-ruler__mark"
          :style="{ top: `${(value / layout.canvasHeight) * 100}%` }"
        >
          {{ coordinateFormatter.format(value) }}
        </span>
      </div>

      <svg
        ref="svg"
        class="layout-canvas__svg"
        :class="{ 'is-draggable': draggable }"
        :viewBox="`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`"
        tabindex="0"
        role="group"
        aria-label="Sơ đồ phòng. Có thể kéo đối tượng trong bản nháp; Escape để hủy kéo."
        @pointermove="updateDrag"
        @pointerup="finishDrag"
        @pointercancel="cancelDrag"
        @lostpointercapture="cancelDrag"
        @keydown.esc.prevent="cancelDrag"
      >
        <defs>
          <pattern :id="gridId" patternUnits="userSpaceOnUse" :width="gridStep" :height="gridStep">
            <path
              class="layout-grid__line"
              :d="`M ${gridStep} 0 H 0 V ${gridStep}`"
              vector-effect="non-scaling-stroke"
            />
          </pattern>

          <pattern
            :id="majorGridId"
            patternUnits="userSpaceOnUse"
            :width="majorGridStep"
            :height="majorGridStep"
          >
            <path
              class="layout-grid__line is-major"
              :d="`M ${majorGridStep} 0 H 0 V ${majorGridStep}`"
              vector-effect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        <g v-if="showGrid" class="layout-grid" aria-hidden="true">
          <rect
            x="0"
            y="0"
            :width="layout.canvasWidth"
            :height="layout.canvasHeight"
            :fill="`url(#${gridId})`"
          />
          <rect
            x="0"
            y="0"
            :width="layout.canvasWidth"
            :height="layout.canvasHeight"
            :fill="`url(#${majorGridId})`"
          />
        </g>

        <g
          v-for="item in items"
          :key="item.key"
          :transform="transform(item)"
          class="layout-object"
          :class="[
            `layout-object--${category(item)}`,
            {
              'is-selected': selectedKey === item.key,
              'is-dragging': drag?.key === item.key,
            },
          ]"
          role="button"
          :tabindex="disabled ? -1 : 0"
          :aria-label="accessibleLabel(item)"
          :aria-pressed="selectedKey === item.key"
          :aria-disabled="disabled"
          @pointerdown="startDrag($event, item.key)"
          @click="select(item.key)"
          @keydown.enter.prevent="select(item.key)"
          @keydown.space.prevent="select(item.key)"
        >
          <title>{{ accessibleLabel(item) }}</title>
          <rect
            :x="-item.geometry.width / 2"
            :y="-item.geometry.height / 2"
            :width="item.geometry.width"
            :height="item.geometry.height"
            vector-effect="non-scaling-stroke"
          />
          <text x="0" y="0" aria-hidden="true">
            {{ isLayoutSeat(item) ? item.seatNumberSnapshot : item.label || itemLabel(item) }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
