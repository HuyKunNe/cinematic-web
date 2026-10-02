import type { CinemaResponse } from '@/services/api/generated/inventory-service/model/cinemaResponse'
import type {
  CinemaCity,
  CinemaLocation,
  CinemaLocationCatalog,
} from '../models/cinema-location.model'

function toCinemaLocation(dto: CinemaResponse): CinemaLocation | null {
  const id = dto.id?.trim()
  const name = dto.name?.trim()
  const city = dto.city?.trim()

  if (dto.active !== true || !id || !name || !city) {
    return null
  }

  return {
    id,
    name,
    address: dto.address?.trim() ?? '',
    city,
    cityKey: city.toLocaleLowerCase('vi'),
  }
}

export function toCinemaLocationCatalog(response: CinemaResponse[]): CinemaLocationCatalog {
  const seenCinemaIds = new Set<string>()

  const cinemas = response
    .map(toCinemaLocation)
    .filter((cinema): cinema is CinemaLocation => cinema !== null)
    .filter((cinema) => {
      if (seenCinemaIds.has(cinema.id)) {
        return false
      }

      seenCinemaIds.add(cinema.id)
      return true
    })
    .sort(
      (first, second) =>
        first.name.localeCompare(second.name, 'vi') || first.id.localeCompare(second.id),
    )

  const citiesByKey = new Map<string, CinemaCity>()

  for (const cinema of cinemas) {
    if (!citiesByKey.has(cinema.cityKey)) {
      citiesByKey.set(cinema.cityKey, {
        key: cinema.cityKey,
        name: cinema.city,
      })
    }
  }

  const cities = [...citiesByKey.values()].sort(
    (first, second) =>
      first.name.localeCompare(second.name, 'vi') || first.key.localeCompare(second.key),
  )

  return {
    cinemas,
    cities,
  }
}
