import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  getRoomLayoutsByRoom,
  getRoomLayoutContent,
  createRoomLayoutDraft,
} from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type {
  RoomLayoutResponse,
  RoomLayoutGeometryResponse,
  CreateRoomLayoutRequest,
} from '@/services/api/generated/inventory-service/model'
import { isRoomSeatUuid } from '../mappers/admin-seat-catalog.mapper'

export const adminRoomLayoutKeys = {
  list: (roomId: string) => ['room-layouts', 'admin', roomId, 'list'] as const,
  content: (roomId: string, layoutId: string) =>
    ['room-layouts', 'admin', roomId, 'content', layoutId] as const,
}

function validateLayout(layout: RoomLayoutResponse, roomId: string) {
  if (
    !layout ||
    !isRoomSeatUuid(layout.id) ||
    layout.roomId !== roomId ||
    !Number.isSafeInteger(layout.layoutVersion) ||
    layout.layoutVersion < 1 ||
    !Number.isSafeInteger(layout.version) ||
    layout.version < 0 ||
    !['DRAFT', 'PUBLISHED'].includes(layout.status) ||
    !Number.isFinite(layout.canvasWidth) ||
    layout.canvasWidth <= 0 ||
    !Number.isFinite(layout.canvasHeight) ||
    layout.canvasHeight <= 0 ||
    !Number.isFinite(Date.parse(layout.createdAt)) ||
    !Number.isFinite(Date.parse(layout.updatedAt))
  ) {
    throw new Error('Thông tin phiên bản sơ đồ không hợp lệ. Hãy tải lại.')
  }
}

function validateGeometry(geometry: RoomLayoutGeometryResponse) {
  if (
    !geometry ||
    ![geometry.x, geometry.y, geometry.width, geometry.height, geometry.rotationDegrees].every(
      Number.isFinite,
    ) ||
    geometry.width <= 0 ||
    geometry.height <= 0
  ) {
    throw new Error('Geometry của sơ đồ không hợp lệ. Hãy tải lại.')
  }
}

export function useAdminRoomLayoutsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminRoomLayoutKeys.list(toValue(roomId))),
    enabled: computed(() => toValue(enabled) && isRoomSeatUuid(toValue(roomId))),
    queryFn: async ({ queryKey }) => {
      const items = await getRoomLayoutsByRoom({ roomId: queryKey[2] })

      if (!Array.isArray(items)) {
        throw new Error('Không thể đọc danh sách phiên bản sơ đồ.')
      }

      const ids = new Set<string>()

      for (const layout of items) {
        validateLayout(layout, queryKey[2])

        if (ids.has(layout.id)) {
          throw new Error('Danh sách phiên bản sơ đồ có dữ liệu trùng lặp.')
        }

        ids.add(layout.id)
      }

      return [...items].sort((a, b) => b.layoutVersion - a.layoutVersion)
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomLayoutContentQuery(
  roomId: MaybeRefOrGetter<string>,
  layoutId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminRoomLayoutKeys.content(toValue(roomId), toValue(layoutId))),
    enabled: computed(
      () =>
        toValue(enabled) && isRoomSeatUuid(toValue(roomId)) && isRoomSeatUuid(toValue(layoutId)),
    ),
    queryFn: async ({ queryKey }) => {
      const content = await getRoomLayoutContent(queryKey[4])

      if (
        !content ||
        content.layout?.id !== queryKey[4] ||
        !Array.isArray(content.seats) ||
        !Array.isArray(content.elements)
      ) {
        throw new Error('Nội dung sơ đồ không hợp lệ. Hãy tải lại.')
      }

      validateLayout(content.layout, queryKey[2])

      const keys = new Set<string>()
      const seatIds = new Set<string>()

      for (const seat of content.seats) {
        const key = `seat:${seat.id}`

        if (
          !isRoomSeatUuid(seat.id) ||
          !isRoomSeatUuid(seat.seatId) ||
          typeof seat.seatNumberSnapshot !== 'string' ||
          !seat.seatNumberSnapshot.trim() ||
          typeof seat.rowLabelSnapshot !== 'string' ||
          !seat.rowLabelSnapshot.trim() ||
          !['STANDARD', 'VIP', 'COUPLE', 'ACCESSIBLE'].includes(seat.seatTypeSnapshot) ||
          keys.has(key) ||
          seatIds.has(seat.seatId)
        ) {
          throw new Error('Snapshot ghế trong sơ đồ không hợp lệ.')
        }

        keys.add(key)
        seatIds.add(seat.seatId)
        validateGeometry(seat.geometry)
      }

      for (const element of content.elements) {
        const key = `element:${element.id}`

        if (
          !isRoomSeatUuid(element.id) ||
          !['SCREEN', 'AISLE', 'EXIT'].includes(element.kind) ||
          (element.label != null && typeof element.label !== 'string') ||
          keys.has(key)
        ) {
          throw new Error('Phần tử không gian trong sơ đồ không hợp lệ.')
        }

        keys.add(key)
        validateGeometry(element.geometry)
      }

      return content
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
export function useCreateAdminRoomLayoutDraftMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateRoomLayoutRequest) => {
      const created = await createRoomLayoutDraft(input)

      validateLayout(created, input.roomId)

      if (
        created.status !== 'DRAFT' ||
        created.canvasWidth !== input.canvasWidth ||
        created.canvasHeight !== input.canvasHeight
      ) {
        throw new Error('Không thể xác nhận bản nháp vừa tạo. Hãy tải lại danh sách phiên bản.')
      }

      return created
    },
    retry: false,
    onSuccess: (created) => {
      const listKey = adminRoomLayoutKeys.list(created.roomId)

      queryClient.setQueryData<RoomLayoutResponse[]>(listKey, (previous) =>
        [created, ...(previous ?? []).filter((layout) => layout.id !== created.id)].sort(
          (a, b) => b.layoutVersion - a.layoutVersion,
        ),
      )

      void queryClient.invalidateQueries({
        queryKey: listKey,
        refetchType: 'none',
      })
    },
  })
}
