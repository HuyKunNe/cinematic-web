import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createRoomLayoutDraft,
  getRoomLayoutContent,
  getRoomLayoutsByRoom,
  publishRoomLayout,
  replaceRoomLayoutContent,
} from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import type {
  CreateRoomLayoutRequest,
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
  RoomLayoutResponse,
} from '@/services/api/generated/inventory-service/model'

export const adminRoomLayoutKeys = {
  list: (roomId: string) => ['room-layouts', 'admin', 'room', roomId] as const,
  content: (layoutId: string) => ['room-layouts', 'admin', 'content', layoutId] as const,
}

export function useAdminRoomLayoutsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    RoomLayoutResponse[],
    unknown,
    RoomLayoutResponse[],
    ReturnType<typeof adminRoomLayoutKeys.list>
  >({
    queryKey: computed(() => adminRoomLayoutKeys.list(toValue(roomId))),
    queryFn: ({ queryKey }) => getRoomLayoutsByRoom({ roomId: queryKey[3] }),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomLayoutContentQuery(
  layoutId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    RoomLayoutContentResponse,
    unknown,
    RoomLayoutContentResponse,
    ReturnType<typeof adminRoomLayoutKeys.content>
  >({
    queryKey: computed(() => adminRoomLayoutKeys.content(toValue(layoutId))),
    queryFn: ({ queryKey }) => getRoomLayoutContent(queryKey[3]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(layoutId))),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomLayoutMutations() {
  const queryClient = useQueryClient()

  function refreshList(layout: RoomLayoutResponse) {
    return queryClient.invalidateQueries({
      queryKey: adminRoomLayoutKeys.list(layout.roomId),
    })
  }

  const create = useMutation<RoomLayoutResponse, unknown, CreateRoomLayoutRequest>({
    mutationFn: createRoomLayoutDraft,
    retry: false,
    onSuccess: (layout) => {
      queryClient.setQueryData<RoomLayoutContentResponse>(
        adminRoomLayoutKeys.content(layout.id),
        { layout, seats: [], elements: [] },
      )
      return refreshList(layout)
    },
  })

  const save = useMutation<
    RoomLayoutContentResponse,
    unknown,
    { layoutId: string; input: ReplaceRoomLayoutContentRequest }
  >({
    mutationFn: ({ layoutId, input }) => replaceRoomLayoutContent(layoutId, input),
    retry: false,
    onSuccess: (content) => {
      queryClient.setQueryData(
        adminRoomLayoutKeys.content(content.layout.id),
        content,
      )
      return refreshList(content.layout)
    },
  })

  const publish = useMutation<
    RoomLayoutResponse,
    unknown,
    { layoutId: string; expectedVersion: number }
  >({
    mutationFn: ({ layoutId, expectedVersion }) =>
      publishRoomLayout(layoutId, { expectedVersion }),
    retry: false,
    onSuccess: (layout) => {
      queryClient.setQueryData<RoomLayoutContentResponse>(
        adminRoomLayoutKeys.content(layout.id),
        (content) => (content ? { ...content, layout } : content),
      )
      return refreshList(layout)
    },
  })

  return { create, save, publish }
}