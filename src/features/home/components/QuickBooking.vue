<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Clapperboard, Clock3, MapPin } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { HomeMovie } from '../models/home-movie'
import { useHomeCinemas, useHomeShowtimes } from '../api/home-queries'

const props = defineProps<{ movies: HomeMovie[] }>()
const router = useRouter()
const selectedCinemaId = ref('')
const selectedMovieId = ref('')
const selectedDate = ref('')
const selectedShowtimeId = ref('')
const cinemasQuery = useHomeCinemas()
const showtimesQuery = useHomeShowtimes(selectedMovieId)
const cinemas = computed(() => cinemasQuery.data.value ?? [])
const available = computed(() =>
  (showtimesQuery.data.value ?? [])
    .filter(
      (showtime) =>
        showtime.cinemaId === selectedCinemaId.value &&
        showtime.status === 'OPEN_FOR_BOOKING' &&
        Boolean(showtime.id && showtime.startsAt) &&
        new Date(showtime.startsAt!).getTime() > Date.now(),
    )
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()),
)
const dates = computed(() => [...new Set(available.value.map((item) => localDate(item.startsAt!)))])
const times = computed(() =>
  available.value.filter((item) => localDate(item.startsAt!) === selectedDate.value),
)
const canContinue = computed(() => times.value.some((item) => item.id === selectedShowtimeId.value))

function localDate(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function labelDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}
function labelTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
watch([selectedCinemaId, selectedMovieId], () => {
  selectedDate.value = ''
  selectedShowtimeId.value = ''
})
watch(selectedDate, () => {
  selectedShowtimeId.value = ''
})
watch(available, (items) => {
  if (!items.some((item) => item.id === selectedShowtimeId.value)) selectedShowtimeId.value = ''
})

function continueBooking() {
  if (canContinue.value)
    void router.push({
      name: ROUTE_NAMES.BOOKING,
      params: { showtimeId: selectedShowtimeId.value },
    })
}
</script>

<template>
  <section
    id="quick-booking"
    class="home-container home-booking"
    aria-labelledby="quick-booking-title"
  >
    <h2 id="quick-booking-title">Đặt vé nhanh</h2>
    <div class="home-booking__step">
      <label for="home-cinema"
        ><span class="home-booking__number">01</span
        ><span class="home-booking__label">Chọn rạp</span></label
      >
      <div class="home-booking__control">
        <MapPin aria-hidden="true" /><span class="home-booking__mobile-label">Rạp</span
        ><select
          id="home-cinema"
          v-model="selectedCinemaId"
          :disabled="cinemasQuery.isPending.value"
        >
          <option value="">
            {{ cinemasQuery.isPending.value ? 'Đang tải rạp…' : 'Chọn rạp' }}
          </option>
          <option v-for="cinema in cinemas" :key="cinema.id" :value="cinema.id">
            {{ cinema.name }}
          </option>
        </select>
      </div>
    </div>
    <span class="home-booking__chevron" aria-hidden="true">›</span>
    <div class="home-booking__step">
      <label for="home-movie"
        ><span class="home-booking__number">02</span
        ><span class="home-booking__label">Chọn phim</span></label
      >
      <div class="home-booking__control">
        <Clapperboard aria-hidden="true" /><span class="home-booking__mobile-label">Phim</span
        ><select id="home-movie" v-model="selectedMovieId">
          <option value="">Chọn phim</option>
          <option v-for="movie in movies" :key="movie.id" :value="movie.id">
            {{ movie.title }}
          </option>
        </select>
      </div>
    </div>
    <span class="home-booking__chevron" aria-hidden="true">›</span>
    <div class="home-booking__step">
      <label for="home-date"
        ><span class="home-booking__number">03</span
        ><span class="home-booking__label">Chọn ngày</span></label
      >
      <div class="home-booking__control">
        <CalendarDays aria-hidden="true" /><span class="home-booking__mobile-label">Ngày</span
        ><select
          id="home-date"
          v-model="selectedDate"
          :disabled="!selectedCinemaId || !selectedMovieId || showtimesQuery.isFetching.value"
        >
          <option value="">Chọn ngày</option>
          <option v-for="date in dates" :key="date" :value="date">{{ labelDate(date) }}</option>
        </select>
      </div>
    </div>
    <span class="home-booking__chevron" aria-hidden="true">›</span>
    <div class="home-booking__step">
      <label for="home-showtime"
        ><span class="home-booking__number">04</span
        ><span class="home-booking__label">Chọn suất</span></label
      >
      <div class="home-booking__control">
        <Clock3 aria-hidden="true" /><span class="home-booking__mobile-label">Suất chiếu</span
        ><select id="home-showtime" v-model="selectedShowtimeId" :disabled="!selectedDate">
          <option value="">Chọn suất</option>
          <option v-for="showtime in times" :key="showtime.id" :value="showtime.id">
            {{ labelTime(showtime.startsAt!) }} · {{ showtime.roomName }}
          </option>
        </select>
      </div>
    </div>
    <button
      class="home-button home-button--primary home-booking__continue"
      type="button"
      :disabled="!canContinue"
      @click="continueBooking"
    >
      Tiếp tục →
    </button>
    <p
      v-if="cinemasQuery.isError.value || showtimesQuery.isError.value"
      class="home-booking__feedback"
      role="alert"
    >
      Không thể tải rạp hoặc suất chiếu. Vui lòng thử lại sau.
    </p>
    <p
      v-else-if="
        selectedMovieId && selectedCinemaId && !showtimesQuery.isFetching.value && !available.length
      "
      class="home-booking__feedback"
      role="status"
    >
      Chưa có suất mở bán tại rạp này.
    </p>
  </section>
</template>
