<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Clapperboard, Play } from 'lucide-vue-next'
import type { HomeMovie } from '../models/home-movie'
import { fallbackArtwork, movieArtwork } from '../presentation/artwork'

const props = defineProps<{ movies: HomeMovie[]; loading: boolean }>()
const shown = ref<HomeMovie | null>(null)
const artwork = ref('')
const pending = ref(false)
let requestVersion = 0

const activeIndex = computed(() => props.movies.findIndex((movie) => movie.id === shown.value?.id))

function preload(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => finish(false), 5000)
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

async function selectSlide(index: number, force = false) {
  const movie = props.movies[index]
  if (!movie || (!force && shown.value?.id === movie.id && !pending.value)) return
  const version = ++requestVersion
  pending.value = true
  const candidate = movieArtwork(movie)
  const loaded = await preload(candidate)
  if (version !== requestVersion) return
  const image = loaded ? candidate : fallbackArtwork(movie.id)
  const fallbackLoaded = loaded || (await preload(image))
  if (version !== requestVersion) return
  // Content, image and indicator commit together; never show the previous art with new text.
  artwork.value = fallbackLoaded ? image : ''
  shown.value = movie
  pending.value = false
}

function advance(direction: number) {
  if (!props.movies.length) return
  const next =
    (Math.max(activeIndex.value, 0) + direction + props.movies.length) % props.movies.length
  void selectSlide(next)
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
</script>

<template>
  <section class="home-hero" aria-labelledby="home-hero-title" :aria-busy="loading || pending">
    <img v-if="artwork" class="home-hero__art" :src="artwork" alt="" aria-hidden="true" />
    <div class="home-hero__shade" aria-hidden="true" />
    <div class="home-container home-hero__content">
      <template v-if="shown">
        <span class="home-badge">ĐANG CHIẾU</span>
        <h1 id="home-hero-title">{{ shown.title }}</h1>
        <p class="home-hero__tagline">ĐIỆN ẢNH KẾT NỐI CẢM XÚC</p>
        <div class="home-hero__meta">
          <span v-if="shown.genres.length">{{ shown.genres.join(' · ') }}</span>
          <span v-if="shown.durationMinutes">{{ shown.durationMinutes }} phút</span>
        </div>
        <div class="home-hero__actions">
          <a class="home-button home-button--primary" href="#quick-booking"
            ><Clapperboard aria-hidden="true" /> Đặt vé ngay</a
          >
          <a
            v-if="shown.trailerUrl"
            class="home-button home-button--ghost"
            :href="shown.trailerUrl"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`Xem trailer ${shown.title} (mở tab mới)`"
            ><Play aria-hidden="true" /> Xem trailer</a
          >
        </div>
      </template>
      <template v-else>
        <span class="home-badge">CINEMATIC</span>
        <h1 id="home-hero-title">Khám phá điện ảnh</h1>
        <p class="home-hero__tagline">
          {{ loading ? 'ĐANG TẢI DANH SÁCH PHIM' : 'PHIM ĐANG CHIẾU SẼ ĐƯỢC CẬP NHẬT' }}
        </p>
      </template>
    </div>
    <div v-if="shown" class="home-hero__copy" aria-hidden="true">
      <strong>{{ shown.title }}</strong
      ><span>CINEMATIC</span>
    </div>
    <button
      v-if="movies.length > 1"
      class="home-hero__arrow home-hero__arrow--left"
      type="button"
      aria-label="Phim trước"
      :disabled="pending"
      @click="advance(-1)"
    >
      <ChevronLeft aria-hidden="true" />
    </button>
    <button
      v-if="movies.length > 1"
      class="home-hero__arrow home-hero__arrow--right"
      type="button"
      aria-label="Phim tiếp theo"
      :disabled="pending"
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
        :disabled="pending"
        @click="selectSlide(index)"
      />
    </div>
    <span v-if="pending" class="home-sr-only" role="status">Đang tải ảnh phim</span>
  </section>
</template>
