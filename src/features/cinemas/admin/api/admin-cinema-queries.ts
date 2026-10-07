import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  create3,
  getActiveCinemas,
  getById3,
  update3,
} from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import type {
  CinemaResponse,
  CreateCinemaRequest,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminCinemaKeys = {
  catalog: ['cinemas', 'admin', 'catalog', 'active'] as const,
  detail: (id: string) => ['cinemas', 'admin', 'detail', id] as const,
}

export function useAdminCinemaCatalogQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery<CinemaResponse[], ApiError>({
    queryKey: adminCinemaKeys.catalog,
    queryFn: () => getActiveCinemas(),
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
    queryFn: ({ queryKey }) => getById3(queryKey[3]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(id))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type SaveCinemaVariables = {
  cinemaId: string | null
  input: CreateCinemaRequest
}

export function useSaveAdminCinemaMutation() {
  const queryClient = useQueryClient()

  return useMutation<CinemaResponse, ApiError, SaveCinemaVariables>({
    mutationFn: async ({ cinemaId, input }) => {
      if (!cinemaId) return create3(input)

      // UpdateCinemaRequest bắt buộc active.
      // Đọc lại để giữ trạng thái hiện có, không tự kích hoạt rạp.
      const current = await getById3(cinemaId)

      if (current.id !== cinemaId || typeof current.active !== 'boolean') {
        throw new Error('Không nhận được trạng thái rạp hợp lệ. Hãy mở lại form.')
      }

      return update3(cinemaId, { ...input, active: current.active })
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
