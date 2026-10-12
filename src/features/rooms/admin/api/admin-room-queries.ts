import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getManagedCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  create2,
  getManagedRooms,
  getById2,
  update2,
} from '@/services/api/generated/inventory-service/room-controller/room-controller'
import type {
  CinemaResponse,
  CreateRoomRequest,
  RoomResponse,
} from '@/services/api/generated/inventory-service/model'
import { adminRoomSchema } from '../schemas/admin-room.schema'

export const adminRoomKeys = {
  cinemas: ['cinemas', 'admin', 'rooms', 'management', 'all'] as const,
  catalog: (cinemaId: string) =>
    ['rooms', 'admin', 'catalog', cinemaId, 'management', 'all'] as const,
  detail: (roomId: string) => ['rooms', 'admin', 'detail', roomId] as const,
}

export function useAdminRoomCinemaQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery<CinemaResponse[], unknown>({
    queryKey: adminRoomKeys.cinemas,
    queryFn: () => getManagedCinemas(),
    enabled: computed(() => toValue(enabled)),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomCatalogQuery(
  cinemaId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    RoomResponse[],
    unknown,
    RoomResponse[],
    ReturnType<typeof adminRoomKeys.catalog>
  >({
    queryKey: computed(() => adminRoomKeys.catalog(toValue(cinemaId))),
    queryFn: ({ queryKey }) => getManagedRooms({ cinemaId: queryKey[3] }),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(cinemaId))),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRoomDetailQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<RoomResponse, unknown, RoomResponse, ReturnType<typeof adminRoomKeys.detail>>({
    queryKey: computed(() => adminRoomKeys.detail(toValue(roomId))),
    queryFn: ({ queryKey }) => getById2(queryKey[3]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type SaveRoomVariables = {
  cinemaId: string
  roomId: string | null
  input: CreateRoomRequest
}

export function useSaveAdminRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation<RoomResponse, unknown, SaveRoomVariables>({
    mutationFn: async ({ cinemaId, roomId, input }) => {
      if (!roomId) return create2(input, { cinemaId })

      // PUT yêu cầu active: đọc lại để giữ trạng thái hiện tại.
      const current = await getById2(roomId)

      if (
        current.id !== roomId ||
        current.cinemaId !== cinemaId ||
        typeof current.active !== 'boolean'
      ) {
        throw new Error('Không nhận được thông tin phòng hợp lệ. Hãy mở lại form.')
      }

      return update2(roomId, { ...input, active: current.active })
    },
    retry: false,
    onSuccess: (room) => {
      if (room.id) {
        queryClient.setQueryData(adminRoomKeys.detail(room.id), room)
      }

      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['rooms', 'showtimes', 'home', 'booking'].includes(String(queryKey[0])),
      })
    },
  })
}
type SetRoomActivityVariables = {
  cinemaId: string
  roomId: string
  active: boolean
}

export function useSetAdminRoomActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation<RoomResponse, unknown, SetRoomActivityVariables>({
    mutationFn: async ({ cinemaId, roomId, active }) => {
      const current = await getById2(roomId)
      const metadata = adminRoomSchema.safeParse(current)

      if (
        current.id !== roomId ||
        current.cinemaId !== cinemaId ||
        typeof current.active !== 'boolean' ||
        !metadata.success
      ) {
        throw new Error('Thông tin phòng không hợp lệ. Hãy tải lại danh sách.')
      }

      if (current.active === active) return current

      return update2(roomId, {
        ...metadata.data,
        active,
      })
    },
    retry: false,
    onSuccess: (room) => {
      if (room.id) {
        queryClient.setQueryData(adminRoomKeys.detail(room.id), room)
      }

      return queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['rooms', 'seats', 'showtimes', 'home', 'booking'].includes(String(queryKey[0])),
      })
    },
  })
}
