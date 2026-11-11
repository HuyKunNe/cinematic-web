import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueries, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { createShowtimeBatch, getShowtimesByRoom } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import { getRoomPublishedSeatMap } from '@/services/api/generated/inventory-service/room-published-seat-map-controller/room-published-seat-map-controller'
import type { CreateShowtimeBatchRequest } from '@/services/api/generated/inventory-service/model'
import { scheduleShowtimeRequestSchema, scheduledShowtimeSchema } from '../schemas/admin-showtime-create.schema'

export const SHOWTIME_BATCH_LIMIT = 50 // CreateShowtimeBatchRequest.MAX_SHOWTIMES in BE.
const timestamp = z.string().datetime({ offset: true })
const roomScheduleSchema = z.array(z.object({
  id: z.string().uuid(), roomId: z.string().uuid(), startsAt: timestamp, endsAt: timestamp,
  status: z.enum(['SCHEDULED', 'OPEN_FOR_BOOKING', 'CLOSED', 'CANCELLED', 'COMPLETED']),
  scheduling: z.object({ readyAt: timestamp }).nullish(),
})).superRefine((items, context) => {
  const ids = new Set<string>()
  items.forEach((item, index) => {
    if (ids.has(item.id) || (item.status !== 'CANCELLED' &&
      (!item.scheduling || Date.parse(item.scheduling.readyAt) < Date.parse(item.endsAt))) ||
      Date.parse(item.endsAt) <= Date.parse(item.startsAt)) {
      context.addIssue({ code: 'custom', path: [index], message: 'Lịch phòng thiếu hoặc sai thời gian sẵn sàng.' })
    }
    ids.add(item.id)
  })
})
const layoutSchema = z.object({ layout: z.object({ id: z.string().uuid(), roomId: z.string().uuid(), status: z.literal('PUBLISHED') }) })

async function loadRoomContext(roomId: string) {
  const [schedule, layout] = await Promise.all([
    getShowtimesByRoom(roomId),
    getRoomPublishedSeatMap({ roomId }).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404 &&
        'code' in error && error.code === 'INVENTORY_ROOM_LAYOUT_NOT_FOUND') return null
      throw error
    }),
  ])
  const showtimes = roomScheduleSchema.parse(schedule)
  const published = layout === null ? null : layoutSchema.parse(layout).layout
  if (showtimes.some((item) => item.roomId !== roomId) || (published && published.roomId !== roomId)) {
    throw new Error('Lịch hoặc sơ đồ trả về không thuộc phòng đã chọn.')
  }
  return { roomId, showtimes: showtimes.filter((item) => item.status !== 'CANCELLED'), layoutId: published?.id }
}

export type BatchRoomContext = Awaited<ReturnType<typeof loadRoomContext>>

export function useBatchRoomContexts(roomIds: MaybeRefOrGetter<string[]>, enabled: MaybeRefOrGetter<boolean>) {
  const ids = computed(() => [...new Set(toValue(roomIds))].sort())
  const queries = useQueries({ queries: computed(() => ids.value.map((roomId) => ({
    queryKey: ['showtimes', 'admin', 'batch-room-context', roomId] as const,
    queryFn: () => loadRoomContext(roomId), enabled: toValue(enabled),
    staleTime: 0, retry: false, refetchOnWindowFocus: true,
  }))) })
  const contexts = computed(() => new Map(queries.value.flatMap((query) => query.data ? [[query.data.roomId, query.data] as const] : [])))
  const ready = computed(() => ids.value.length > 0 && queries.value.every((query) => query.isSuccess && !query.isFetching))
  const error = computed(() => queries.value.find((query) => query.isError)?.error)
  async function refresh() {
    const results = await Promise.all(queries.value.map((query) => query.refetch()))
    const failure = results.find((result) => result.isError)
    if (failure) throw failure.error
  }
  return { contexts, ready, error, refresh }
}

export class BatchInputError extends Error {}

export function useCreateShowtimeBatch(enabled: MaybeRefOrGetter<boolean>) {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: { cinemaId: string; request: CreateShowtimeBatchRequest }) => {
      if (!toValue(enabled)) throw new BatchInputError('Không có quyền tạo suất chiếu.')
      const parsed = z.object({ clientRequestId: z.string().uuid(),
        showtimes: z.array(scheduleShowtimeRequestSchema).min(1).max(SHOWTIME_BATCH_LIMIT),
      }).strict().safeParse(input.request)
      if (!parsed.success) throw new BatchInputError('Dữ liệu đợt tạo chưa hợp lệ.')
      const result = z.array(scheduledShowtimeSchema).parse(await createShowtimeBatch(parsed.data))
      if (result.length !== parsed.data.showtimes.length || new Set(result.map((item) => item.id)).size !== result.length) {
        throw new Error('Chưa xác nhận đầy đủ kết quả tạo đợt.')
      }
      result.forEach((item, index) => {
        const sent = parsed.data.showtimes[index]!
        if (item.cinemaId !== input.cinemaId || item.movieId !== sent.movieId || item.roomId !== sent.roomId ||
          item.screeningVersion.id !== sent.movieScreeningVersionId ||
          (item.roomLayoutId ?? undefined) !== sent.roomLayoutId ||
          item.pricingPolicyVersionId !== sent.pricingPolicyVersionId ||
          Date.parse(item.startsAt) !== Date.parse(sent.startsAt) || Date.parse(item.endsAt) !== Date.parse(sent.endsAt) ||
          item.scheduling.breakMinutes !== sent.breakMinutes ||
          Date.parse(item.scheduling.readyAt) !== Date.parse(sent.endsAt) + sent.breakMinutes * 60_000 ||
          Date.parse(item.endsAt) - Date.parse(item.startsAt) !== item.scheduling.durationMinutes * 60_000) {
          throw new Error('Kết quả tạo đợt không khớp dữ liệu đã gửi.')
        }
      })
      return result
    },
    onSuccess: () => { void client.invalidateQueries({ predicate: ({ queryKey }) =>
      ['showtimes', 'home', 'booking', 'cinemas'].includes(String(queryKey[0])), refetchType: 'none' }) },
  })
}
