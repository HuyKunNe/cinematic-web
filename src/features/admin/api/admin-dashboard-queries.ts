import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { APP_PERMISSIONS } from '@/config/authorization'
import { getVisibleAdminNavigation } from '@/config/admin-navigation'
import { useAuthStore } from '@/stores/auth.store'
import {
  findById,
  findAll,
  getMovieCatalog,
} from '@/services/api/generated/movie-service/movie-controller/movie-controller'
import { getActiveCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getByTimeRange } from '@/services/api/generated/inventory-service/showtime-controller/showtime-controller'
import type {
  GetMovieCatalogParams,
  MovieResponse,
  PageResponseMovieResponse,
} from '@/services/api/generated/movie-service/model'
import type {
  CinemaResponse,
  ShowtimeResponse,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

type MovieStatusFilter = GetMovieCatalogParams['status']

export interface AdminDashboardScope {
  cinemaId: string
  movieId: string
}

export const adminDashboardKeys = {
  movieCount: (status: MovieStatusFilter) =>
    ['movies', 'admin', 'summary', status ?? 'all'] as const,
  movieOptions: ['movies', 'admin', 'dashboard', 'options'] as const,
  activeCinemas: ['cinemas', 'admin', 'summary', 'active'] as const,
  schedule: (from: string, to: string) => ['showtimes', 'admin', 'dashboard', from, to] as const,
  movieLabel: (id: string) => ['movies', 'admin', 'dashboard', 'detail', id] as const,
}

function readMovieTotal(response: PageResponseMovieResponse): number | null {
  const total = response.page?.totalElements

  return typeof total === 'number' && Number.isSafeInteger(total) && total >= 0 ? total : null
}

function dayRange(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null

  // Dashboard sử dụng ngày tại Việt Nam, không phụ thuộc timezone trình duyệt.
  const start = new Date(`${day}T00:00:00+07:00`)
  if (!Number.isFinite(start.getTime())) return null

  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    start: start.getTime(),
    end: end.getTime(),
  }
}

export function useAdminDashboardQueries(
  selectedDate: MaybeRefOrGetter<string>,
  now: MaybeRefOrGetter<Date>,
  scope: MaybeRefOrGetter<AdminDashboardScope> = { cinemaId: '', movieId: '' },
) {
  const auth = useAuthStore()
  const navigation = computed(() => getVisibleAdminNavigation(auth))

  const hasPermission = (permission: string) =>
    computed(() => navigation.value.some((item) => item.permission === permission))

  const canManageMovies = hasPermission(APP_PERMISSIONS.MOVIE_MANAGE)
  const canManageInventory = hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE)
  const canManageShowtimes = hasPermission(APP_PERMISSIONS.SHOWTIME_MANAGE)

  function useMovieCount(status: MovieStatusFilter) {
    return useQuery<
      PageResponseMovieResponse,
      ApiError,
      number | null,
      ReturnType<typeof adminDashboardKeys.movieCount>
    >({
      queryKey: adminDashboardKeys.movieCount(status),
      queryFn: () => getMovieCatalog({ page: 0, size: 1, status }),
      select: readMovieTotal,
      enabled: canManageMovies,
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false,
    })
  }

  const totalMovies = useMovieCount(undefined)
  const nowShowingMovies = useMovieCount('NOW_SHOWING')

  const activeCinemas = useQuery<CinemaResponse[], ApiError>({
    queryKey: adminDashboardKeys.activeCinemas,
    queryFn: () => getActiveCinemas(),
    enabled: computed(() => canManageInventory.value || canManageShowtimes.value),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const movieCatalog = useQuery<MovieResponse[], ApiError>({
    queryKey: adminDashboardKeys.movieOptions,
    queryFn: () => findAll(),
    enabled: canManageShowtimes,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const cinemaOptions = computed(() =>
    (activeCinemas.data.value ?? [])
      .flatMap((cinema) =>
        cinema.id && cinema.name?.trim() ? [{ value: cinema.id, label: cinema.name.trim() }] : [],
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
  )

  const movieOptions = computed(() =>
    (movieCatalog.data.value ?? [])
      .flatMap((movie) =>
        movie.id && movie.title?.trim() ? [{ value: movie.id, label: movie.title.trim() }] : [],
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
  )

  const range = computed(() => dayRange(toValue(selectedDate)))

  const showtimes = useQuery<
    ShowtimeResponse[],
    ApiError,
    ShowtimeResponse[],
    ReturnType<typeof adminDashboardKeys.schedule>
  >({
    queryKey: computed(() =>
      adminDashboardKeys.schedule(range.value?.from ?? '', range.value?.to ?? ''),
    ),
    queryFn: ({ queryKey }) => getByTimeRange({ from: queryKey[3], to: queryKey[4] }),
    enabled: computed(() => canManageShowtimes.value && range.value !== null),
    select: (response) => {
      const currentRange = range.value
      if (!currentRange) return []

      // BE dùng Between: loại suất ở đúng đầu ngày kế tiếp.
      return response.filter((item) => {
        const start = Date.parse(item.startsAt ?? '')
        return start >= currentRange.start && start < currentRange.end
      })
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const scopedShowtimes = computed(() => {
    const selectedScope = toValue(scope)

    return (showtimes.data.value ?? []).filter(
      (item) =>
        (!selectedScope.cinemaId || item.cinemaId === selectedScope.cinemaId) &&
        (!selectedScope.movieId || item.movieId === selectedScope.movieId),
    )
  })

  const upcomingShowtimes = computed(() =>
    [...scopedShowtimes.value]
      .filter(
        (item) =>
          Date.parse(item.startsAt ?? '') >= toValue(now).getTime() &&
          item.status !== 'CANCELLED' &&
          item.status !== 'COMPLETED',
      )
      .sort((a, b) => Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''))
      .slice(0, 5),
  )

  const movieIds = computed(() =>
    [...new Set(upcomingShowtimes.value.map((item) => item.movieId))].filter((id): id is string =>
      Boolean(id),
    ),
  )

  const movieQueries = useQueries({
    queries: computed(() =>
      movieIds.value.map((id) => ({
        queryKey: adminDashboardKeys.movieLabel(id),
        queryFn: (): Promise<MovieResponse> => findById(id),
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      })),
    ),
  })

  const movieLabels = computed(
    () =>
      new Map(
        movieIds.value.map((id, index) => {
          const query = movieQueries.value[index]
          const title = query?.data?.title?.trim()

          return [
            id,
            title || (query?.isPending ? 'Đang tải tên phim…' : 'Chưa tải được tên phim'),
          ] as const
        }),
      ),
  )

  const isRefreshing = computed(
    () =>
      totalMovies.isFetching.value ||
      nowShowingMovies.isFetching.value ||
      activeCinemas.isFetching.value ||
      movieCatalog.isFetching.value ||
      showtimes.isFetching.value ||
      movieQueries.value.some((query) => query.isFetching),
  )

  async function refresh() {
    const requests: Promise<unknown>[] = []

    if (canManageMovies.value) {
      requests.push(totalMovies.refetch(), nowShowingMovies.refetch())
    }

    if (canManageInventory.value || canManageShowtimes.value) {
      requests.push(activeCinemas.refetch())
    }

    if (canManageShowtimes.value && range.value) {
      requests.push(showtimes.refetch(), movieCatalog.refetch())
    }

    requests.push(...movieQueries.value.map((query) => query.refetch()))
    await Promise.allSettled(requests)
  }

  return {
    totalMovies,
    nowShowingMovies,
    activeCinemas,
    movieCatalog,
    cinemaOptions,
    movieOptions,
    showtimes,
    scopedShowtimes,
    upcomingShowtimes,
    movieLabels,
    canManageShowtimes,
    isRefreshing,
    refresh,
  }
}
