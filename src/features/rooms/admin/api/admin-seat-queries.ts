import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createRange,
  getManagedSeats,
  getById1,
  update1,
} from '@/services/api/generated/inventory-service/seat-controller/seat-controller'
import type {
  CreateSeatRangeRequest,
  SeatResponse,
} from '@/services/api/generated/inventory-service/model'
import { UpdateSeatRequestSeatType } from '@/services/api/generated/inventory-service/model'

export const adminSeatKeys = {
  list: (roomId: string) => ['seats', 'admin', 'room', roomId, 'management', 'all'] as const,
}

export function useAdminRoomSeatsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<SeatResponse[], unknown, SeatResponse[], ReturnType<typeof adminSeatKeys.list>>({
    queryKey: computed(() => adminSeatKeys.list(toValue(roomId))),
    queryFn: ({ queryKey }) => getManagedSeats({ roomId: queryKey[3] }),
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
type SetSeatActivityVariables = {
  roomId: string
  seatId: string
  active: boolean
}

export function useSetAdminSeatActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation<SeatResponse, unknown, SetSeatActivityVariables>({
    mutationFn: async ({ roomId, seatId, active }) => {
      const current = await getById1(seatId)
      const seatType = Object.values(UpdateSeatRequestSeatType).find(
        (value) => value === current.seatType,
      )

      if (
        current.id !== seatId ||
        current.roomId !== roomId ||
        typeof current.active !== 'boolean' ||
        typeof current.seatNumber !== 'string' ||
        !current.seatNumber.trim() ||
        typeof current.rowLabel !== 'string' ||
        !current.rowLabel.trim() ||
        !seatType
      ) {
        throw new Error('Thông tin ghế không hợp lệ. Hãy tải lại danh sách.')
      }

      if (current.active === active) return current

      return update1(seatId, {
        seatNumber: current.seatNumber,
        rowLabel: current.rowLabel,
        seatType,
        active,
      })
    },
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['seats', 'rooms', 'showtimes', 'booking', 'home'].includes(
            String(queryKey[0]),
          ),
      }),
  })
}