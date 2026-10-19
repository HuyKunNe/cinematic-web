import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createRoomLayoutDraft,
  getRoomLayoutContent,
  getRoomLayoutsByRoom,
  replaceRoomLayoutContent,
} from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type {
  RoomLayoutContentResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'
import {
  adminRoomMatrixKey,
  readAdminRoomMatrix,
  toAdminRoomMatrixRequest,
  validateAdminRoomLayout,
  type AdminRoomMatrixDocument,
} from '../mappers/admin-room-matrix.mapper'

export const adminRoomMatrixKeys = {
  layouts: (roomId: string) => ['room-matrices', 'admin', roomId, 'layouts'] as const,

  content: (roomId: string, layoutId: string) =>
    ['room-matrices', 'admin', roomId, 'content', layoutId] as const,
}

function mergeLayout(previous: RoomLayoutResponse[] | undefined, incoming: RoomLayoutResponse) {
  const existing = previous?.find((item) => item.id === incoming.id)
  const layout = existing && existing.version > incoming.version ? existing : incoming

  return [layout, ...(previous ?? []).filter((item) => item.id !== layout.id)].sort(
    (left, right) => right.layoutVersion - left.layoutVersion,
  )
}

export function useAdminRoomMatrixLayoutsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminRoomMatrixKeys.layouts(toValue(roomId))),
    enabled: computed(() => toValue(enabled) && isRoomSeatUuid(toValue(roomId))),
    queryFn: async ({ queryKey }) => {
      const requestedRoomId = queryKey[2]
      const layouts = await getRoomLayoutsByRoom({ roomId: requestedRoomId })

      if (!Array.isArray(layouts)) {
        throw new Error('Không thể đọc danh sách phiên bản layout.')
      }

      const ids = new Set<string>()

      for (const layout of layouts) {
        validateAdminRoomLayout(layout, requestedRoomId)

        if (ids.has(layout.id)) {
          throw new Error('Danh sách phiên bản layout có dữ liệu trùng.')
        }

        ids.add(layout.id)
      }

      return [...layouts].sort((left, right) => right.layoutVersion - left.layoutVersion)
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomMatrixContentQuery(
  roomId: MaybeRefOrGetter<string>,
  layoutId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminRoomMatrixKeys.content(toValue(roomId), toValue(layoutId))),
    enabled: computed(
      () =>
        toValue(enabled) && isRoomSeatUuid(toValue(roomId)) && isRoomSeatUuid(toValue(layoutId)),
    ),
    queryFn: async ({ queryKey }) => {
      const content = await getRoomLayoutContent(queryKey[4])

      // null means a legacy layout, not an empty matrix.
      readAdminRoomMatrix(content, queryKey[2], queryKey[4])
      return content
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCreateAdminRoomMatrixDraftMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!isRoomSeatUuid(roomId)) {
        throw new Error('Mã phòng không hợp lệ.')
      }

      // Backend defaults this request to an empty 6 × 6 matrix.
      const created = await createRoomLayoutDraft({ roomId })

      validateAdminRoomLayout(created, roomId)

      if (created.status !== 'DRAFT') {
        throw new Error('Không thể xác nhận bản nháp vừa tạo.')
      }

      return created
    },
    retry: false,
    onSuccess: (created) => {
      const key = adminRoomMatrixKeys.layouts(created.roomId)

      queryClient.setQueryData<RoomLayoutResponse[]>(key, (previous) =>
        mergeLayout(previous, created),
      )

      void queryClient.invalidateQueries({
        queryKey: key,
        refetchType: 'none',
      })
    },
  })
}

type SaveMatrixVariables = {
  roomId: string
  layoutId: string
  expectedVersion: number
  document: AdminRoomMatrixDocument
}

export function useSaveAdminRoomMatrixMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: SaveMatrixVariables) => {
      const { roomId, layoutId, expectedVersion, document } = variables

      if (!isRoomSeatUuid(roomId) || !isRoomSeatUuid(layoutId)) {
        throw new Error('Mã phòng hoặc layout không hợp lệ.')
      }

      // Build an independent request before awaiting the network.
      const input = toAdminRoomMatrixRequest(document, expectedVersion)
      const submittedKey = JSON.stringify(input.matrix)

      const saved = await replaceRoomLayoutContent(layoutId, input)
      const savedDocument = readAdminRoomMatrix(saved, roomId, layoutId)

      if (
        saved.layout.status !== 'DRAFT' ||
        saved.layout.version <= expectedVersion ||
        !savedDocument ||
        adminRoomMatrixKey(savedDocument) !== submittedKey
      ) {
        throw new Error('Không thể xác nhận nội dung vừa lưu. Hãy tải lại trước khi lưu tiếp.')
      }

      return saved
    },
    retry: false,
    onSuccess: (saved, variables) => {
      const contentKey = adminRoomMatrixKeys.content(variables.roomId, variables.layoutId)

      queryClient.setQueryData<RoomLayoutContentResponse>(contentKey, (previous) =>
        previous && previous.layout.version > saved.layout.version ? previous : saved,
      )

      const layoutsKey = adminRoomMatrixKeys.layouts(variables.roomId)

      queryClient.setQueryData<RoomLayoutResponse[]>(layoutsKey, (previous) =>
        mergeLayout(previous, saved.layout),
      )

      void queryClient.invalidateQueries({
        queryKey: layoutsKey,
        refetchType: 'none',
      })
    },
  })
}
