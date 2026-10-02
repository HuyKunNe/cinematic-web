import { useQuery } from '@tanstack/vue-query'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { toCinemaLocationCatalog } from '../mappers/cinema-location.mapper'

export const cinemaLocationQueryKeys = {
  catalog: ['cinemas', 'location-catalog'] as const,
}

export function useCinemaLocationsQuery() {
  return useQuery({
    queryKey: cinemaLocationQueryKeys.catalog,
    queryFn: () => getActiveCinemas(),
    select: toCinemaLocationCatalog,
  })
}
