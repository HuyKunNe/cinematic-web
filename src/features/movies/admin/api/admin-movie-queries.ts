import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  create,
  findById,
  getMovieCatalog,
  update,
} from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { findAll1 as getGenres } from '@/services/api/generated/movie-service/genre-controller/genre-controller'
import type {
  CreateMovieRequest,
  GenreResponse,
  GetMovieCatalogParams,
  MovieResponse,
  PageResponseMovieResponse,
} from '@/services/api/generated/movie-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminMovieKeys = {
  catalog: (params: GetMovieCatalogParams) => ['movies', 'admin', 'catalog', params] as const,
  detail: (id: string) => ['movies', 'admin', 'detail', id] as const,
  genres: ['movies', 'admin', 'genres'] as const,
}

export function useAdminMovieCatalogQuery(
  params: MaybeRefOrGetter<GetMovieCatalogParams>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    PageResponseMovieResponse,
    ApiError,
    PageResponseMovieResponse,
    ReturnType<typeof adminMovieKeys.catalog>
  >({
    queryKey: computed(() => adminMovieKeys.catalog(toValue(params))),
    queryFn: ({ queryKey }) => getMovieCatalog(queryKey[3]),
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
      queryFn: ({ queryKey }) => findById(queryKey[3]),
      enabled: computed(() => toValue(enabled) && Boolean(toValue(id))),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  )
}

type SaveAdminMovieVariables = {
  movieId: string | null
  input: CreateMovieRequest
}

export function useSaveAdminMovieMutation() {
  const queryClient = useQueryClient()

  return useMutation<MovieResponse, ApiError, SaveAdminMovieVariables>({
    mutationFn: ({ movieId, input }) => (movieId ? update(movieId, input) : create(input)),

    retry: false,

    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['movies', 'home', 'booking'].some((root) => queryKey[0] === root),
      })
    },
  })
}
