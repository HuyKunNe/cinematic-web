import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { getRoomPublishedSeatMap } from '@/services/api/generated/inventory-service/room-layout-controller/room-layout-controller'
import { PublishedRoomSeatResponseSeatType } from '@/services/api/generated/inventory-service/model/publishedRoomSeatResponseSeatType'

const uuid = z.string().uuid()

// Chỉ đọc các trường cần cho phần tóm tắt.
// Không khai báo một request hoặc endpoint mới.
const publishedLayoutSchema = z.object({
  layout: z.object({
    id: uuid,
    roomId: uuid,
    layoutVersion: z.number().int().positive(),
    status: z.literal('PUBLISHED'),
  }),
  matrix: z.object({
    rowCount: z.number().int().min(1).max(100),
    columnCount: z.number().int().min(1).max(100),
    seats: z
      .array(
        z.object({
          seatId: uuid,
          rowIndex: z.number().int().nonnegative(),
          columnIndex: z.number().int().nonnegative(),
          columnSpan: z.union([z.literal(1), z.literal(2)]),
          capacity: z.union([z.literal(1), z.literal(2)]),
          seatType: z.nativeEnum(PublishedRoomSeatResponseSeatType),
        }),
      )
      .min(1)
      .max(2500),
  }),
})

function isMissingPublishedLayout(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 404 &&
    'code' in error &&
    error.code === 'INVENTORY_ROOM_LAYOUT_NOT_FOUND'
  )
}

export function useAdminShowtimePublishedLayoutQuery(
  roomId: MaybeRefOrGetter<string>,
  canRead: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['showtimes', 'admin', 'published-layout', toValue(roomId)] as const),
    enabled: computed(() => toValue(canRead) && uuid.safeParse(toValue(roomId)).success),
    queryFn: async ({ queryKey }) => {
      const requestedRoomId = uuid.parse(queryKey[3])

      if (!toValue(canRead)) {
        throw new Error('Không có quyền đọc sơ đồ.')
      }

      try {
        const response = await getRoomPublishedSeatMap({
          roomId: requestedRoomId,
        })

        const content = publishedLayoutSchema.parse(response)

        if (content.layout.roomId !== requestedRoomId) {
          throw new Error('Sơ đồ trả về không thuộc phòng đang chọn.')
        }

        const ids = new Set<string>()

        for (const seat of content.matrix.seats) {
          if (
            ids.has(seat.seatId) ||
            seat.rowIndex >= content.matrix.rowCount ||
            seat.columnIndex + seat.columnSpan > content.matrix.columnCount
          ) {
            throw new Error('Dữ liệu ghế trong sơ đồ không hợp lệ.')
          }

          ids.add(seat.seatId)
        }

        return {
          id: content.layout.id,
          roomId: content.layout.roomId,
          layoutVersion: content.layout.layoutVersion,
          rows: content.matrix.rowCount,
          columns: content.matrix.columnCount,
          seats: content.matrix.seats.length,
          capacity: content.matrix.seats.reduce((total, seat) => total + seat.capacity, 0),
          seatTypes: new Set(content.matrix.seats.map((seat) => seat.seatType)).size,
        }
      } catch (error) {
        if (isMissingPublishedLayout(error)) return null
        throw error
      }
    },
    placeholderData: () => undefined,
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}
