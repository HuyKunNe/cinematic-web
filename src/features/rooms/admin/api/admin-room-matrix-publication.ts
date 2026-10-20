import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { publishRoomLayout } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type { RoomLayoutResponse } from '@/services/api/generated/inventory-service/model'
import { validateAdminRoomLayout } from '../mappers/admin-room-matrix.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomMatrixKeys } from './admin-room-matrix-queries'

type PublishMatrixVariables = {
  roomId: string
  layoutId: string
  expectedVersion: number
}

export function usePublishAdminRoomMatrixMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, layoutId, expectedVersion }: PublishMatrixVariables) => {
      if (
        !isRoomSeatUuid(roomId) ||
        !isRoomSeatUuid(layoutId) ||
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 0
      ) {
        throw new Error('Thông tin phiên bản cần xuất bản không hợp lệ.')
      }

      const published = await publishRoomLayout(layoutId, {
        expectedVersion,
      })

      validateAdminRoomLayout(published, roomId, layoutId)

      if (
        published.status !== 'PUBLISHED' ||
        published.version <= expectedVersion ||
        !Number.isFinite(Date.parse(published.publishedAt ?? ''))
      ) {
        throw new Error(
          'Chưa xác nhận được kết quả xuất bản. Hãy tải lại phiên bản trước khi tiếp tục.',
        )
      }

      return published
    },
    retry: false,
    onSuccess: (published, variables) => {
      const layoutsKey = adminRoomMatrixKeys.layouts(variables.roomId)

      queryClient.setQueryData<RoomLayoutResponse[]>(layoutsKey, (previous) => {
        const existing = previous?.find((layout) => layout.id === published.id)
        const incoming = existing && existing.version > published.version ? existing : published

        return [incoming, ...(previous ?? []).filter((layout) => layout.id !== incoming.id)].sort(
          (left, right) => right.layoutVersion - left.layoutVersion,
        )
      })

      // Publish trả metadata, không trả content có các seatId vừa được gắn.
      // Trang sẽ chủ động đọc lại content trước khi hiển thị kết quả.
      void queryClient.invalidateQueries({
        queryKey: adminRoomMatrixKeys.content(variables.roomId, variables.layoutId),
        refetchType: 'none',
      })

      void queryClient.invalidateQueries({
        queryKey: layoutsKey,
        refetchType: 'none',
      })
    },
  })
}
