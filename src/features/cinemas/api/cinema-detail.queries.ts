import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCinemaById } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getCinemaAmenities } from '@/services/api/generated/inventory-service/cinema-amenities-controller/cinema-amenities-controller'

export function useCinemaDetailQuery(cinemaId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ['cinemas', 'customer-detail', toValue(cinemaId)] as const),
    enabled: computed(() => Boolean(toValue(cinemaId))),
    queryFn: async ({ queryKey }) => {
      const cinema = await getCinemaById(queryKey[2])
      if (cinema.id !== queryKey[2] || !cinema.name?.trim()) {
        throw new Error('Thông tin rạp không hợp lệ.')
      }
      return cinema.active === true ? cinema : null
    },
    retry: false,
  })
}

export function useCinemaAmenitiesQuery(cinemaId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ['cinemas', 'customer-amenities', toValue(cinemaId)] as const),
    enabled: computed(() => Boolean(toValue(cinemaId))),
    queryFn: async ({ queryKey }) => {
      const result = await getCinemaAmenities(queryKey[2])
      if (
        result.cinemaId !== queryKey[2] ||
        !Array.isArray(result.amenities) ||
        result.amenities.some((item) => typeof item !== 'string' || !item.trim())
      ) {
        throw new Error('Thông tin tiện ích không hợp lệ.')
      }
      return result.amenities
    },
    retry: false,
  })
}
