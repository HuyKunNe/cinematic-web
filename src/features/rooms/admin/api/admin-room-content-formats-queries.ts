import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  getRoomContentFormats,
  replaceRoomContentFormats,
} from '@/services/api/generated/inventory-service/room-content-formats-controller/room-content-formats-controller'
import type {
  ReplaceRoomContentFormatsRequest,
  RoomContentFormatsResponse,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminRoomContentFormatKeys = {
  detail: (roomId: string) => ['room-content-formats', 'admin', roomId] as const,
}

export function useAdminRoomContentFormatsQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<
    RoomContentFormatsResponse,
    ApiError,
    RoomContentFormatsResponse,
    ReturnType<typeof adminRoomContentFormatKeys.detail>
  >({
    queryKey: computed(() => adminRoomContentFormatKeys.detail(toValue(roomId))),
    queryFn: ({ queryKey }) => getRoomContentFormats(queryKey[2]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type ReplaceVariables = {
  roomId: string
  input: ReplaceRoomContentFormatsRequest
}

export function useReplaceAdminRoomContentFormatsMutation() {
  const queryClient = useQueryClient()

  return useMutation<RoomContentFormatsResponse, ApiError, ReplaceVariables>({
    mutationFn: ({ roomId, input }) => replaceRoomContentFormats(roomId, input),
    retry: false,
    onSuccess: async (response) => {
      if (response.roomId) {
        queryClient.setQueryData(adminRoomContentFormatKeys.detail(response.roomId), response)
      }

      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['rooms', 'seats', 'showtimes', 'home', 'booking'].includes(String(queryKey[0])),
      })
    },
  })
}
