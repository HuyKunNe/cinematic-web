import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getRoomPublishedSeatMap } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import { updateSeatActiveState } from '@/services/api/generated/inventory-service/seat-controller/seat-controller'
import { mapAdminPublishedSeats } from '../mappers/admin-published-seat-map.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { isAdminRoomApiError } from '../schemas/admin-room.schema'

export const adminSeatKeys = {
  list: (roomId: string) => ['room-matrices', 'admin', roomId, 'published-seat-map'] as const,

  version: (roomId: string, layoutId: string) =>
    ['room-matrices', 'admin', roomId, 'published-seat-map', layoutId] as const,
}

export function useAdminRoomSeatsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
  layoutId: MaybeRefOrGetter<string> = '',
) {
  return useQuery({
    queryKey: computed(() => adminSeatKeys.version(toValue(roomId), toValue(layoutId))),
    enabled: computed(
      () =>
        toValue(enabled) &&
        isRoomSeatUuid(toValue(roomId)) &&
        (toValue(layoutId) === '' || isRoomSeatUuid(toValue(layoutId))),
    ),
    queryFn: async ({ queryKey }) => {
      const requestedRoomId = queryKey[2]
      const requestedLayoutId = queryKey[4]

      if (
        !isRoomSeatUuid(requestedRoomId) ||
        (requestedLayoutId !== '' && !isRoomSeatUuid(requestedLayoutId))
      ) {
        throw new Error('Mã phòng hoặc phiên bản sơ đồ không hợp lệ.')
      }

      try {
        const response = await getRoomPublishedSeatMap({
          roomId: requestedRoomId,
          ...(requestedLayoutId ? { layoutId: requestedLayoutId } : {}),
        })

        const matrix = mapAdminPublishedSeats(response, requestedRoomId)

        if (requestedLayoutId && matrix.layout.id !== requestedLayoutId) {
          throw new Error('Sơ đồ trả về không đúng phiên bản đang chọn. Hãy tải lại.')
        }

        return matrix
      } catch (error) {
        // Chỉ coi là chưa có sơ đồ khi đang yêu cầu bản mới nhất.
        // Phiên bản được chọn cụ thể bị lỗi thì giữ nguyên lỗi đó.
        if (
          !requestedLayoutId &&
          isAdminRoomApiError(error) &&
          error.status === 404 &&
          error.code === 'INVENTORY_ROOM_LAYOUT_NOT_FOUND'
        ) {
          return null
        }

        throw error
      }
    },
    placeholderData: () => undefined,
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
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({
        // Bao gồm bản mới nhất và các phiên bản cụ thể.
        queryKey: adminSeatKeys.list(variables.roomId),
      }),
  })
}
