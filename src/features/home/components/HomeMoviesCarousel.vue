<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import MovieCard from './MovieCard.vue'

const props = defineProps<{
  movies: HomeMovie[]
  loading: boolean
  error: boolean
  status: HomeMovie['status']
}>()

const content = computed(() =>
  props.status === 'UPCOMING'
    ? {
        id: 'upcoming',
        trackId: 'upcoming-track',
        title: 'Sắp chiếu',
        description: 'Những bộ phim đặc sắc sẽ ra mắt trong thời gian tới',
        listLabel: 'Danh sách phim sắp chiếu',
        controlsLabel: 'Điều khiển phim sắp chiếu',
        emptyMessage: 'Chưa có phim sắp chiếu.',
      }
    : {
        id: 'showing',
        trackId: 'now-showing-track',
        title: 'Phim đang chiếu',
        description: 'Những bộ phim hấp dẫn đang ra rạp tại CINEMATIC',
        listLabel: 'Danh sách phim đang chiếu',
        controlsLabel: 'Điều khiển phim đang chiếu',
        emptyMessage: 'Chưa có phim đang chiếu.',
      },
)

const POSITION_TOLERANCE = 1
const SCROLL_SETTLE_MS = 160

const track = ref<HTMLElement | null>(null)
const canPrevious = ref(false)
const canNext = ref(false)
const scrolling = ref(false)

let resizeObserver: ResizeObserver | undefined
let settleTimer: number | undefined
let disposed = false

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

function move(direction: -1 | 1) {
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

  // Chỉ xác định lúc thao tác cuộn kết thúc.
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

watch(
  track,
  (element) => {
    resizeObserver?.disconnect()
    if (element) resizeObserver?.observe(element)
    refreshGeometry()
  },
  { flush: 'post' },
)

watch(
  [() => props.movies, () => props.loading, () => props.error],
  async () => {
    await nextTick()
    if (!disposed) refreshGeometry()
  },
  { flush: 'post' },
)

onMounted(() => {
  resizeObserver = new ResizeObserver(refreshGeometry)
  if (track.value) resizeObserver.observe(track.value)
  refreshGeometry()
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()

  if (settleTimer !== undefined) window.clearTimeout(settleTimer)
})
</script>

<template>
  <section
    :id="content.id"
    class="home-section home-container home-now-showing"
    :class="{ 'home-section--bordered': status === 'UPCOMING' }"
    :aria-labelledby="`${content.id}-title`"
    aria-roledescription="carousel"
  >
    <div class="home-section__heading">
      <div>
        <h2 :id="`${content.id}-title`">{{ content.title }}</h2>
        <p>{{ content.description }}</p>
      </div>

      <RouterLink
        :to="{
          name: ROUTE_NAMES.MOVIES,
          query: { status },
        }"
      >
        Xem tất cả →
      </RouterLink>
    </div>

    <p v-if="loading" role="status">Đang tải phim…</p>

    <p v-else-if="error" role="alert">Không thể tải danh sách phim. Vui lòng thử lại sau.</p>

    <p v-else-if="!movies.length">{{ content.emptyMessage }}</p>

    <template v-else>
      <div
        :id="content.trackId"
        ref="track"
        class="home-now-showing__track"
        tabindex="0"
        :aria-label="content.listLabel"
        @scroll.passive="handleScroll"
        @keydown="handleKeydown"
      >
        <MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" />
      </div>

      <div
        v-if="hasOverflow"
        class="home-now-showing__controls"
        role="group"
        :aria-label="content.controlsLabel"
      >
        <button
          class="home-now-showing__button"
          type="button"
          aria-label="Phim phía trước"
          :aria-controls="content.trackId"
          :disabled="!canPrevious || scrolling"
          @click="move(-1)"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <button
          class="home-now-showing__button"
          type="button"
          aria-label="Phim tiếp theo"
          :aria-controls="content.trackId"
          :disabled="!canNext || scrolling"
          @click="move(1)"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </template>
  </section>
</template>
