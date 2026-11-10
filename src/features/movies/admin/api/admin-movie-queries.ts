import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createMovie,
  findMovieById,
  findCatalog,
  updateMovie,
} from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { findAll as getGenres } from '@/services/api/generated/movie-service/genre-controller/genre-controller'
import type {
  CreateMovieRequest,
  GenreResponse,
  FindCatalogParams,
  MovieResponse,
  PageResponseMovieResponse,
  UpdateMovieRequest,
} from '@/services/api/generated/movie-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminMovieKeys = {
  catalog: (params: FindCatalogParams) => ['movies', 'admin', 'catalog', params] as const,
  detail: (id: string) => ['movies', 'admin', 'detail', id] as const,
  genres: ['movies', 'admin', 'genres'] as const,
}

export function useAdminMovieCatalogQuery(
  params: MaybeRefOrGetter<FindCatalogParams>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    PageResponseMovieResponse,
    ApiError,
    PageResponseMovieResponse,
    ReturnType<typeof adminMovieKeys.catalog>
  >({
    queryKey: computed(() => adminMovieKeys.catalog(toValue(params))),
    queryFn: ({ queryKey }) => findCatalog(queryKey[3]),
    enabled: computed(() => toValue(enabled)),
    retry: false,
  })
}

export function useAdminMovieGenresQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery<GenreResponse[], ApiError>({
    queryKey: adminMovieKeys.genres,
    queryFn: () => getGenres(),
    enabled: computed(() => toValue(enabled)),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  })
}

export function useAdminMovieDetailQuery(
  id: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<MovieResponse, ApiError, MovieResponse, ReturnType<typeof adminMovieKeys.detail>>(
    {
      queryKey: computed(() => adminMovieKeys.detail(toValue(id))),
      queryFn: ({ queryKey }) => findMovieById(queryKey[3]),
      enabled: computed(() => toValue(enabled) && Boolean(toValue(id))),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  )
}

export type SaveAdminMovieVariables =
  { movieId: null; input: CreateMovieRequest } | { movieId: string; input: UpdateMovieRequest }

export function useSaveAdminMovieMutation() {
  const queryClient = useQueryClient()

  return useMutation<MovieResponse, ApiError, SaveAdminMovieVariables>({
    mutationFn: (variables) =>
      variables.movieId === null
        ? createMovie(variables.input)
        : updateMovie(variables.movieId, variables.input),

    retry: false,

    onSuccess: (movie) => {
      if (movie.id) queryClient.setQueryData(adminMovieKeys.detail(movie.id), movie)
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['movies', 'home', 'booking', 'showtimes'].some((root) => queryKey[0] === root),
      })
    },
  })
}
