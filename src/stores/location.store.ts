import { ref } from 'vue'
import { defineStore } from 'pinia'

const LOCATION_STORAGE_KEY = 'cinematic:location:v1'

function readStoredLocation() {
  const empty = {
    selectedCityKey: '',
    selectedCinemaId: '',
  }

  if (typeof window === 'undefined') return empty

  try {
    const raw = window.sessionStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return empty

    const stored: unknown = JSON.parse(raw)

    if (
      !stored ||
      typeof stored !== 'object' ||
      !('selectedCityKey' in stored) ||
      !('selectedCinemaId' in stored) ||
      typeof stored.selectedCityKey !== 'string' ||
      typeof stored.selectedCinemaId !== 'string'
    ) {
      return empty
    }

    const cityKey = stored.selectedCityKey.trim().toLocaleLowerCase('vi')
    const cinemaId = stored.selectedCinemaId.trim()

    const validCinemaId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cinemaId,
    )

    return {
      selectedCityKey: cityKey,
      selectedCinemaId: cityKey && validCinemaId ? cinemaId : '',
    }
  } catch {
    return empty
  }
}

export const useLocationStore = defineStore('location', () => {
  const stored = readStoredLocation()

  const selectedCityKey = ref(stored.selectedCityKey)
  const selectedCinemaId = ref(stored.selectedCinemaId)

  function persistLocation() {
    if (typeof window === 'undefined') return

    try {
      if (!selectedCityKey.value) {
        window.sessionStorage.removeItem(LOCATION_STORAGE_KEY)
        return
      }

      window.sessionStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({
          selectedCityKey: selectedCityKey.value,
          selectedCinemaId: selectedCinemaId.value,
        }),
      )
    } catch {
      // Store vẫn hoạt động trong phiên hiện tại nếu không ghi được storage.
    }
  }

  function selectCity(cityKey: string) {
    const nextCityKey = cityKey.trim().toLocaleLowerCase('vi')

    if (nextCityKey === selectedCityKey.value) return

    selectedCityKey.value = nextCityKey
    selectedCinemaId.value = ''
    persistLocation()
  }

  function selectCinema(cinemaId: string, cityKey: string): boolean {
    const nextCinemaId = cinemaId.trim()
    const nextCityKey = cityKey.trim().toLocaleLowerCase('vi')

    if (!nextCinemaId || !nextCityKey) return false

    selectedCityKey.value = nextCityKey
    selectedCinemaId.value = nextCinemaId
    persistLocation()

    return true
  }

  function clearCinema() {
    selectedCinemaId.value = ''
    persistLocation()
  }

  function clearLocation() {
    selectedCityKey.value = ''
    selectedCinemaId.value = ''
    persistLocation()
  }

  return {
    selectedCityKey,
    selectedCinemaId,
    selectCity,
    selectCinema,
    clearCinema,
    clearLocation,
  }
})
