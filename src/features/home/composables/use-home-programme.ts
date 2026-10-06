import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCinemaLocation } from '@/features/cinemas'
import { useHomeCinemaProgramme, useHomeMovies } from '../api/home-queries'

export function useHomeProgramme() {
  const { location, query: locationQuery } = useCinemaLocation()

  const moviesQuery = useHomeMovies()
  const programmeQuery = useHomeCinemaProgramme(() => location.selectedCinemaId)
  const catalogMovies = computed(() => moviesQuery.data.value ?? [])

  const now = ref(Date.now())
  let clockTimer: number | undefined

  const hasCinema = computed(() => Boolean(location.selectedCinemaId))

  const scopeKey = computed(() => location.selectedCinemaId || 'all-cinemas')

  const loading = computed(
    () =>
      moviesQuery.isPending.value ||
      (hasCinema.value && (locationQuery.isPending.value || programmeQuery.isPending.value)),
  )

  const error = computed(
    () =>
      moviesQuery.isError.value ||
      (hasCinema.value && (locationQuery.isError.value || programmeQuery.isError.value)),
  )

  const errorMessage = computed(() => {
    if (moviesQuery.isError.value) {
      return 'Không thể tải danh mục phim.'
    }

    if (hasCinema.value && locationQuery.isError.value) {
      return 'Không thể kiểm tra thông tin rạp đã chọn.'
    }

    if (hasCinema.value && programmeQuery.isError.value) {
      return 'Không thể tải lịch chiếu của rạp đã chọn.'
    }

    return ''
  })

  const scopedMovies = computed(() => {
    if (loading.value || error.value) return []

    const movies = moviesQuery.data.value ?? []

    if (!hasCinema.value) return movies
    if (!programmeQuery.isSuccess.value) return []

    const bookableMovieIds = new Set<string>()
    const plannedMovieIds = new Set<string>()

    for (const showtime of programmeQuery.data.value ?? []) {
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

  const nowShowing = computed(() =>
    scopedMovies.value.filter((movie) => movie.status === 'NOW_SHOWING'),
  )

  const upcoming = computed(() =>
    scopedMovies.value
      .filter((movie) => movie.status === 'UPCOMING')
      .sort((first, second) => (first.releaseDate ?? '').localeCompare(second.releaseDate ?? '')),
  )

  const retrying = computed(
    () =>
      moviesQuery.isFetching.value ||
      (hasCinema.value && (locationQuery.isFetching.value || programmeQuery.isFetching.value)),
  )

  function updateClock() {
    now.value = Date.now()
  }

  async function retry() {
    if (retrying.value) return

    const requestedCinemaId = location.selectedCinemaId

    await Promise.all([
      moviesQuery.refetch(),
      locationQuery.isError.value ? locationQuery.refetch() : Promise.resolve(),
    ])

    // Không refetch lựa chọn cũ nếu rạp đã đổi trong lúc chờ.
    if (requestedCinemaId && location.selectedCinemaId === requestedCinemaId) {
      await programmeQuery.refetch()
    }

    updateClock()
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
    scopeKey,
    catalogMovies,
    nowShowing,
    upcoming,
    loading,
    error,
    errorMessage,
    retrying,
    retry,
  }
}
