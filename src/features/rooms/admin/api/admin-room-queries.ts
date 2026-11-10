import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getManagedCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  createRoom,
  getManagedRooms,
  getRoomById,
  updateRoom,
} from '@/services/api/generated/inventory-service/room-controller/room-controller'
import { replaceRoomContentFormats } from '@/services/api/generated/inventory-service/room-content-formats-controller/room-content-formats-controller'
import type {
  CinemaResponse,
  CreateRoomRequest,
  RoomResponse,
  ReplaceRoomContentFormatsRequest,
  UpdateRoomRequest,
} from '@/services/api/generated/inventory-service/model'
import { adminRoomErrorMessage, adminRoomSchema } from '../schemas/admin-room.schema'
import { adminRoomContentFormatKeys } from './admin-room-content-formats-queries'

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

export function useAdminRoomSummaryQuery(
  cinemaIds: MaybeRefOrGetter<readonly string[]>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const queries = useQueries({
    queries: computed(() =>
      toValue(enabled)
        ? [...new Set(toValue(cinemaIds))]
            .filter(Boolean)
            .sort()
            .map((cinemaId) => ({
              queryKey: adminRoomKeys.catalog(cinemaId),
              queryFn: (): Promise<RoomResponse[]> => getManagedRooms({ cinemaId }),
              staleTime: 30_000,
              retry: false,
              refetchOnWindowFocus: false,
            }))
        : [],
    ),
  })

  const cinemaIdsSorted = computed(() => [...new Set(toValue(cinemaIds))].filter(Boolean).sort())

  const countsByCinema = computed(() => {
    const result = new Map<string, { total: number; active: number; inactive: number }>()

    cinemaIdsSorted.value.forEach((cinemaId, index) => {
      const data = queries.value[index]?.data
      if (data === undefined) return

      result.set(cinemaId, {
        total: data.length,
        active: data.filter((room) => room.active === true).length,
        inactive: data.filter((room) => room.active === false).length,
      })
    })

    return result
  })

  const counts = computed(() => {
    if (!toValue(enabled) || queries.value.some((query) => query.data === undefined)) {
      return null
    }

    return [...countsByCinema.value.values()].reduce(
      (summary, cinema) => ({
        total: summary.total + cinema.total,
        active: summary.active + cinema.active,
        inactive: summary.inactive + cinema.inactive,
      }),
      { total: 0, active: 0, inactive: 0 },
    )
  })

  const isFetching = computed(() => queries.value.some((query) => query.isFetching))
  const error = computed(() => queries.value.find((query) => query.isError)?.error ?? null)

  async function refresh() {
    await Promise.allSettled(queries.value.map((query) => query.refetch()))
  }

  return { counts, countsByCinema, isFetching, error, refresh }
}

export function useAdminRoomDetailQuery(
  roomId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery<RoomResponse, unknown, RoomResponse, ReturnType<typeof adminRoomKeys.detail>>({
    queryKey: computed(() => adminRoomKeys.detail(toValue(roomId))),
    queryFn: ({ queryKey }) => getRoomById(queryKey[3]),
    enabled: computed(() => toValue(enabled) && Boolean(toValue(roomId))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}

type SaveRoomVariables =
  | {
      operation: 'create'
      cinemaId: string
      input: CreateRoomRequest
    }
  | {
      operation: 'update'
      cinemaId: string
      roomId: string
      input: Pick<UpdateRoomRequest, 'name' | 'roomType'>
      contentFormats: ReplaceRoomContentFormatsRequest
    }

export class AdminRoomSaveConflictError extends Error {
  constructor() {
    super('Thông tin phòng đã thay đổi. Hãy tải lại thông tin trước khi lưu tiếp.')
  }
}

export class AdminRoomPartialSaveError extends Error {
  constructor(public readonly savedRoom: RoomResponse, public readonly originalError: unknown) {
    super('Đã lưu thông tin phòng, nhưng chưa lưu được định dạng. ' +
      adminRoomErrorMessage(originalError, 'Hãy thử lưu lại định dạng.'))
  }
}

export function useSaveAdminRoomMutation() {
  const queryClient = useQueryClient()

  return useMutation<RoomResponse, unknown, SaveRoomVariables>({
    mutationFn: async (variables) => {
      if (variables.operation === 'create') {
        return createRoom(variables.input, { cinemaId: variables.cinemaId })
      }

      const current = await getRoomById(variables.roomId)

      if (
        current.id !== variables.roomId ||
        current.cinemaId !== variables.cinemaId ||
        typeof current.active !== 'boolean'
      ) {
        throw new Error('Không nhận được thông tin phòng hợp lệ. Hãy mở lại form.')
      }

      if (current.version !== variables.contentFormats.expectedVersion) {
        throw new AdminRoomSaveConflictError()
      }

      const metadataChanged = current.name !== variables.input.name ||
        current.roomType !== variables.input.roomType
      const savedRoom = metadataChanged
        ? await updateRoom(variables.roomId, { ...variables.input, active: current.active })
        : current
      const formatsChanged = [...(current.contentFormats ?? [])].sort().join('|') !==
        [...variables.contentFormats.formats].sort().join('|')

      if (!formatsChanged) return savedRoom

      try {
        if (savedRoom.id !== variables.roomId || typeof savedRoom.version !== 'number' ||
          !Number.isSafeInteger(savedRoom.version) || savedRoom.version < 0) {
          throw new Error('Không nhận được version hợp lệ để lưu định dạng. Hãy tải lại thông tin.')
        }

        // Updating metadata may increment the room version. Use the returned version,
        // never the version from before the first request.
        const formats = await replaceRoomContentFormats(variables.roomId, {
          ...variables.contentFormats,
          expectedVersion: savedRoom.version,
        })

        if (formats.roomId !== variables.roomId || typeof formats.version !== 'number' ||
          !Number.isSafeInteger(formats.version) || formats.version < savedRoom.version ||
          !Array.isArray(formats.formats) ||
          [...formats.formats].sort().join('|') !== [...variables.contentFormats.formats].sort().join('|')) {
          throw new Error('Chưa xác nhận được định dạng vừa lưu. Hãy tải lại thông tin.')
        }

        queryClient.setQueryData(adminRoomContentFormatKeys.detail(variables.roomId), formats)
        return { ...savedRoom, contentFormats: formats.formats, version: formats.version }
      } catch (error) {
        if (metadataChanged) throw new AdminRoomPartialSaveError(savedRoom, error)
        throw error
      }
    },
    retry: false,
    onSuccess: (room) => {
      if (room.id) {
        queryClient.setQueryData(adminRoomKeys.detail(room.id), room)
      }

      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['rooms', 'room-content-formats', 'showtimes', 'home', 'booking'].includes(String(queryKey[0])),
      })
    },
    onError: (error, variables) => {
      if (variables.operation !== 'update') return

      if (error instanceof AdminRoomPartialSaveError) {
        queryClient.setQueryData(adminRoomKeys.detail(variables.roomId), error.savedRoom)
      }

      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          ['rooms', 'room-content-formats', 'showtimes', 'home', 'booking'].includes(String(queryKey[0])),
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
      const current = await getRoomById(roomId)
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

      return updateRoom(roomId, {
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
