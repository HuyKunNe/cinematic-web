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
        (value) => value === current?.seatType,
      )

      if (
        !current ||
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

      const updated = await update1(seatId, {
        seatNumber: current.seatNumber,
        rowLabel: current.rowLabel,
        seatType,
        active,
      })

      if (
        !updated ||
        updated.id !== seatId ||
        updated.roomId !== roomId ||
        updated.active !== active ||
        updated.seatType !== seatType ||
        updated.seatNumber !== current.seatNumber ||
        updated.rowLabel !== current.rowLabel
      ) {
        throw new Error('Không thể xác nhận kết quả cập nhật ghế. ' + 'Hãy kiểm tra lại danh sách.')
      }

      return updated
    },

    retry: false,

    // Đọc lại dữ liệu cả khi thành công hoặc gặp lỗi:
    // request có thể đã được xử lý trước khi mất phản hồi.
    onSettled: () =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['seats', 'rooms', 'showtimes', 'booking', 'home'].includes(String(queryKey[0])),
      }),
  })
}
