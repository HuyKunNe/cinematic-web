import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  create1,
  findById1,
  update1,
} from '@/services/api/generated/movie-service/genre-controller/genre-controller'
import type {
  CreateGenreRequest,
  GenreResponse,
} from '@/services/api/generated/movie-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminGenreKeys = {
  detail: (id: string) => ['movies', 'admin', 'genre', id] as const,
}

export function useAdminGenreDetailQuery(
  id: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<GenreResponse, ApiError, GenreResponse, ReturnType<typeof adminGenreKeys.detail>>(
    {
      queryKey: computed(() => adminGenreKeys.detail(toValue(id))),
      queryFn: ({ queryKey }) => findById1(queryKey[3]),
      enabled: computed(() => toValue(enabled) && Boolean(toValue(id))),
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      retry: false,
    },
  )
}

type SaveAdminGenreVariables = {
  genreId: string | null
  input: CreateGenreRequest
}

export function useSaveAdminGenreMutation() {
  const queryClient = useQueryClient()

  return useMutation<GenreResponse, ApiError, SaveAdminGenreVariables>({
    mutationFn: ({ genreId, input }) => (genreId ? update1(genreId, input) : create1(input)),

    retry: false,

    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['movies', 'home', 'booking'].some((root) => queryKey[0] === root),
      })
    },
  })
}
