import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { deleteRoomLayoutDraft } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type { AdminRoomLayout } from '../mappers/admin-room-matrix.mapper'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import { adminRoomMatrixKeys } from './admin-room-matrix-queries'

export function useDeleteAdminRoomMatrixDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: { roomId: string; layoutId: string; expectedVersion: number }) => {
      if (
        !isRoomSeatUuid(input.roomId) || !isRoomSeatUuid(input.layoutId) ||
        !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0
      ) throw new Error('Thông tin bản nháp cần xóa không hợp lệ.')
      await deleteRoomLayoutDraft(input.layoutId, { expectedVersion: input.expectedVersion })
    },
    onSuccess: (_data, input) => {
      const key = adminRoomMatrixKeys.layouts(input.roomId)
      queryClient.setQueryData<AdminRoomLayout[]>(key, (previous) =>
        previous?.filter((layout) => layout.id !== input.layoutId),
      )
      queryClient.removeQueries({
        queryKey: adminRoomMatrixKeys.content(input.roomId, input.layoutId), exact: true,
      })
      void queryClient.invalidateQueries({ queryKey: key, refetchType: 'none' })
    },
  })
}
