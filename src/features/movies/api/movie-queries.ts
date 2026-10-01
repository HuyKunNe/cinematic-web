import { useQuery } from '@tanstack/vue-query'
import { findAll } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { CatalogMovie } from '../models/movie.model'
import { toCatalogMovie } from '../mappers/movie.mapper'

export const moviesQueryKeys = {
  catalog: ['movies', 'catalog'] as const,
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
