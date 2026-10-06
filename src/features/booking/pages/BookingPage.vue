<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatCinemaDateKey, formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import { isBookingUuid, useBookingContextQuery } from '../api/booking-queries'
import BookingSeatSelection from '../components/BookingSeatSelection.vue'

const route = useRoute()
const now = ref(Date.now())
let clockTimer: number | undefined

const showtimeId = computed(() => {
  const value = route.params.showtimeId
  return isBookingUuid(value) ? value.toLowerCase() : ''
})

const query = useBookingContextQuery(showtimeId)
const context = computed(() => query.data.value)

const showtimeLabel = computed(() => {
  const startsAt = context.value?.showtime.startsAt
  if (!startsAt) return ''

  return `${formatCinemaDateKey(getCinemaDateKey(startsAt))} · ${formatCinemaTime(startsAt)}`
})

const bookable = computed(() => {
  const data = context.value
  if (!data) return false

  const startsAt = Date.parse(data.showtime.startsAt ?? '')

  return (
    data.showtime.status === 'OPEN_FOR_BOOKING' &&
    Number.isFinite(startsAt) &&
    startsAt > now.value &&
    data.room.active === true &&
    data.cinema.active === true
  )
})

const selectionKey = computed(() => {
  const data = context.value

  return [
    showtimeId.value,
    data?.showtime.roomId,
    data?.showtime.movieId,
    data?.showtime.startsAt,
  ].join(':')
})

const changeShowtimeRoute = computed(() => ({
  name: ROUTE_NAMES.BOOKING_START,
  query: {
    movieId: context.value?.showtime.movieId,
  },
}))

function updateClock() {
  now.value = Date.now()
}

onMounted(() => {
  updateClock()
  clockTimer = window.setInterval(updateClock, 1_000)
  document.addEventListener('visibilitychange', updateClock)
})

onBeforeUnmount(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', updateClock)
})
</script>

<template>
  <div class="booking-page">
    <AppContainer>
      <nav class="booking-start__breadcrumb" aria-label="Đường dẫn trang">
        <AppLink :to="{ name: ROUTE_NAMES.HOME }" variant="muted"> Trang chủ </AppLink>
        <span aria-hidden="true">/</span>
        <AppLink :to="changeShowtimeRoute" variant="muted"> Đặt vé </AppLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Chọn ghế</span>
      </nav>

      <h1 class="booking-start__title booking-page__title">Chọn ghế</h1>

      <p v-if="!showtimeId" class="booking-error" role="alert">
        Mã suất chiếu trong đường dẫn không hợp lệ.
      </p>

      <p v-else-if="query.isPending.value && !context" class="booking-note" role="status">
        Đang tải thông tin suất chiếu…
      </p>

      <div v-else-if="query.isError.value && !context" class="booking-panel">
        <p class="booking-error" role="alert">
          {{
            query.error.value?.status === 404
              ? 'Không tìm thấy thông tin đặt vé cho suất chiếu này.'
              : 'Không thể tải thông tin suất chiếu. Vui lòng thử lại.'
          }}
        </p>
        <AppButton :loading="query.isFetching.value" @click="query.refetch()"> Thử lại </AppButton>
      </div>

      <template v-else-if="context">
        <section class="booking-panel booking-context" aria-labelledby="booking-movie-title">
          <h2 id="booking-movie-title">
            {{ context.movie.title || 'Chưa có tên phim' }}
          </h2>

          <dl class="booking-context__details">
            <div>
              <dt>Rạp</dt>
              <dd>{{ context.cinema.name || context.showtime.cinemaName }}</dd>
            </div>
            <div>
              <dt>Phòng</dt>
              <dd>{{ context.room.name || context.showtime.roomName }}</dd>
            </div>
            <div>
              <dt>Suất chiếu</dt>
              <dd>{{ showtimeLabel }}</dd>
            </div>
          </dl>

          <p v-if="context.cinema.address" class="booking-note">
            {{ context.cinema.address }}
          </p>

          <AppLink :to="changeShowtimeRoute"> Chọn suất chiếu khác </AppLink>
        </section>

        <div v-if="query.isError.value" class="booking-panel">
          <p class="booking-error" role="alert">
            Không thể cập nhật thông tin suất chiếu. Tạm dừng chọn ghế.
          </p>
          <AppButton variant="ghost" :loading="query.isFetching.value" @click="query.refetch()">
            Thử lại
          </AppButton>
        </div>

        <p v-if="!bookable" class="booking-notice" role="status">
          Suất chiếu này hiện không nhận đặt vé. Vui lòng chọn suất chiếu khác.
        </p>

        <BookingSeatSelection
          v-else
          :key="selectionKey"
          :showtime-id="showtimeId"
          :room-id="context.showtime.roomId!"
          :disabled="query.isError.value || query.isFetching.value"
        />
      </template>

      <p v-else class="booking-error" role="alert">
        Thông tin suất chiếu chưa đầy đủ hoặc không khớp. Vui lòng chọn lại suất chiếu.
      </p>
    </AppContainer>
  </div>
</template>
