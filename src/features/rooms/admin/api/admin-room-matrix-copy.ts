import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createRoomLayoutDraftFromPublished } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import {
  adminRoomMatrixKey,
  readAdminRoomMatrix,
  toAdminRoomMatrixRequest,
  validateAdminRoomLayout,
  validateAdminRoomLayoutContent,
  type AdminRoomLayout,
  type AdminRoomLayoutContent,
  type AdminRoomMatrixDocument,
} from '../mappers/admin-room-matrix.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomMatrixKeys } from './admin-room-matrix-queries'

type CopyMatrixVariables = {
  roomId: string
  source: AdminRoomLayout
  document: AdminRoomMatrixDocument
}

export function useCopyAdminRoomMatrixDraftMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, source, document }: CopyMatrixVariables) => {
      if (!isRoomSeatUuid(roomId)) {
        throw new Error('Mã phòng không hợp lệ.')
      }

      validateAdminRoomLayout(source, roomId)

      if (source.status !== 'PUBLISHED') {
        throw new Error('Chỉ tạo bản sao từ phiên bản đã xuất bản.')
      }

      // Tạo snapshot độc lập trước khi chờ mạng.
      const input = toAdminRoomMatrixRequest(document, source.version)
      const matrix = input.matrix

      if (
        !matrix ||
        matrix.seats.length === 0 ||
        matrix.seats.some((seat) => !isRoomSeatUuid(seat.seatId))
      ) {
        throw new Error('Phiên bản nguồn chưa có đầy đủ liên kết ghế. Hãy tải lại.')
      }

      const sourceId = source.id
      const sourceLayoutVersion = source.layoutVersion
      const sourceKey = JSON.stringify(matrix)

      const response = await createRoomLayoutDraftFromPublished(sourceId, {
        expectedVersion: source.version,
      })

      if (!response?.layout || !isRoomSeatUuid(response.layout.id)) {
        throw new Error('Chưa xác nhận được bản nháp vừa tạo. Hãy tải lại danh sách phiên bản.')
      }

      const copied = validateAdminRoomLayoutContent(response, roomId, response.layout.id)
      const copiedDocument = readAdminRoomMatrix(copied, roomId, copied.layout.id)

      if (
        copied.layout.id === sourceId ||
        copied.layout.status !== 'DRAFT' ||
        copied.layout.layoutVersion <= sourceLayoutVersion ||
        copied.layout.publishedAt != null ||
        !copiedDocument ||
        adminRoomMatrixKey(copiedDocument) !== sourceKey
      ) {
        throw new Error('Chưa xác nhận được nội dung bản sao. Hãy tải lại danh sách phiên bản.')
      }

      return {
        content: copied,
        document: copiedDocument,
      }
    },
    retry: false,
    onSuccess: ({ content }, variables) => {
      const contentKey = adminRoomMatrixKeys.content(variables.roomId, content.layout.id)

      queryClient.setQueryData<AdminRoomLayoutContent>(contentKey, (previous) =>
        previous && previous.layout.version > content.layout.version ? previous : content,
      )

      const layoutsKey = adminRoomMatrixKeys.layouts(variables.roomId)

      queryClient.setQueryData<AdminRoomLayout[]>(layoutsKey, (previous) => {
        const existing = previous?.find((layout) => layout.id === content.layout.id)

        const incoming =
          existing && existing.version > content.layout.version ? existing : content.layout

        return [incoming, ...(previous ?? []).filter((layout) => layout.id !== incoming.id)].sort(
          (left, right) => right.layoutVersion - left.layoutVersion,
        )
      })

      void queryClient.invalidateQueries({
        queryKey: layoutsKey,
        refetchType: 'none',
      })
    },
  })
}
