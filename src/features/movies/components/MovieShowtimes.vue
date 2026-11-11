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
  dateValid,
  showtimesQuery,
  roomsQuery,
  showtimes,
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
  if (checkingId.value || locationQuery.isFetching.value || locationQuery.isError.value) return
  const cinema = cinemaOptions.value.find(
    (item) => item.id === (event.target as HTMLSelectElement).value,
  )
  if (cinema) selectCinemaById(cinema.id, cinema.cityKey)
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
      <p class="movie-detail__eyebrow">Lịch chiếu</p>
      <h2 id="movie-showtimes-title">Chọn rạp và suất chiếu</h2>
    </div>

    <AppDateStrip v-model="selectedDate" :start-date="today" :disabled="!!checkingId" />
    <div class="movie-showtimes__controls">
      <div class="movie-showtimes__location">
        <span class="movie-showtimes__label">Rạp chiếu</span>

        <select
          v-if="selectedCity"
          class="lumiere-movie-cinema"
          :value="selectedCinema?.id ?? ''"
          aria-label="Chọn rạp chiếu"
          :disabled="!!checkingId || locationQuery.isFetching.value || locationQuery.isError.value"
          @change="changeCinema"
        >
          <option value="">Chọn rạp của bạn</option>
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
        <span class="movie-showtimes__label">Ngày chiếu</span>

        <input
          v-model="selectedDate"
          type="date"
          :min="today"
          :disabled="Boolean(checkingId)"
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
      v-else-if="!selectedCinema"
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

    <article v-else class="movie-showtimes__panel">
      <header class="movie-showtimes__cinema">
        <p class="movie-detail__eyebrow">{{ selectedCity?.name }}</p>
        <h3>{{ selectedCinema.name }}</h3>
        <p v-if="selectedCinema.address">{{ selectedCinema.address }}</p>
      </header>

      <p
        v-if="showtimesQuery.isPending.value || showtimesQuery.isFetching.value"
        id="movie-showtimes-feedback"
        class="movie-detail__notice"
        role="status"
      >
        {{ checkingId ? 'Đang kiểm tra lại suất chiếu…' : 'Đang tải suất chiếu…' }}
      </p>

      <AppErrorState
        v-else-if="showtimesQuery.isError.value"
        title="Không thể tải suất chiếu"
        description="Vui lòng kiểm tra kết nối và thử lại."
        show-retry
        :retrying="showtimesQuery.isFetching.value"
        @retry="retryShowtimes"
      />

      <AppEmptyState
        v-else-if="!showtimes.length"
        title="Chưa có suất mở bán trong ngày này"
        description="Bạn có thể chọn ngày khác hoặc đổi thành phố và rạp."
      />

      <template v-else>
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

        <div class="movie-showtimes__list" aria-label="Các suất đang mở bán">
          <button
            v-for="showtime in showtimes"
            :key="showtime.id"
            class="movie-showtimes__slot"
            type="button"
            :disabled="!canBook"
            @click="selectShowtime(showtime.id)"
          >
            <strong>{{ formatCinemaTime(showtime.startsAt) }}</strong>
            <span>{{ roomCaption(showtime) }}</span>
          </button>
        </div>

        <p id="movie-showtimes-feedback" class="movie-detail__notice">
          Chọn giờ chiếu phù hợp để tiếp tục đặt vé.
        </p>
      </template>
    </article>

    <p v-if="navigationError" class="movie-showtimes__error" role="alert">
      {{ navigationError }}
    </p>
  </section>
</template>
