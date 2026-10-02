import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { cinemaProgrammeQueryKeys, useCinemaProgrammeQuery } from '@/features/cinemas'
import { findAll } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getByMovieId } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { toHomeMovie } from '../mappers/home-movie.mapper'

export const homeQueryKeys = {
  movies: ['home', 'movies'] as const,
  cinemas: ['home', 'cinemas'] as const,
  showtimes: (movieId: string) => ['home', 'showtimes', movieId] as const,
  cinemaProgramme: cinemaProgrammeQueryKeys.programme,
}

export function useHomeMovies() {
  return useQuery({
    queryKey: homeQueryKeys.movies,
    queryFn: findAll,
    select: (response) => response.map(toHomeMovie).filter((movie) => movie !== null),
  })
}

export function useHomeCinemas() {
  return useQuery({
    queryKey: homeQueryKeys.cinemas,
    queryFn: () => getActiveCinemas(),
  })
}

export function useHomeShowtimes(movieId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(movieId))

  return useQuery({
    queryKey: computed(() => homeQueryKeys.showtimes(id.value)),
    queryFn: () => getByMovieId(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useHomeCinemaProgramme(cinemaId: MaybeRefOrGetter<string>) {
  return useCinemaProgrammeQuery(cinemaId)
}
