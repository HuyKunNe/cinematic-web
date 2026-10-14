<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  canvasWidth: number
  canvasHeight: number
  zoom: number
}>()

const canvasHost = ref<HTMLDivElement | null>(null)
const renderedWidth = ref(0)
const renderedHeight = ref(0)
let observer: ResizeObserver | undefined

function niceStep(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const factor = [1, 2, 5, 10].find((item) => item >= normalized) ?? 10
  return factor * magnitude
}

function ticks(length: number, pixels: number) {
  if (!(length > 0) || !(pixels > 0)) return []

  // Keep labels readable and cap the number of generated marks.
  const majorStep = niceStep(Math.max((length * 80) / pixels, length / 200))
  const minorStep = majorStep / 5
  const count = Math.min(1000, Math.floor(length / minorStep))

  return Array.from({ length: count + 1 }, (_, index) => {
    const value = Number((index * minorStep).toPrecision(12))

    return {
      value,
      major: index % 5 === 0,
      percentage: (value / length) * 100,
    }
  })
}

const xTicks = computed(() => ticks(props.canvasWidth, renderedWidth.value))
const yTicks = computed(() => ticks(props.canvasHeight, renderedHeight.value))

const formatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 6,
})

onMounted(() => {
  if (!canvasHost.value) return

  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    renderedWidth.value = entry.contentRect.width
    renderedHeight.value = entry.contentRect.height
  })

  observer.observe(canvasHost.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="layout-ruler-host" :style="{ '--layout-zoom-factor': zoom / 100 }">
    <div
      class="layout-ruler-viewport"
      role="region"
      aria-label="Canvas với thước tọa độ, có thể cuộn"
      tabindex="0"
    >
      <div class="layout-ruler-sheet">
        <div class="layout-ruler-corner" title="Đơn vị layout">u</div>

        <div class="layout-ruler-x" aria-label="Thước tọa độ X">
          <span
            v-for="tick in xTicks"
            :key="tick.value"
            class="layout-ruler-tick"
            :class="{
              'is-major': tick.major,
              'is-end': tick.value === canvasWidth,
            }"
            :style="{ left: `${tick.percentage}%` }"
            aria-hidden="true"
          >
            <span v-if="tick.major" class="layout-ruler-label">
              {{ formatter.format(tick.value) }}
            </span>
          </span>
        </div>

        <div class="layout-ruler-y" aria-label="Thước tọa độ Y">
          <span
            v-for="tick in yTicks"
            :key="tick.value"
            class="layout-ruler-tick"
            :class="{
              'is-major': tick.major,
              'is-end': tick.value === canvasHeight,
            }"
            :style="{ top: `${tick.percentage}%` }"
            aria-hidden="true"
          >
            <span v-if="tick.major" class="layout-ruler-label">
              {{ formatter.format(tick.value) }}
            </span>
          </span>
        </div>

        <div ref="canvasHost" class="layout-ruler-canvas">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
