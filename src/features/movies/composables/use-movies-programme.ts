import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCinemaLocation, useCinemaProgrammeQuery } from '@/features/cinemas'
import { useMoviesQuery } from '../api/movie-queries'
import type { CatalogMovie } from '../models/movie.model'

export function useMoviesProgramme() {
  const { location, query: locationQuery, selectedCity, selectedCinema } = useCinemaLocation()

  const moviesQuery = useMoviesQuery()
  const programmeQuery = useCinemaProgrammeQuery(() => location.selectedCinemaId)

  const now = ref(Date.now())
  const refreshing = ref(false)
  let clockTimer: number | undefined

  const hasCinema = computed(() => Boolean(location.selectedCinemaId))

  const scopeKey = computed(() => location.selectedCinemaId || 'all-cinemas')

  const catalogueLocationLabel = computed(() => {
    if (!hasCinema.value) return 'CINEMATIC'

    const cinema = selectedCinema.value
    const city = selectedCity.value

    if (!cinema) return 'rạp đã chọn'

    return city ? `${cinema.name} · ${city.name}` : cinema.name
  })

  const isPending = computed(
    () =>
      moviesQuery.isPending.value ||
      (hasCinema.value && (locationQuery.isPending.value || programmeQuery.isPending.value)),
  )

  const isError = computed(
    () =>
      moviesQuery.isError.value ||
      (hasCinema.value && (locationQuery.isError.value || programmeQuery.isError.value)),
  )

  const isFetching = computed(
    () =>
      refreshing.value ||
      moviesQuery.isFetching.value ||
      (hasCinema.value && (locationQuery.isFetching.value || programmeQuery.isFetching.value)),
  )

  const data = computed<CatalogMovie[] | undefined>(() => {
    const movies = moviesQuery.data.value

    if (movies === undefined) return undefined
    if (!hasCinema.value) return movies

    const showtimes = programmeQuery.data.value

    // Chưa có dữ liệu của rạp hiện tại thì không trả danh mục toàn hệ thống.
    if (!locationQuery.data.value || !selectedCinema.value || showtimes === undefined) {
      return undefined
    }

    const bookableMovieIds = new Set<string>()
    const plannedMovieIds = new Set<string>()

    for (const showtime of showtimes) {
      if (
        !showtime.id ||
        !showtime.movieId ||
        !showtime.startsAt ||
        showtime.cinemaId !== location.selectedCinemaId
      ) {
        continue
      }

      const startsAt = Date.parse(showtime.startsAt)

      if (!Number.isFinite(startsAt) || startsAt <= now.value) {
        continue
      }

      if (showtime.status === 'OPEN_FOR_BOOKING') {
        bookableMovieIds.add(showtime.movieId)
        plannedMovieIds.add(showtime.movieId)
      } else if (showtime.status === 'SCHEDULED') {
        plannedMovieIds.add(showtime.movieId)
      }
    }

    return movies.filter((movie) =>
      movie.status === 'NOW_SHOWING'
        ? bookableMovieIds.has(movie.id)
        : plannedMovieIds.has(movie.id),
    )
  })

  function updateClock() {
    now.value = Date.now()
  }

  async function refetch() {
    if (isFetching.value) return

    refreshing.value = true
    const requestedCinemaId = location.selectedCinemaId

    try {
      await Promise.all([
        moviesQuery.refetch(),
        locationQuery.isError.value ? locationQuery.refetch() : Promise.resolve(),
      ])

      if (requestedCinemaId && location.selectedCinemaId === requestedCinemaId) {
        await programmeQuery.refetch()
      }

      updateClock()
    } finally {
      refreshing.value = false
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
    data,
    isPending,
    isError,
    isFetching,
    refetch,
    scopeKey,
    catalogueLocationLabel,
  }
}
