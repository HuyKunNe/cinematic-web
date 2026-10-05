<script setup lang="ts">
import type { HomeMovie } from '../models/home-movie'
import HomeMoviesCarousel from './HomeMoviesCarousel.vue'

defineProps<{
  movies: HomeMovie[]
  loading: boolean
  error: boolean
}>()
</script>

<template>
  <HomeMoviesCarousel status="NOW_SHOWING" :movies="movies" :loading="loading" :error="error" />
</template>
