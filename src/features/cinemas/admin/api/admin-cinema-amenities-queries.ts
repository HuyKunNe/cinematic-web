import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { getCinemaAmenities } from '@/services/api/generated/inventory-service/cinema-amenities-controller/cinema-amenities-controller'
import type { CinemaAmenitiesResponse } from '@/services/api/generated/inventory-service/model'

const cinemaAmenitiesResponseSchema = z.object({
  cinemaId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  amenities: z.array(z.string().trim().min(1).max(100)).max(30),
})

export const adminCinemaAmenitiesKeys = {
  detail: (cinemaId: string) => ['cinemas', 'admin', 'amenities', cinemaId] as const,
}

export function useAdminCinemaAmenitiesQuery(
  cinemaId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => adminCinemaAmenitiesKeys.detail(toValue(cinemaId))),
    queryFn: async ({ queryKey }) => {
      const requestedCinemaId = queryKey[3]
      const response = await getCinemaAmenities(requestedCinemaId)
      const parsed = cinemaAmenitiesResponseSchema.safeParse(response)

      if (!parsed.success || parsed.data.cinemaId !== requestedCinemaId) {
        throw new Error('Thông tin tiện ích không hợp lệ. Hãy tải lại dữ liệu.')
      }

      return parsed.data satisfies CinemaAmenitiesResponse
    },
    enabled: computed(() => toValue(enabled) && Boolean(toValue(cinemaId))),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}
