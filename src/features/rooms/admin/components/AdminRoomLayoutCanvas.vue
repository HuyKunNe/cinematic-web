<script setup lang="ts">
import { computed } from 'vue'
import type { RoomLayoutResponse } from '@/services/api/generated/inventory-service/model'
import {
  isLayoutSeat,
  itemLabel,
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
}>()

const emit = defineEmits<{ select: [key: string] }>()

const items = computed(() => [...props.state.elements, ...props.state.seats])
// Khoảng cách tính bằng đơn vị geometry của sơ đồ, không phải CSS pixel.
const gridStep = 50
const majorGridStep = gridStep * 5

const gridId = computed(() => `room-layout-grid-${props.layout.id}`)
const majorGridId = computed(() => `room-layout-major-grid-${props.layout.id}`)
// Giới hạn số nhãn để thước không dày đặc trên sơ đồ lớn.
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

function transform(item: LayoutItem) {
  const geometry = item.geometry
  return `translate(${geometry.x + geometry.width / 2} ${
    geometry.y + geometry.height / 2
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
        class="layout-canvas__svg"
        :viewBox="`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`"
        role="group"
        aria-label="Các ghế và đối tượng trong sơ đồ phòng"
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
          :class="[`layout-object--${category(item)}`, { 'is-selected': selectedKey === item.key }]"
          role="button"
          :tabindex="disabled ? -1 : 0"
          :aria-label="accessibleLabel(item)"
          :aria-pressed="selectedKey === item.key"
          :aria-disabled="disabled"
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
