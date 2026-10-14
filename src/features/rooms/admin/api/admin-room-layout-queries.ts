import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  getRoomLayoutsByRoom,
  getRoomLayoutContent,
  createRoomLayoutDraft,
  replaceRoomLayoutContent,
  publishRoomLayout,
} from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type {
  RoomLayoutResponse,
  RoomLayoutGeometryResponse,
  CreateRoomLayoutRequest,
  RoomLayoutContentResponse,
  ReplaceRoomLayoutContentRequest,
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

function validateContent(content: RoomLayoutContentResponse, roomId: string, layoutId: string) {
  if (
    !content ||
    content.layout?.id !== layoutId ||
    !Array.isArray(content.seats) ||
    !Array.isArray(content.elements)
  ) {
    throw new Error('Nội dung sơ đồ không hợp lệ. Hãy tải lại.')
  }

  validateLayout(content.layout, roomId)

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
    queryFn: async ({ queryKey }) =>
      validateContent(await getRoomLayoutContent(queryKey[4]), queryKey[2], queryKey[4]),
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
type ReplaceAdminRoomLayoutVariables = {
  roomId: string
  layoutId: string
  input: ReplaceRoomLayoutContentRequest
}

export function useReplaceAdminRoomLayoutContentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, layoutId, input }: ReplaceAdminRoomLayoutVariables) => {
      const saved = validateContent(
        await replaceRoomLayoutContent(layoutId, input),
        roomId,
        layoutId,
      )

      const expectedSeatIds = new Set(input.seats.map((seat) => seat.seatId))

      if (
        saved.layout.status !== 'DRAFT' ||
        saved.layout.version <= input.expectedVersion ||
        saved.seats.length !== input.seats.length ||
        saved.elements.length !== input.elements.length ||
        saved.seats.some((seat) => !expectedSeatIds.has(seat.seatId))
      ) {
        throw new Error(
          'Không thể xác nhận kết quả lưu. Hãy tải lại nội dung trước khi thao tác tiếp.',
        )
      }

      return saved
    },
    retry: false,
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(
        adminRoomLayoutKeys.content(variables.roomId, variables.layoutId),
        saved,
      )

      const listKey = adminRoomLayoutKeys.list(variables.roomId)

      queryClient.setQueryData<RoomLayoutResponse[]>(listKey, (previous) =>
        [saved.layout, ...(previous ?? []).filter((layout) => layout.id !== saved.layout.id)].sort(
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
type PublishAdminRoomLayoutVariables = {
  roomId: string
  layoutId: string
  expectedVersion: number
}

export function usePublishAdminRoomLayoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roomId,
      layoutId,
      expectedVersion,
    }: PublishAdminRoomLayoutVariables) => {
      const published = await publishRoomLayout(layoutId, {
        expectedVersion,
      })

      validateLayout(published, roomId)

      if (
        published.id !== layoutId ||
        published.status !== 'PUBLISHED' ||
        published.version <= expectedVersion ||
        !published.publishedAt ||
        !Number.isFinite(Date.parse(published.publishedAt))
      ) {
        throw new Error(
          'Không thể xác nhận kết quả xuất bản. Hãy tải lại nội dung.',
        )
      }

      return published
    },
    retry: false,
    onSuccess: (published, variables) => {
      const contentKey = adminRoomLayoutKeys.content(
        variables.roomId,
        variables.layoutId,
      )
      const listKey = adminRoomLayoutKeys.list(variables.roomId)

      // Publication changes metadata, not seat/element content.
      queryClient.setQueryData<RoomLayoutContentResponse>(
        contentKey,
        (previous) =>
          previous?.layout.id === published.id
            ? { ...previous, layout: published }
            : undefined,
      )

      queryClient.setQueryData<RoomLayoutResponse[]>(listKey, (previous) =>
        [
          published,
          ...(previous ?? []).filter((item) => item.id !== published.id),
        ].sort((a, b) => b.layoutVersion - a.layoutVersion),
      )

      for (const queryKey of [contentKey, listKey]) {
        void queryClient.invalidateQueries({
          queryKey,
          refetchType: 'none',
        })
      }
    },
  })
}
