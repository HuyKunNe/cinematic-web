import { computed, watch } from 'vue'
import { useLocationStore } from '@/stores/location.store'
import { useCinemaLocationsQuery } from '../api/cinema-location.queries'

export function useCinemaLocation() {
  const query = useCinemaLocationsQuery()
  const location = useLocationStore()

  const cities = computed(() => query.data.value?.cities ?? [])
  const cinemas = computed(() => query.data.value?.cinemas ?? [])

  const selectedCity = computed(() =>
    cities.value.find((city) => city.key === location.selectedCityKey),
  )

  const selectedCinema = computed(() =>
    cinemas.value.find(
      (cinema) =>
        cinema.id === location.selectedCinemaId && cinema.cityKey === location.selectedCityKey,
    ),
  )

  const locationLabel = computed(() => selectedCinema.value?.name ?? 'Chọn thành phố')

  const locationDescription = computed(() => {
    const city = selectedCity.value
    const cinema = selectedCinema.value

    if (city && cinema) {
      return `${cinema.name}  ·  ${city.name}. Thay đổi thành phố và rạp.`
    }

    if (city) {
      return `${city.name}. Chọn rạp trong thành phố này.`
    }

    return 'Chọn thành phố và rạp'
  })

  // Chỉ đối chiếu lựa chọn khi có dữ liệu tải thành công.
  watch(
    query.data,
    (catalog) => {
      if (!catalog || !query.isSuccess.value) return

      if (
        location.selectedCityKey &&
        !catalog.cities.some((city) => city.key === location.selectedCityKey)
      ) {
        location.clearLocation()
        return
      }

      if (
        location.selectedCinemaId &&
        !catalog.cinemas.some(
          (cinema) =>
            cinema.id === location.selectedCinemaId && cinema.cityKey === location.selectedCityKey,
        )
      ) {
        location.clearCinema()
      }
    },
    { immediate: true },
  )

  function selectCinemaById(cinemaId: string, cityKey: string): boolean {
    if (query.isPending.value || query.isFetching.value || query.isError.value) {
      return false
    }

    const cinema = cinemas.value.find((item) => item.id === cinemaId && item.cityKey === cityKey)

    if (!cinema) return false

    return location.selectCinema(cinema.id, cinema.cityKey)
  }

  return {
    query,
    location,
    cities,
    cinemas,
    selectedCity,
    selectedCinema,
    locationLabel,
    locationDescription,
    selectCinemaById,
  }
}
