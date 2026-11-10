import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getRoomContentFormats } from '@/services/api/generated/inventory-service/room-content-formats-controller/room-content-formats-controller'
import type {
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
