import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { z } from 'zod'
import { getBookableShowtimes } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type { GetBookableShowtimesParams } from '@/services/api/generated/inventory-service/model/getBookableShowtimesParams'
import { ShowtimeResponseStatus } from '@/services/api/generated/inventory-service/model/showtimeResponseStatus'

// Validate the existing public bookable-showtime response, retaining version metadata.
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)))
const showtimeSchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  movieId: z.string().uuid(),
  roomId: z.string().uuid(),
  roomName: z.string().nullish(),
  startsAt: timestamp,
  endsAt: timestamp,
  status: z.nativeEnum(ShowtimeResponseStatus),
  screeningVersion: z
    .object({
      contentFormat: z.string().optional(),
      projectionTechnology: z.string().optional(),
      audioLanguage: z.string().optional(),
      presentationType: z.string().optional(),
      subtitleLanguage: z.string().nullish(),
    })
    .nullish(),
})
export type CustomerScheduleSlot = z.infer<typeof showtimeSchema>
export function useCustomerSchedule(requests: MaybeRefOrGetter<GetBookableShowtimesParams[]>) {
  return useQueries({
    queries: computed(() =>
      toValue(requests).map((request) => ({
        queryKey: [
          'home',
          'schedule-grid',
          request.cinemaId,
          request.movieId ?? '',
          request.from,
          request.to,
        ] as const,
        queryFn: async () => {
          const rows = z.array(showtimeSchema).parse(await getBookableShowtimes(request))
          if (
            new Set(rows.map((row) => row.id)).size !== rows.length ||
            rows.some(
              (row) =>
                row.cinemaId !== request.cinemaId ||
                (request.movieId && row.movieId !== request.movieId),
            )
          )
            throw new Error('Schedule scope mismatch')
          return rows.filter(
            (row) =>
              row.status === 'OPEN_FOR_BOOKING' &&
              Date.parse(row.startsAt) >= Date.parse(request.from) &&
              Date.parse(row.startsAt) < Date.parse(request.to) &&
              Date.parse(row.endsAt) > Date.parse(row.startsAt),
          )
        },
        retry: false,
        staleTime: 0,
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
      })),
    ),
  })
}
