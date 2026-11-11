import { computed } from 'vue'
import { HOME_HERO_LIMIT, useHomeHeroMovies, useHomeMovies } from '../api/home-queries'

export function useHomeHero() {
  // The homepage banner is an editorial discovery area, independent of room schedules.
  // Booking continues to validate the selected cinema and showtime in its own flow.
  const heroQuery = useHomeHeroMovies({ cinemaId: '', ready: true, movieIds: null })
  const catalogQuery = useHomeMovies()
  const useCatalog = computed(() => heroQuery.isSuccess.value && !heroQuery.data.value?.length)
  const error = computed(
    () => heroQuery.isError.value || (useCatalog.value && catalogQuery.isError.value),
  )
  const loading = computed(
    () =>
      !error.value &&
      (heroQuery.isPending.value || (useCatalog.value && catalogQuery.isPending.value)),
  )
  const movies = computed(() => {
    if (error.value || loading.value) return []
    if (!useCatalog.value) return heroQuery.data.value ?? []
    // Prefer real artwork when available; do not create movies or change backend hero flags.
    const artworkScore = (movie: NonNullable<typeof catalogQuery.data.value>[number]) =>
      Number(Boolean(movie.backdropUrl)) * 2 + Number(Boolean(movie.posterUrl))
    return (catalogQuery.data.value ?? [])
      .filter((movie) => movie.status === 'NOW_SHOWING')
      .slice()
      .sort(
        (a, b) =>
          artworkScore(b) - artworkScore(a) ||
          (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') ||
          a.title.localeCompare(b.title, 'vi'),
      )
      .slice(0, HOME_HERO_LIMIT)
  })
  const retrying = computed(
    () => heroQuery.isFetching.value || (useCatalog.value && catalogQuery.isFetching.value),
  )
  async function retry() {
    if (retrying.value) return
    if (useCatalog.value) await catalogQuery.refetch()
    else await heroQuery.refetch()
  }
  return {
    movies,
    loading,
    error,
    errorMessage: computed(() =>
      error.value ? 'Không thể tải phim nổi bật. Vui lòng thử lại.' : '',
    ),
    retrying,
    retry,
  }
}
