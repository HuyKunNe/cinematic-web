import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', () => {
  const selectedCityKey = ref('')
  const selectedCinemaId = ref('')

  function selectCity(cityKey: string) {
    const nextCityKey = cityKey.trim().toLocaleLowerCase('vi')

    if (nextCityKey === selectedCityKey.value) {
      return
    }

    selectedCityKey.value = nextCityKey
    selectedCinemaId.value = ''
  }

  function selectCinema(cinemaId: string, cityKey: string): boolean {
    const nextCinemaId = cinemaId.trim()
    const nextCityKey = cityKey.trim().toLocaleLowerCase('vi')

    if (!nextCinemaId || !nextCityKey) {
      return false
    }

    selectedCityKey.value = nextCityKey
    selectedCinemaId.value = nextCinemaId
    return true
  }

  function clearCinema() {
    selectedCinemaId.value = ''
  }

  function clearLocation() {
    selectedCityKey.value = ''
    selectedCinemaId.value = ''
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
