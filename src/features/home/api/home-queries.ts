import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { cinemaProgrammeQueryKeys, useCinemaProgrammeQuery } from '@/features/cinemas'
import { findAll } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  getByMovieId,
  getBookableShowtimes,
} from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'
import { toHomeMovie } from '../mappers/home-movie.mapper'
import { getHeroMovies } from '@/services/api/generated/movie-service/movie-hero-controller/movie-hero-controller'

export interface HomeHeroScope {
  cinemaId: string
  ready: boolean
  movieIds: readonly string[] | null
}

export const homeQueryKeys = {
  movies: ['home', 'movies'] as const,
  hero: (cinemaId: string, limit: number, movieIds: readonly string[] | null) =>
    ['home', 'hero', cinemaId, limit, movieIds] as const,
  cinemas: ['home', 'cinemas'] as const,
  showtimes: (movieId: string) => ['home', 'showtimes', movieId] as const,
  cinemaProgramme: cinemaProgrammeQueryKeys.programme,
  bookableShowtimes: (params: GetBookableShowtimesParams | null) =>
    [
      'home',
      'bookable-showtimes',
      params?.cinemaId ?? '',
      params?.movieId ?? '',
      params?.from ?? '',
      params?.to ?? '',
    ] as const,
}

export function useHomeMovies() {
  return useQuery({
    queryKey: homeQueryKeys.movies,
    queryFn: findAll,
    select: (response) => response.map(toHomeMovie).filter((movie) => movie !== null),
  })
}

export function useHomeHeroMovies(scope: MaybeRefOrGetter<HomeHeroScope>, limit = 6) {
  const request = computed(() => toValue(scope))

  const movieIds = computed<string[] | null>(() => {
    if (!request.value.cinemaId) {
      return null
    }

    return [
      ...new Set((request.value.movieIds ?? []).map((movieId) => movieId.trim()).filter(Boolean)),
    ].sort()
  })

  return useQuery({
    queryKey: computed(() => homeQueryKeys.hero(request.value.cinemaId, limit, movieIds.value)),

    enabled: computed(
      () => request.value.ready && (!request.value.cinemaId || Boolean(movieIds.value?.length)),
    ),

    retry: false,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,

    queryFn: ({ queryKey }) => {
      const [, , cinemaId, requestedLimit, candidates] = queryKey

      // Không để một bộ lọc rạp rỗng trở thành request toàn hệ thống.
      if (cinemaId && !candidates?.length) {
        return []
      }

      return getHeroMovies({
        limit: requestedLimit,
        ...(cinemaId && candidates ? { movieIds: [...candidates] } : {}),
      })
    },

    select: (response) =>
      response
        .map(toHomeMovie)
        .filter((movie) => movie !== null)
        .filter((movie) => movie.status === 'NOW_SHOWING'),
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

export function useHomeBookableShowtimes(
  params: MaybeRefOrGetter<GetBookableShowtimesParams | null>,
) {
  const request = computed(() => toValue(params))

  return useQuery({
    queryKey: computed(() => homeQueryKeys.bookableShowtimes(request.value)),
    enabled: computed(() =>
      Boolean(request.value?.cinemaId && request.value.from && request.value.to),
    ),
    retry: false,
    queryFn: ({ queryKey }) => {
      const [, , cinemaId, movieId, from, to] = queryKey

      if (!cinemaId || !from || !to) {
        return []
      }

      return getBookableShowtimes({
        cinemaId,
        from,
        to,
        ...(movieId ? { movieId } : {}),
      })
    },
  })
}

export function useHomeCinemaProgramme(cinemaId: MaybeRefOrGetter<string>) {
  return useCinemaProgrammeQuery(cinemaId)
}
