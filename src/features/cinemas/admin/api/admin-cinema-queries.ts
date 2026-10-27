import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createCinema,
  getManagedCinemas,
  getCinemaById,
  updateCinema,
} from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import type {
  CinemaResponse,
  CreateCinemaRequest,
  UpdateCinemaRequest,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminCinemaKeys = {
  catalog: ['cinemas', 'admin', 'catalog', 'management', 'all'] as const,
  detail: (id: string) => ['cinemas', 'admin', 'detail', id] as const,
}

export function useAdminCinemaCatalogQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery<CinemaResponse[], ApiError>({
    queryKey: adminCinemaKeys.catalog,
    queryFn: () => getManagedCinemas(),
    enabled: computed(() => toValue(enabled)),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminCinemaDetailQuery(
  id: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    CinemaResponse,
    ApiError,
    CinemaResponse,
    ReturnType<typeof adminCinemaKeys.detail>
  >({
    queryKey: computed(() => adminCinemaKeys.detail(toValue(id))),
    queryFn: ({ queryKey }) => getCinemaById(queryKey[3]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(id))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type SaveCinemaVariables =
  | {
      cinemaId: null
      input: CreateCinemaRequest
    }
  | {
      cinemaId: string
      input: UpdateCinemaRequest
    }

export function useSaveAdminCinemaMutation() {
  const queryClient = useQueryClient()

  return useMutation<CinemaResponse, ApiError, SaveCinemaVariables>({
    mutationFn: (variables) => {
      if (variables.cinemaId === null) {
        return createCinema(variables.input)
      }

      return updateCinema(variables.cinemaId, variables.input)
    },
    retry: false,
    onSuccess: (cinema) => {
      if (cinema.id) {
        queryClient.setQueryData(adminCinemaKeys.detail(cinema.id), cinema)
      }

      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['cinemas', 'home', 'booking', 'showtimes', 'rooms'].includes(String(queryKey[0])),
      })
    },
  })
}
