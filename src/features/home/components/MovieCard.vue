<script setup lang="ts">
import { computed } from 'vue'
import CustomerMovieCard from '@/components/movies/CustomerMovieCard.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatAgeRating } from '@/utils/movie-age-rating'
import type { HomeMovie } from '../models/home-movie'

const props = defineProps<{ movie: HomeMovie }>()
const ageRating = computed(() => formatAgeRating(props.movie.ageRating))
const detailLocation = computed(() => ({ name: ROUTE_NAMES.MOVIE_DETAIL, params: { movieId: props.movie.id } }))
const metadata = computed(() => [
  props.movie.genres.join(' · ') || 'Thể loại chưa cập nhật',
  props.movie.durationMinutes ? `${props.movie.durationMinutes} phút` : '',
].filter(Boolean).join(' · '))
const caption = computed(() => {
  const date = props.movie.releaseDate
  if (!date) return props.movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'
  const [year, month, day] = date.split('-')
  const label = year && month && day ? `${day}/${month}` : date
  return `${props.movie.status === 'UPCOMING' ? 'Dự kiến' : 'Khởi chiếu'} ${label}`
})
</script>

<template>
  <CustomerMovieCard
    :title="movie.title"
    :poster-url="movie.posterUrl"
    :trailer-url="movie.trailerUrl"
    :detail-to="detailLocation"
    :action-to="detailLocation"
    :metadata="metadata"
    :caption="caption"
    :age-label="ageRating.label"
    :age-description="ageRating.description"
    :age-code="movie.ageRating"
    :bookable="movie.status === 'NOW_SHOWING'"
    heading="h3"
  />
</template>
