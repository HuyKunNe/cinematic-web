<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateStrip from '@/components/ui/AppDateStrip.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import { useCinemaLocation, useCinemaLocationDialog } from '@/features/cinemas'
import { formatCinemaTime } from '@/utils/cinema-time'
import { useMovieShowtimes } from '../composables/use-movie-showtimes'

const props = defineProps<{
  movieId: string
}>()

const {
  locationQuery,
  selectedCinema,
  selectedCity,
  locationDescription,
  today,
  selectedDate,
  selectedFormat,
  formats,
  updatingFilters,
  updateFilters,
  dateValid,
  showtimesQuery,
  roomsQuery,
  showtimes,
  showtimeGroups,
  checkingId,
  navigationError,
  canBook,
  roomCaption,
  retryShowtimes,
  selectShowtime,
} = useMovieShowtimes(() => props.movieId)

const { isOpen: locationOpen, open } = useCinemaLocationDialog()
const { cinemas, selectCinemaById } = useCinemaLocation()
const cinemaOptions = computed(() =>
  cinemas.value.filter((cinema) => cinema.cityKey === selectedCity.value?.key),
)
function changeCinema(event: Event) {
  if (
    checkingId.value ||
    updatingFilters.value ||
    locationQuery.isFetching.value ||
    locationQuery.isError.value
  )
    return
  if ((event.target as HTMLSelectElement).value === 'all') {
    void updateFilters({ cinema: 'all' })
    return
  }
  const cinema = cinemaOptions.value.find(
    (item) => item.id === (event.target as HTMLSelectElement).value,
  )
  if (cinema && selectCinemaById(cinema.id, cinema.cityKey))
    void updateFilters({ cinema: cinema.id })
}

function openLocation(event: MouseEvent) {
  if (checkingId.value) return

  if (event.currentTarget instanceof HTMLButtonElement) {
    open(event.currentTarget)
  }
}

function retryLocation() {
  void locationQuery.refetch()
}

function retryRooms() {
  void roomsQuery.refetch()
}
</script>

<template>
  <section
    id="movie-showtimes"
    class="movie-showtimes"
    aria-labelledby="movie-showtimes-title"
    tabindex="-1"
  >
    <div class="movie-showtimes__heading">
      <p class="movie-detail__eyebrow">CHỌN MỘT CUỘC HẸN</p>
      <h2 id="movie-showtimes-title">Lịch chiếu</h2>
    </div>

    <AppDateStrip
      v-model="selectedDate"
      :start-date="today"
      :disabled="!!checkingId || updatingFilters"
    />
    <div class="movie-showtimes__controls">
      <div class="movie-showtimes__location">
        <span class="movie-showtimes__label">Rạp chiếu</span>

        <select
          v-if="selectedCity"
          class="lumiere-movie-cinema"
          :value="selectedCinema?.id ?? 'all'"
          aria-label="Chọn rạp chiếu"
          :disabled="
            !!checkingId ||
            updatingFilters ||
            locationQuery.isFetching.value ||
            locationQuery.isError.value
          "
          @change="changeCinema"
        >
          <option value="all">Tất cả rạp tại {{ selectedCity.name }}</option>
          <option v-for="cinema in cinemaOptions" :key="cinema.id" :value="cinema.id">
            {{ cinema.name }}
          </option>
        </select>
        <AppButton
          v-else
          variant="ghost"
          data-location-trigger
          aria-haspopup="dialog"
          aria-controls="cinema-location-dialog"
          :aria-expanded="locationOpen"
          :aria-label="locationDescription"
          :disabled="Boolean(checkingId) || locationQuery.isPending.value"
          @click="openLocation"
        >
          {{ selectedCinema ? `${selectedCinema.name}` : 'Chọn thành phố và rạp' }}
        </AppButton>
      </div>

      <label class="movie-showtimes__date">
        <span class="movie-showtimes__label">Định dạng phim</span>
        <select
          v-model="selectedFormat"
          class="lumiere-movie-cinema"
          :disabled="!!checkingId || updatingFilters || !selectedCity"
        >
          <option value="">Tất cả định dạng</option>
          <option v-for="format in formats" :key="format" :value="format">{{ format }}</option>
          <option
            v-if="selectedFormat && !formats.some((format) => format === selectedFormat)"
            :value="selectedFormat"
          >
            {{ selectedFormat }} · Chưa có suất phù hợp
          </option>
        </select>
      </label>

      <label class="movie-showtimes__date">
        <span class="movie-showtimes__label">Ngày chiếu</span>

        <input
          v-model="selectedDate"
          type="date"
          :min="today"
          :disabled="Boolean(checkingId) || updatingFilters"
          :aria-invalid="!dateValid || undefined"
          aria-describedby="movie-showtimes-feedback"
        />
      </label>
    </div>

    <p
      v-if="locationQuery.isPending.value || locationQuery.isFetching.value"
      id="movie-showtimes-feedback"
      class="movie-detail__notice"
      role="status"
    >
      Đang cập nhật địa điểm…
    </p>

    <AppErrorState
      v-else-if="locationQuery.isError.value"
      title="Không thể tải địa điểm"
      description="Vui lòng thử lại để cập nhật thành phố và rạp."
      show-retry
      :retrying="locationQuery.isFetching.value"
      @retry="retryLocation"
    />

    <AppEmptyState
      v-else-if="!selectedCity"
      title="Chọn địa điểm xem phim"
      description="Chọn thành phố và rạp để xem các suất đang mở bán."
    />

    <p
      v-else-if="!dateValid"
      id="movie-showtimes-feedback"
      class="movie-detail__notice"
      role="alert"
    >
      Vui lòng chọn ngày hôm nay hoặc một ngày tiếp theo.
    </p>

    <div v-else class="movie-showtimes__results">
      <p
        v-if="
          (showtimesQuery.isPending.value || showtimesQuery.isFetching.value) && !showtimes.length
        "
        id="movie-showtimes-feedback"
        class="movie-detail__notice"
        role="status"
      >
        {{ checkingId ? 'Đang kiểm tra lại suất chiếu…' : 'Đang tải suất chiếu…' }}
      </p>

      <AppErrorState
        v-else-if="showtimesQuery.isError.value && !showtimes.length"
        title="Không thể tải suất chiếu"
        description="Vui lòng kiểm tra kết nối và thử lại."
        show-retry
        :retrying="showtimesQuery.isFetching.value"
        @retry="retryShowtimes"
      />

      <template v-else-if="!showtimes.length">
        <AppEmptyState
          title="Chưa có suất mở bán trong ngày này"
          description="Bạn có thể chọn ngày khác, đổi định dạng hoặc đổi thành phố và rạp."
        />

        <AppButton
          v-if="selectedFormat"
          variant="ghost"
          :disabled="updatingFilters"
          @click="selectedFormat = ''"
          >Xem tất cả định dạng</AppButton
        >
      </template>

      <template v-else>
        <div v-if="showtimesQuery.isError.value" class="movie-showtimes__room-notice" role="alert">
          <p>Một số rạp chưa tải được lịch chiếu. Các suất đã tải vẫn được hiển thị.</p>
          <AppButton
            variant="ghost"
            size="sm"
            :loading="showtimesQuery.isFetching.value"
            :disabled="Boolean(checkingId)"
            @click="retryShowtimes"
            >Tải lại lịch</AppButton
          >
        </div>
        <p v-else-if="showtimesQuery.isFetching.value" class="movie-detail__notice" role="status">
          {{ checkingId ? 'Đang kiểm tra lại suất chiếu…' : 'Đang cập nhật lịch chiếu…' }}
        </p>
        <div v-if="roomsQuery.isError.value" class="movie-showtimes__room-notice" role="status">
          <p>Chưa thể cập nhật loại phòng. Bạn vẫn có thể chọn suất theo giờ chiếu.</p>

          <AppButton
            variant="ghost"
            size="sm"
            :loading="roomsQuery.isFetching.value"
            :disabled="Boolean(checkingId)"
            @click="retryRooms"
          >
            Tải lại loại phòng
          </AppButton>
        </div>

        <article
          v-for="group in showtimeGroups"
          :key="group.cinema.id"
          class="movie-showtimes__panel"
        >
          <header class="movie-showtimes__cinema">
            <p class="movie-detail__eyebrow">{{ group.cinema.city }}</p>
            <h3>{{ group.cinema.name }}</h3>
            <p v-if="group.cinema.address">{{ group.cinema.address }}</p>
          </header>
          <div class="movie-showtimes__list" aria-label="Các suất đang mở bán">
            <button
              v-for="showtime in group.slots"
              :key="showtime.id"
              class="movie-showtimes__slot"
              type="button"
              :disabled="!canBook"
              :aria-busy="checkingId === showtime.id"
              @click="selectShowtime(showtime.id)"
            >
              <strong>{{ formatCinemaTime(showtime.startsAt) }}</strong>
              <span>{{ roomCaption(showtime) }}</span>
            </button>
          </div>
        </article>
        <p id="movie-showtimes-feedback" class="movie-detail__notice" role="status">
          {{
            checkingId
              ? 'Đang kiểm tra suất chiếu và mở chọn ghế…'
              : 'Chọn giờ chiếu phù hợp để tiếp tục đặt vé.'
          }}
        </p>
      </template>
    </div>

    <p v-if="navigationError" class="movie-showtimes__error" role="alert">
      {{ navigationError }}
    </p>
  </section>
</template>
