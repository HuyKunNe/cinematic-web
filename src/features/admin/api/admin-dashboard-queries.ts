import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { APP_PERMISSIONS } from '@/config/authorization'
import { getVisibleAdminNavigation } from '@/config/admin-navigation'
import { useAuthStore } from '@/stores/auth.store'
import { getMovieCatalog } from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import type {
  GetMovieCatalogParams,
  PageResponseMovieResponse,
} from '@/services/api/generated/movie-service/model'
import type { CinemaResponse } from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

type MovieStatusFilter = GetMovieCatalogParams['status']

export const adminDashboardKeys = {
  movieCount: (status: MovieStatusFilter) =>
    ['movies', 'admin', 'summary', status ?? 'all'] as const,

  activeCinemas: ['cinemas', 'admin', 'summary', 'active'] as const,
}

function readMovieTotal(response: PageResponseMovieResponse): number | null {
  const total = response.page?.totalElements

  return typeof total === 'number' && Number.isSafeInteger(total) && total >= 0 ? total : null
}

export function useAdminDashboardQueries() {
  const auth = useAuthStore()

  const navigation = computed(() => getVisibleAdminNavigation(auth))

  const canManageMovies = computed(() =>
    navigation.value.some((item) => item.permission === APP_PERMISSIONS.MOVIE_MANAGE),
  )

  const canManageInventory = computed(() =>
    navigation.value.some((item) => item.permission === APP_PERMISSIONS.INVENTORY_MANAGE),
  )

  function useMovieCount(status: MovieStatusFilter) {
    return useQuery<
      PageResponseMovieResponse,
      ApiError,
      number | null,
      ReturnType<typeof adminDashboardKeys.movieCount>
    >({
      queryKey: adminDashboardKeys.movieCount(status),
      queryFn: () =>
        getMovieCatalog({
          page: 0,
          size: 1,
          status,
        }),
      select: readMovieTotal,
      enabled: canManageMovies,
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false,
    })
  }

  const totalMovies = useMovieCount(undefined)
  const nowShowingMovies = useMovieCount('NOW_SHOWING')
  const upcomingMovies = useMovieCount('UPCOMING')

  const activeCinemas = useQuery<CinemaResponse[], ApiError, number | null>({
    queryKey: adminDashboardKeys.activeCinemas,
    queryFn: () => getActiveCinemas(),
    select: (response) => (Array.isArray(response) ? response.length : null),
    enabled: canManageInventory,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const isRefreshing = computed(
    () =>
      totalMovies.isFetching.value ||
      nowShowingMovies.isFetching.value ||
      upcomingMovies.isFetching.value ||
      activeCinemas.isFetching.value,
  )

  async function refresh() {
    const requests: Promise<unknown>[] = []

    if (canManageMovies.value) {
      requests.push(totalMovies.refetch(), nowShowingMovies.refetch(), upcomingMovies.refetch())
    }

    if (canManageInventory.value) {
      requests.push(activeCinemas.refetch())
    }

    await Promise.allSettled(requests)
  }

  return {
    totalMovies,
    nowShowingMovies,
    upcomingMovies,
    activeCinemas,
    isRefreshing,
    refresh,
  }
}
