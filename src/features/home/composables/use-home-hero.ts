import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCinemaLocation } from '@/features/cinemas'
import { useHomeCinemaProgramme, useHomeHeroMovies, type HomeHeroScope } from '../api/home-queries'

export function useHomeHero() {
  const { location, selectedCinema, query: locationQuery } = useCinemaLocation()

  const cinemaId = computed(() => location.selectedCinemaId)
  const hasCinema = computed(() => Boolean(cinemaId.value))

  const programmeQuery = useHomeCinemaProgramme(() => cinemaId.value)

  const now = ref(Date.now())
  let clockTimer: number | undefined

  const candidateMovieIds = computed(() => {
    if (!hasCinema.value) return []

    const ids = new Set<string>()

    for (const showtime of programmeQuery.data.value ?? []) {
      if (
        !showtime.id ||
        !showtime.movieId ||
        !showtime.startsAt ||
        showtime.cinemaId !== cinemaId.value ||
        showtime.status !== 'OPEN_FOR_BOOKING'
      ) {
        continue
      }

      const startsAt = Date.parse(showtime.startsAt)

      if (!Number.isFinite(startsAt) || startsAt <= now.value) {
        continue
      }

      ids.add(showtime.movieId)
    }

    return [...ids].sort()
  })

  const scopeError = computed(
    () => hasCinema.value && (locationQuery.isError.value || programmeQuery.isError.value),
  )

  const scopeReady = computed(
    () =>
      !hasCinema.value ||
      (locationQuery.isSuccess.value &&
        selectedCinema.value?.id === cinemaId.value &&
        programmeQuery.isSuccess.value),
  )

  const scope = computed<HomeHeroScope>(() => ({
    cinemaId: cinemaId.value,
    ready: scopeReady.value,
    movieIds: hasCinema.value ? candidateMovieIds.value : null,
  }))

  const heroQuery = useHomeHeroMovies(scope)

  const needsHeroRequest = computed(
    () => scopeReady.value && (!hasCinema.value || candidateMovieIds.value.length > 0),
  )

  const error = computed(
    () => scopeError.value || (needsHeroRequest.value && heroQuery.isError.value),
  )

  const loading = computed(
    () =>
      !error.value && (!scopeReady.value || (needsHeroRequest.value && heroQuery.isPending.value)),
  )

  const errorMessage = computed(() => {
    if (hasCinema.value && locationQuery.isError.value) {
      return 'Không thể kiểm tra thông tin rạp đã chọn.'
    }

    if (hasCinema.value && programmeQuery.isError.value) {
      return 'Không thể tải lịch chiếu của rạp đã chọn.'
    }

    if (needsHeroRequest.value && heroQuery.isError.value) {
      return 'Không thể tải phim nổi bật.'
    }

    return ''
  })

  const movies = computed(() => {
    if (error.value || loading.value || !needsHeroRequest.value) {
      return []
    }

    const result = heroQuery.data.value ?? []

    if (!hasCinema.value) {
      return result
    }

    const candidates = new Set(candidateMovieIds.value)

    // Filter giữ nguyên thứ tự biên tập do Backend trả về.
    return result.filter((movie) => candidates.has(movie.id))
  })

  const retrying = computed(
    () =>
      heroQuery.isFetching.value ||
      (hasCinema.value && (locationQuery.isFetching.value || programmeQuery.isFetching.value)),
  )

  function updateClock() {
    now.value = Date.now()
  }

  async function retry() {
    if (retrying.value) return

    const requestedCinemaId = cinemaId.value

    if (requestedCinemaId && locationQuery.isError.value) {
      const result = await locationQuery.refetch()

      await nextTick()

      if (result.isError || cinemaId.value !== requestedCinemaId) {
        return
      }
    }

    if (requestedCinemaId && programmeQuery.isError.value) {
      const result = await programmeQuery.refetch()

      if (result.isError || cinemaId.value !== requestedCinemaId) {
        return
      }
    }

    if (cinemaId.value !== requestedCinemaId) {
      return
    }

    updateClock()
    await nextTick()

    // Query có thể đã tự chạy khi scope trở lại trạng thái ready.
    if (needsHeroRequest.value && !heroQuery.isFetching.value) {
      await heroQuery.refetch()
    }
  }

  onMounted(() => {
    updateClock()

    clockTimer = window.setInterval(updateClock, 30_000)
    document.addEventListener('visibilitychange', updateClock)
  })

  onBeforeUnmount(() => {
    if (clockTimer !== undefined) {
      window.clearInterval(clockTimer)
    }

    document.removeEventListener('visibilitychange', updateClock)
  })

  return {
    movies,
    loading,
    error,
    errorMessage,
    retrying,
    retry,
  }
}
