import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createRange,
  getActiveSeats,
} from '@/services/api/generated/inventory-service/seat-controller/seat-controller'
import type {
  CreateSeatRangeRequest,
  SeatResponse,
} from '@/services/api/generated/inventory-service/model'

export const adminSeatKeys = {
  list: (roomId: string) => ['seats', 'admin', 'room', roomId] as const,
}

export function useAdminRoomSeatsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<SeatResponse[], unknown, SeatResponse[], ReturnType<typeof adminSeatKeys.list>>({
    queryKey: computed(() => adminSeatKeys.list(toValue(roomId))),
    queryFn: ({ queryKey }) => getActiveSeats({ roomId: queryKey[3] }),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type CreateSeatRangeVariables = {
  roomId: string
  input: CreateSeatRangeRequest
}

export function useCreateAdminSeatRangeMutation() {
  const queryClient = useQueryClient()

  return useMutation<SeatResponse[], unknown, CreateSeatRangeVariables>({
    mutationFn: ({ roomId, input }) => createRange(input, { roomId }),
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['seats', 'rooms', 'showtimes', 'booking', 'home'].includes(String(queryKey[0])),
      }),
  })
}
