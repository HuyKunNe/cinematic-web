import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  findAll,
  findById,
} from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { ApiError } from '@/services/http/api-error'
import type { CatalogMovie, MovieDetail } from '../models/movie.model'
import { toCatalogMovie, toMovieDetail } from '../mappers/movie.mapper'

export const moviesQueryKeys = {
  catalog: ['movies', 'catalog'] as const,
  detail: (movieId: string) => ['movies', 'detail', movieId] as const,
}

function mapMovieCatalog(response: MovieResponse[]): CatalogMovie[] {
  const movies: CatalogMovie[] = []

  for (const item of response) {
    const movie = toCatalogMovie(item)

    if (movie) movies.push(movie)
  }

  return movies
}

export function useMoviesQuery() {
  return useQuery({
    queryKey: moviesQueryKeys.catalog,
    queryFn: () => findAll(),
    select: mapMovieCatalog,
  })
}

export function useMovieDetailQuery(movieId: MaybeRefOrGetter<string>) {
  return useQuery<
    MovieResponse,
    ApiError,
    MovieDetail | null,
    ReturnType<typeof moviesQueryKeys.detail>
  >({
    queryKey: computed(() => moviesQueryKeys.detail(toValue(movieId))),
    enabled: computed(() => Boolean(toValue(movieId))),
    queryFn: ({ queryKey }) => findById(queryKey[2]),
    select: toMovieDetail,
    retry: false,
  })
}
