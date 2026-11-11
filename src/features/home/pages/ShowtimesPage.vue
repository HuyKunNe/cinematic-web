<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { CalendarDays, MapPin } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateStrip from '@/components/ui/AppDateStrip.vue'
import { useCinemaLocation } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
import { getCinemaDateKey, getCinemaDayRange, formatCinemaTime } from '@/utils/cinema-time'
import { useHomeMovies } from '../api/home-queries'
import { useCustomerSchedule, type CustomerScheduleSlot } from '../api/customer-schedule'

const route = useRoute()
const router = useRouter()
const {
  query: locationQuery,
  cinemas,
  selectedCity,
  selectedCinema,
  location,
  selectCinemaById,
} = useCinemaLocation()
const catalog = useHomeMovies()
const now = useNow({ interval: 1000 })
const today = computed(() => getCinemaDateKey(now.value.toISOString()))
const mode = ref(route.query.mode === 'cinema' ? 'cinema' : 'movie')
const movieId = ref(typeof route.query.movieId === 'string' ? route.query.movieId : '')
const date = ref(
  typeof route.query.date === 'string' && getCinemaDayRange(route.query.date)
    ? route.query.date
    : today.value,
)
const format = ref('')
const checkingId = ref('')
const error = ref('')
const cityCinemas = computed(() =>
  cinemas.value.filter((cinema) => cinema.cityKey === selectedCity.value?.key),
)
const movies = computed(() => catalog.data.value ?? [])
const movie = computed(() => movies.value.find((item) => item.id === movieId.value))
const validDate = computed(() => !!getCinemaDayRange(date.value) && date.value >= today.value)
const locationReady = computed(
  () =>
    locationQuery.isSuccess.value &&
    !locationQuery.isFetching.value &&
    !locationQuery.isError.value,
)
const requests = computed(() => {
  const range = getCinemaDayRange(date.value)
  if (
    !range ||
    !validDate.value ||
    !locationReady.value ||
    !selectedCity.value ||
    (mode.value === 'movie' && !movie.value)
  )
    return []
  const targets =
    mode.value === 'cinema'
      ? cityCinemas.value.filter((cinema) => cinema.id === selectedCinema.value?.id)
      : cityCinemas.value
  return targets.map((cinema) => ({
    cinemaId: cinema.id,
    ...range,
    ...(mode.value === 'movie' ? { movieId: movieId.value } : {}),
  }))
})
const results = useCustomerSchedule(requests)
const loading = computed(() => results.value.some((query) => query.isFetching))
const failed = computed(() => results.value.some((query) => query.isError))
const slots = computed(() =>
  results.value
    .flatMap((query) => (query.isSuccess ? (query.data ?? []) : []))
    .filter((slot) => Date.parse(slot.startsAt) > now.value.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
)
const formats = computed(() =>
  [
    ...new Set(
      slots.value.flatMap((slot) =>
        slot.screeningVersion?.contentFormat ? [slot.screeningVersion.contentFormat] : [],
      ),
    ),
  ].sort(),
)
const filtered = computed(() =>
  slots.value.filter(
    (slot) => !format.value || slot.screeningVersion?.contentFormat === format.value,
  ),
)
const groups = computed(() => {
  const map = new Map<
    string,
    {
      id: string
      title: string
      subtitle: string
      poster: string | null
      slots: CustomerScheduleSlot[]
    }
  >()
  for (const slot of filtered.value) {
    const key = mode.value === 'movie' ? slot.cinemaId : slot.movieId
    let group = map.get(key)
    if (!group) {
      const cinema = cinemas.value.find((item) => item.id === slot.cinemaId)
      const film = movies.value.find((item) => item.id === slot.movieId)
      group = {
        id: key,
        title:
          mode.value === 'movie'
            ? (cinema?.name ?? slot.cinemaId)
            : (film?.title ?? `Mã phim: ${slot.movieId}`),
        subtitle:
          mode.value === 'movie'
            ? (cinema?.address ?? '')
            : film?.durationMinutes
              ? `${film.durationMinutes} phút · ${film.genres.join(', ')}`
              : '',
        poster:
          mode.value === 'cinema' ? film?.posterUrl || '/customer/movie-placeholder.svg' : null,
        slots: [],
      }
      map.set(key, group)
    }
    group.slots.push(slot)
  }
  return [...map.values()]
})
const scope = computed(() =>
  [mode.value, location.selectedCityKey, selectedCinema.value?.id, movieId.value, date.value].join(
    '|',
  ),
)
watch(scope, () => {
  error.value = ''
})
watch(today, (value) => {
  if (date.value < value) date.value = value
})
watch(
  movies,
  (items) => {
    if (!movieId.value && items.length)
      movieId.value = (items.find((item) => item.status === 'NOW_SHOWING') ?? items[0])!.id
  },
  { immediate: true },
)
function changeCinema(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  const cinema = cityCinemas.value.find((item) => item.id === id)
  if (cinema) selectCinemaById(cinema.id, cinema.cityKey)
}
function caption(slot: CustomerScheduleSlot) {
  const version = slot.screeningVersion
  const technology: Record<string, string> = {
    STANDARD: 'Tiêu chuẩn',
    FOUR_DX: '4DX',
    SCREEN_X: 'ScreenX',
    IMAX: 'IMAX',
  }
  return (
    [
      version?.contentFormat,
      version?.projectionTechnology
        ? (technology[version.projectionTechnology] ?? version.projectionTechnology)
        : '',
      version?.audioLanguage,
      version?.presentationType === 'SUBTITLED'
        ? 'Phụ đề'
        : version?.presentationType === 'DUBBED'
          ? 'Lồng tiếng'
          : '',
      slot.roomName,
    ]
      .filter(Boolean)
      .join(' · ') || 'Phiên bản đang cập nhật'
  )
}
async function choose(slot: CustomerScheduleSlot) {
  if (checkingId.value || loading.value || !locationReady.value) return
  const chosenScope = scope.value
  const index = requests.value.findIndex((request) => request.cinemaId === slot.cinemaId)
  const query = results.value[index]
  if (!query) return
  checkingId.value = slot.id
  error.value = ''
  try {
    const result = await query.refetch()
    if (scope.value !== chosenScope) return
    if (
      result.isError ||
      !result.data?.some((item) => item.id === slot.id && Date.parse(item.startsAt) > Date.now())
    ) {
      error.value = 'Suất chiếu vừa thay đổi hoặc chưa thể kiểm tra. Vui lòng chọn lại.'
      return
    }
    const cinema = cityCinemas.value.find((item) => item.id === slot.cinemaId)
    if (!cinema || !selectCinemaById(cinema.id, cinema.cityKey)) {
      error.value = 'Địa điểm đang cập nhật. Vui lòng thử lại.'
      return
    }
    await router.push({ name: ROUTE_NAMES.BOOKING, params: { showtimeId: slot.id } })
  } catch {
    error.value = 'Chưa thể mở đặt vé. Vui lòng thử lại.'
  } finally {
    checkingId.value = ''
  }
}
async function retry() {
  await Promise.all(results.value.map((query) => query.refetch()))
}
</script>

<template>
  <div class="booking-start-page lumiere-schedule">
    <AppContainer>
      <header class="lumiere-account-heading">
        <p class="lumiere-eyebrow">DÀNH THỜI GIAN CHO ĐIỀU BẠN THÍCH</p>
        <h1>Hôm nay, xem gì?</h1>
        <p>
          Lịch chiếu {{ selectedCity ? `tại ${selectedCity.name}` : 'theo thành phố bạn chọn' }} ·
          Giờ Việt Nam (UTC+7)
        </p>
      </header>
      <TabsRoot v-model="mode"
        ><TabsList class="lumiere-schedule__tabs" aria-label="Cách xem lịch chiếu"
          ><TabsTrigger value="movie" :disabled="!!checkingId">Theo phim</TabsTrigger
          ><TabsTrigger value="cinema" :disabled="!!checkingId">Theo rạp</TabsTrigger></TabsList
        >
        <TabsContent v-for="pane in ['movie', 'cinema']" :key="pane" :value="pane"
          ><div class="lumiere-schedule__filters">
            <label v-if="pane === 'movie'"
              ><span>Phim muốn xem</span
              ><select v-model="movieId" :disabled="!!checkingId || catalog.isFetching.value">
                <option value="">Chọn phim</option>
                <option v-for="film in movies" :key="film.id" :value="film.id">
                  {{ film.title }}{{ film.status === 'UPCOMING' ? ' · Sắp chiếu' : '' }}
                </option>
              </select></label
            >
            <label v-else
              ><span>Rạp của bạn</span
              ><select
                :value="selectedCinema?.id || ''"
                :disabled="!!checkingId || !locationReady || !selectedCity"
                @change="changeCinema"
              >
                <option value="">Chọn rạp chiếu</option>
                <option v-for="cinema in cityCinemas" :key="cinema.id" :value="cinema.id">
                  {{ cinema.name }}
                </option>
              </select></label
            >
            <label
              ><span>Định dạng</span
              ><select v-model="format" :disabled="!!checkingId">
                <option value="">Tất cả định dạng</option>
                <option v-for="value in formats" :key="value" :value="value">{{ value }}</option>
              </select></label
            >
            <label
              ><span>Ngày khác</span
              ><input
                v-model="date"
                type="date"
                :min="today"
                :aria-invalid="!validDate"
                :disabled="!!checkingId"
            /></label></div
        ></TabsContent>
      </TabsRoot>
      <AppDateStrip v-model="date" :start-date="today" :disabled="!!checkingId" />
      <p v-if="!validDate" class="booking-error" role="alert">
        Chọn ngày hợp lệ từ hôm nay trở đi.
      </p>
      <div v-if="locationQuery.isError.value" class="booking-panel">
        <p class="booking-error">Không thể tải thành phố và rạp.</p>
        <AppButton variant="ghost" @click="locationQuery.refetch()">Tải lại địa điểm</AppButton>
      </div>
      <div v-if="catalog.isError.value" class="booking-panel">
        <p class="booking-error">Chưa thể cập nhật tên phim.</p>
        <AppButton variant="ghost" @click="catalog.refetch()">Tải lại phim</AppButton>
      </div>
      <div v-if="locationReady && !cinemas.length" class="lumiere-empty">
        <MapPin aria-hidden="true" />
        <h2>Lịch chiếu sẽ được cập nhật</h2>
        <p>Chưa có rạp đang hoạt động để xem lịch.</p>
      </div>
      <div v-else-if="!selectedCity" class="lumiere-empty">
        <MapPin aria-hidden="true" />
        <h2>Cuộc hẹn ở thành phố nào?</h2>
        <p>Chọn thành phố ở đầu trang để xem rạp và lịch chiếu phù hợp.</p>
      </div>
      <div v-else-if="mode === 'cinema' && !selectedCinema" class="lumiere-empty">
        <h2>Chọn rạp của bạn</h2>
        <p>Các suất chiếu sẽ hiển thị theo phim tại rạp đã chọn.</p>
      </div>
      <div
        v-else-if="mode === 'movie' && !movie && !catalog.isPending.value && !catalog.isError.value"
        class="lumiere-empty"
      >
        <h2>{{ movies.length ? 'Chọn phim muốn xem' : 'Phim sẽ được cập nhật' }}</h2>
        <p>Chọn phim trong bộ lọc để xem các suất mở bán.</p>
      </div>
      <p
        v-if="loading || locationQuery.isFetching.value || catalog.isFetching.value"
        class="booking-note"
        role="status"
      >
        Đang cập nhật lịch chiếu…
      </p>
      <div v-if="failed" class="booking-panel">
        <p class="booking-error" role="alert">
          Một số rạp chưa tải được lịch. Các suất đã tải vẫn được hiển thị.
        </p>
        <AppButton variant="ghost" :disabled="loading || !!checkingId" @click="retry"
          >Tải lại lịch</AppButton
        >
      </div>
      <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
      <div class="lumiere-schedule__groups">
        <article v-for="group in groups" :key="group.id" class="lumiere-show-group">
          <img
            v-if="group.poster"
            :src="group.poster"
            alt="Poster phim"
            loading="lazy"
            @error="($event.target as HTMLImageElement).src = '/customer/movie-placeholder.svg'"
          />
          <div>
            <header>
              <h2>{{ group.title }}</h2>
              <p>{{ group.subtitle }}</p>
            </header>
            <div class="lumiere-show-group__slots">
              <button
                v-for="slot in group.slots"
                :key="slot.id"
                type="button"
                :disabled="loading || !!checkingId || !locationReady"
                @click="choose(slot)"
              >
                <strong>{{ formatCinemaTime(slot.startsAt) }}</strong
                ><span>{{ caption(slot) }}</span
                ><small>{{ checkingId === slot.id ? 'Đang kiểm tra…' : 'Đang mở bán' }}</small>
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="requests.length && !loading && !failed && !groups.length" class="lumiere-empty">
        <CalendarDays aria-hidden="true" />
        <h2>Chưa có suất chiếu phù hợp</h2>
        <p>Thử đổi ngày, rạp, phim hoặc định dạng để tìm cuộc hẹn khác.</p>
        <AppButton v-if="format" variant="ghost" @click="format = ''"
          >Xem tất cả định dạng</AppButton
        >
      </div>
      <p v-if="groups.length" class="booking-note">
        Chọn giờ để tiếp tục. Ghế và giá vé được kiểm tra ở bước chọn ghế.
      </p>
    </AppContainer>
  </div>
</template>
