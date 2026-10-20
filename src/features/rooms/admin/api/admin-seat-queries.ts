import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getRoomPublishedSeatMap } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import { updateSeatActiveState } from '@/services/api/generated/inventory-service/seat-controller/seat-controller'
import { mapAdminPublishedSeats } from '../mappers/admin-published-seat-map.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { isAdminRoomApiError } from '../schemas/admin-room.schema'

export const adminSeatKeys = {
  list: (roomId: string) => ['room-matrices', 'admin', roomId, 'published-seat-map'] as const,
}

export function useAdminRoomSeatsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminSeatKeys.list(toValue(roomId))),
    enabled: computed(() => toValue(enabled) && isRoomSeatUuid(toValue(roomId))),
    queryFn: async ({ queryKey }) => {
      const requestedRoomId = queryKey[2]

      try {
        const response = await getRoomPublishedSeatMap({
          roomId: requestedRoomId,
        })

        return mapAdminPublishedSeats(response, requestedRoomId)
      } catch (error) {
        // Endpoint không chỉ định layoutId:
        // mã lỗi này nghĩa là phòng chưa có phiên bản đã publish.
        if (
          isAdminRoomApiError(error) &&
          error.status === 404 &&
          error.code === 'INVENTORY_ROOM_LAYOUT_NOT_FOUND'
        ) {
          return null
        }

        throw error
      }
    },
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type SetSeatActivityVariables = {
  roomId: string
  seatId: string
  active: boolean
}

export function useSetAdminSeatActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, seatId, active }: SetSeatActivityVariables) => {
      if (!isRoomSeatUuid(roomId) || !isRoomSeatUuid(seatId) || typeof active !== 'boolean') {
        throw new Error('Thông tin ghế cần cập nhật không hợp lệ.')
      }

      const updated = await updateSeatActiveState(seatId, {
        roomId,
        active,
      })

      if (
        !updated ||
        updated.seatId !== seatId ||
        updated.roomId !== roomId ||
        updated.active !== active
      ) {
        throw new Error('Chưa xác nhận được kết quả cập nhật ghế. Hãy tải lại sơ đồ.')
      }

      return updated
    },
    retry: false,

    // Đọc lại cả khi request thất bại vì máy chủ có thể đã xử lý.
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({
        queryKey: adminSeatKeys.list(variables.roomId),
        exact: true,
      }),
  })
}
