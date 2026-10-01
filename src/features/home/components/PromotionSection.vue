<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { promotionPreviews } from '../presentation/marketing'

const POSITION_TOLERANCE = 1
const SCROLL_SETTLE_MS = 160

const track = ref<HTMLElement | null>(null)
const canPrevious = ref(false)
const canNext = ref(false)
const scrolling = ref(false)

let resizeObserver: ResizeObserver | undefined
let settleTimer: number | undefined

const hasOverflow = computed(() => canPrevious.value || canNext.value)

function refreshGeometry() {
  const element = track.value

  if (!element) {
    canPrevious.value = false
    canNext.value = false
    return
  }

  const maximum = Math.max(0, element.scrollWidth - element.clientWidth)

  canPrevious.value = element.scrollLeft > POSITION_TOLERANCE
  canNext.value = element.scrollLeft < maximum - POSITION_TOLERANCE
}

function move(direction: number) {
  const element = track.value
  if (!element || scrolling.value) return

  const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
  if (maximum <= POSITION_TOLERANCE) return

  const children = Array.from(element.children) as HTMLElement[]
  const firstOffset = children[0]?.offsetLeft ?? 0

  const positions = [
    0,
    ...children.map((child) => Math.min(maximum, Math.max(0, child.offsetLeft - firstOffset))),
    maximum,
  ].sort((a, b) => a - b)

  const current = element.scrollLeft
  const destination =
    direction > 0
      ? positions.find((position) => position > current + POSITION_TOLERANCE)
      : [...positions].reverse().find((position) => position < current - POSITION_TOLERANCE)

  if (destination === undefined) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  element.scrollTo({
    left: destination,
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
}

function handleScroll() {
  refreshGeometry()
  scrolling.value = true

  if (settleTimer !== undefined) window.clearTimeout(settleTimer)

  settleTimer = window.setTimeout(() => {
    settleTimer = undefined
    refreshGeometry()
    scrolling.value = false
  }, SCROLL_SETTLE_MS)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }
}

onMounted(() => {
  resizeObserver = new ResizeObserver(refreshGeometry)
  if (track.value) resizeObserver.observe(track.value)
  refreshGeometry()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (settleTimer !== undefined) window.clearTimeout(settleTimer)
})
</script>

<template>
  <section
    id="promotions"
    class="home-container home-promotion-carousel"
    aria-label="Thiết kế ưu đãi đang chờ xác nhận"
    aria-roledescription="carousel"
  >
    <div
      id="promotion-track"
      ref="track"
      class="home-promotion-carousel__track"
      tabindex="0"
      aria-label="Danh sách ưu đãi minh họa"
      @scroll.passive="handleScroll"
      @keydown="handleKeydown"
    >
      <article
        v-for="(promotion, index) in promotionPreviews"
        :key="promotion.label"
        class="home-promotion"
        :class="{ 'home-promotion--combo': index === 1 }"
      >
        <div class="home-promotion-carousel__content">
          <span class="home-promotion__label" :title="promotion.label">
            {{ promotion.label }}
          </span>

          <h2 :title="`${promotion.title} ${promotion.highlight}`">
            {{ promotion.title }}
            <strong>{{ promotion.highlight }}</strong>
          </h2>

          <p :title="promotion.description">
            {{ promotion.description }}
          </p>

          <small>Nội dung minh họa · chưa áp dụng</small>
        </div>

        <div class="home-promotion__art" aria-hidden="true">
          {{ promotion.art }}
        </div>
      </article>
    </div>

    <div
      v-if="hasOverflow"
      class="home-promotion-carousel__controls"
      role="group"
      aria-label="Điều khiển ưu đãi"
    >
      <button
        class="home-promotion-carousel__button"
        type="button"
        aria-label="Ưu đãi phía trước"
        aria-controls="promotion-track"
        :disabled="!canPrevious || scrolling"
        @click="move(-1)"
      >
        <ChevronLeft aria-hidden="true" />
      </button>

      <button
        class="home-promotion-carousel__button"
        type="button"
        aria-label="Ưu đãi tiếp theo"
        aria-controls="promotion-track"
        :disabled="!canNext || scrolling"
        @click="move(1)"
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
