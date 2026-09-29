import { useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { findAll } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getByMovieId } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { toHomeMovie } from '../mappers/home-movie.mapper'

export const homeQueryKeys = {
  movies: ['home', 'movies'] as const,
  cinemas: ['home', 'cinemas'] as const,
  showtimes: (movieId: string) => ['home', 'showtimes', movieId] as const,
}

export function useHomeMovies() {
  return useQuery({
    queryKey: homeQueryKeys.movies,
    queryFn: findAll,
    select: (response) => response.map(toHomeMovie).filter((movie) => movie !== null),
  })
}

export function useHomeCinemas() {
  return useQuery({ queryKey: homeQueryKeys.cinemas, queryFn: () => getActiveCinemas() })
}

export function useHomeShowtimes(movieId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(movieId))
  return useQuery({
    queryKey: computed(() => homeQueryKeys.showtimes(id.value)),
    queryFn: () => getByMovieId(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}
