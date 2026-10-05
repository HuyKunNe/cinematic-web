<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Clapperboard, Play } from 'lucide-vue-next'
import type { HomeMovie } from '../models/home-movie'
import { heroArtworkCandidates } from '../presentation/artwork'
import { formatAgeRating } from '@/utils/movie-age-rating'
const props = defineProps<{
  movies: HomeMovie[]
  loading: boolean
  error: boolean
  errorMessage: string
  retrying: boolean
  emptyMessage: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const shown = ref<HomeMovie | null>(null)
const ageRating = computed(() => formatAgeRating(shown.value?.ageRating))
const artwork = ref('')
const pending = ref(false)
const isTransitioning = ref(false)
let requestVersion = 0

const placeholderTitle = computed(() => {
  if (props.loading || pending.value) return 'Đang tải phim'
  if (props.error) return 'Chưa thể tải nội dung'
  return 'Khám phá điện ảnh'
})

const placeholderMessage = computed(() => {
  if (props.loading || pending.value) {
    return 'Đang chuẩn bị nội dung…'
  }

  if (props.error) {
    return props.errorMessage || 'Không thể tải nội dung. Vui lòng thử lại.'
  }

  return props.emptyMessage
})

const activeIndex = computed(() => props.movies.findIndex((movie) => movie.id === shown.value?.id))

type SlideDirection = 'next' | 'previous'

const slideDirection = ref<SlideDirection>('next')

const slideTransitionName = computed(() => `home-hero-${slideDirection.value}`)

const heroTitleId = computed(() =>
  shown.value ? `home-hero-title-${shown.value.id}` : 'home-hero-title-empty',
)

function handleSlideLeave(element: Element) {
  isTransitioning.value = true

  // The outgoing slide remains visible during animation,
  // but its links should no longer receive focus.
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}

function handleSlideLeaveCancelled(element: Element) {
  element.removeAttribute('inert')
  element.removeAttribute('aria-hidden')
  isTransitioning.value = false
}
function preload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => finish(false), 3000)
    function finish(success: boolean) {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      resolve(success)
    }
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    image.src = url
  })
}

async function selectSlide(index: number, force = false, direction?: SlideDirection) {
  const movie = props.movies[index]

  if (!movie || (!force && shown.value?.id === movie.id && !pending.value)) {
    return
  }

  const version = ++requestVersion
  pending.value = true

  let nextArtwork = ''

  for (const candidate of heroArtworkCandidates(movie)) {
    const loaded = await preload(candidate)

    if (version !== requestVersion) return

    if (loaded) {
      nextArtwork = candidate
      break
    }
  }

  if (version !== requestVersion) return

  slideDirection.value = direction ?? (index < Math.max(activeIndex.value, 0) ? 'previous' : 'next')

  artwork.value = nextArtwork
  shown.value = movie
  pending.value = false
}

function advance(direction: number) {
  if (props.movies.length < 2 || pending.value || isTransitioning.value) {
    return
  }

  const next =
    (Math.max(activeIndex.value, 0) + direction + props.movies.length) % props.movies.length

  void selectSlide(next, false, direction < 0 ? 'previous' : 'next')
}

watch(
  () => props.movies,
  (movies) => {
    ++requestVersion
    if (!movies.length) {
      shown.value = null
      artwork.value = ''
      pending.value = false
    } else if (!movies.some((movie) => movie.id === shown.value?.id)) {
      void selectSlide(0)
    } else {
      const current = movies.find((movie) => movie.id === shown.value?.id)
      if (current && current !== shown.value) void selectSlide(movies.indexOf(current), true)
    }
  },
  { immediate: true },
)
const AUTO_ADVANCE_DELAY_MS = 5_000

const isMounted = ref(false)
const isHovered = ref(false)
const hasFocusWithin = ref(false)
const isPageVisible = ref(false)
const prefersReducedMotion = ref(false)

let autoAdvanceTimer: number | undefined
let reducedMotionQuery: MediaQueryList | undefined

const canAutoAdvance = computed(
  () =>
    isMounted.value &&
    isPageVisible.value &&
    !prefersReducedMotion.value &&
    !isHovered.value &&
    !hasFocusWithin.value &&
    !props.loading &&
    !props.error &&
    !isTransitioning.value &&
    !pending.value &&
    props.movies.length > 1 &&
    activeIndex.value >= 0,
)

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer === undefined) return

  window.clearTimeout(autoAdvanceTimer)
  autoAdvanceTimer = undefined
}

function scheduleAutoAdvance() {
  clearAutoAdvanceTimer()

  if (!canAutoAdvance.value) return

  autoAdvanceTimer = window.setTimeout(() => {
    autoAdvanceTimer = undefined

    if (canAutoAdvance.value) {
      advance(1)
    }
  }, AUTO_ADVANCE_DELAY_MS)
}

function handlePointerEnter(event: PointerEvent) {
  if (event.pointerType === 'mouse') {
    isHovered.value = true
  }
}

function handlePointerLeave() {
  isHovered.value = false
}

function handleFocusIn() {
  hasFocusWithin.value = true
}

function handleFocusOut(event: FocusEvent) {
  const section = event.currentTarget as HTMLElement | null
  const nextTarget = event.relatedTarget as Node | null

  hasFocusWithin.value = Boolean(section && nextTarget && section.contains(nextTarget))
}

function updatePageVisibility() {
  isPageVisible.value = document.visibilityState === 'visible'
}

function updateReducedMotion() {
  prefersReducedMotion.value = reducedMotionQuery?.matches ?? false
}

watch([canAutoAdvance, shown, () => props.movies], scheduleAutoAdvance, { flush: 'post' })

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateReducedMotion()
  updatePageVisibility()

  document.addEventListener('visibilitychange', updatePageVisibility)
  reducedMotionQuery.addEventListener('change', updateReducedMotion)

  isMounted.value = true
  scheduleAutoAdvance()
})

onBeforeUnmount(() => {
  isMounted.value = false
  clearAutoAdvanceTimer()

  // Ignore any artwork preload result arriving after this component is removed.
  ++requestVersion

  document.removeEventListener('visibilitychange', updatePageVisibility)
  reducedMotionQuery?.removeEventListener('change', updateReducedMotion)
})
</script>

<template>
  <section
    class="home-hero"
    :aria-labelledby="heroTitleId"
    :aria-busy="loading || retrying || pending || isTransitioning"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <Transition
      :name="slideTransitionName"
      @before-enter="isTransitioning = true"
      @before-leave="handleSlideLeave"
      @after-enter="isTransitioning = false"
      @enter-cancelled="isTransitioning = false"
      @leave-cancelled="handleSlideLeaveCancelled"
    >
      <div :key="shown?.id ?? 'empty'" class="home-hero__slide">
        <img v-if="artwork" class="home-hero__art" :src="artwork" alt="" aria-hidden="true" />

        <div class="home-hero__shade" aria-hidden="true" />

        <div class="home-container home-hero__content">
          <template v-if="shown">
            <span class="home-badge">ĐANG CHIẾU</span>

            <h1 :id="heroTitleId">{{ shown.title }}</h1>

            <p class="home-hero__tagline">ĐIỆN ẢNH KẾT NỐI CẢM XÚC</p>

            <div class="home-hero__meta">
              <span v-if="shown.genres.length">
                {{ shown.genres.join(' · ') }}
              </span>

              <span
                class="home-age-mark"
                role="img"
                :aria-label="ageRating.description"
                :title="ageRating.description"
              >
                {{ ageRating.label }}
              </span>

              <span v-if="shown.durationMinutes"> {{ shown.durationMinutes }} phút </span>
            </div>

            <div class="home-hero__actions">
              <a class="home-button home-button--primary" href="#quick-booking">
                <Clapperboard aria-hidden="true" />
                Đặt vé ngay
              </a>

              <a
                v-if="shown.trailerUrl"
                class="home-button home-button--ghost"
                :href="shown.trailerUrl"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`Xem trailer ${shown.title} (mở tab mới)`"
              >
                <Play aria-hidden="true" />
                Xem trailer
              </a>

              <button
                v-else
                class="home-button home-button--ghost"
                type="button"
                disabled
                title="Trailer chưa được cập nhật"
                :aria-label="`Trailer ${shown.title} chưa được cập nhật`"
              >
                <Play aria-hidden="true" />
                Xem trailer
              </button>
            </div>
          </template>

          <template v-else>
            <span class="home-badge">CINEMATIC</span>

            <h1 :id="heroTitleId">{{ placeholderTitle }}</h1>

            <p
              class="home-hero__tagline"
              :role="error && !loading && !pending ? 'alert' : 'status'"
              aria-atomic="true"
            >
              {{ placeholderMessage }}
            </p>
            <div v-if="error && !loading && !pending" class="home-hero__actions">
              <button
                class="home-button home-button--primary"
                type="button"
                :disabled="retrying"
                :aria-busy="retrying"
                @click="emit('retry')"
              >
                {{ retrying ? 'Đang thử lại…' : 'Thử lại' }}
              </button>
            </div>
          </template>
        </div>

        <div v-if="shown" class="home-hero__copy" aria-hidden="true">
          <strong>{{ shown.title }}</strong>
          <span>CINEMATIC</span>
        </div>
      </div>
    </Transition>

    <button
      v-if="movies.length > 1"
      class="home-hero__arrow home-hero__arrow--left"
      type="button"
      aria-label="Phim trước"
      :disabled="pending || isTransitioning"
      @click="advance(-1)"
    >
      <ChevronLeft aria-hidden="true" />
    </button>

    <button
      v-if="movies.length > 1"
      class="home-hero__arrow home-hero__arrow--right"
      type="button"
      aria-label="Phim tiếp theo"
      :disabled="pending || isTransitioning"
      @click="advance(1)"
    >
      <ChevronRight aria-hidden="true" />
    </button>

    <div v-if="movies.length > 1" class="home-hero__dots" role="group" aria-label="Chọn banner">
      <button
        v-for="(movie, index) in movies"
        :key="movie.id"
        type="button"
        :aria-label="`Banner ${index + 1}: ${movie.title}`"
        :aria-current="activeIndex === index ? 'true' : undefined"
        :class="{ 'is-active': activeIndex === index }"
        :disabled="pending || isTransitioning"
        @click="selectSlide(index)"
      />
    </div>

    <span v-if="pending" class="home-sr-only" role="status"> Đang tải ảnh phim </span>
  </section>
</template>
