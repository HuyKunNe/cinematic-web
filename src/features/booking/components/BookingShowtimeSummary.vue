<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { formatCinemaDateKey, formatCinemaTime, getCinemaDateKey } from '@/utils/cinema-time'
import { useBookingContextQuery } from '../api/booking-queries'

const props = defineProps<{ showtimeId: string; allowNewBooking: boolean; disabled: boolean }>()
const query = useBookingContextQuery(() => props.showtimeId, { poll: false })
const context = computed(() => query.data.value)
const imageFailed = ref(false)
const image = computed(() =>
  imageFailed.value || !context.value?.movie.posterUrl
    ? '/customer/movie-placeholder.svg'
    : context.value.movie.posterUrl,
)
const showtimeLabel = computed(() => {
  const startsAt = context.value?.showtime.startsAt
  return startsAt
    ? `${formatCinemaTime(startsAt)} · ${formatCinemaDateKey(getCinemaDateKey(startsAt))}`
    : ''
})
const chooseShowtime = computed(() => ({
  name: ROUTE_NAMES.BOOKING_START,
  query: { movieId: context.value?.movie.id },
}))
</script>

<template>
  <section class="booking-panel booking-order-showtime" aria-labelledby="order-showtime-title">
    <h2 id="order-showtime-title">Thông tin suất và vé</h2>
    <p v-if="query.isPending.value" class="booking-note" role="status">
      Đang tải thông tin phim và suất chiếu…
    </p>
    <div v-if="query.isError.value || (query.isSuccess.value && !context)">
      <p class="booking-note" role="status">
        Chưa thể tải thông tin phim/rạp. Thông tin đơn và giá vé đã lưu vẫn được giữ nguyên.
      </p>
      <AppButton
        variant="ghost"
        size="sm"
        :loading="query.isFetching.value"
        :disabled="disabled"
        @click="query.refetch()"
        >Tải lại thông tin suất</AppButton
      >
    </div>
    <div v-if="context" class="booking-order-showtime__body">
      <img :src="image" :alt="context.movie.title || 'Poster phim'" @error="imageFailed = true" />
      <div>
        <h3>{{ context.movie.title }}</h3>
        <p v-if="context.movie.durationMinutes" class="booking-note">
          {{ context.movie.durationMinutes }} phút<template v-if="context.movie.ageRating">
            · {{ context.movie.ageRating }}</template
          >
        </p>
        <dl>
          <div>
            <dt>Rạp</dt>
            <dd>{{ context.cinema.name }}</dd>
          </div>
          <div>
            <dt>Phòng</dt>
            <dd>{{ context.room.name }}</dd>
          </div>
          <div>
            <dt>Suất chiếu</dt>
            <dd>{{ showtimeLabel }}</dd>
          </div>
          <div v-if="context.showtime.screeningVersion?.contentFormat">
            <dt>Phiên bản</dt>
            <dd>
              {{ context.showtime.screeningVersion.contentFormat
              }}<template v-if="context.showtime.screeningVersion.audioLanguage">
                · {{ context.showtime.screeningVersion.audioLanguage }}</template
              >
            </dd>
          </div>
        </dl>
      </div>
    </div>
    <slot />
    <AppLink v-if="allowNewBooking && !disabled" :to="chooseShowtime">Chọn suất chiếu khác</AppLink>
  </section>
</template>

<style scoped>
@reference '../../../styles/main.css';
.booking-order-showtime {
  --order-showtime-poster-width: 6rem;
}
.booking-order-showtime__body {
  display: grid;
  grid-template-columns: var(--order-showtime-poster-width) minmax(0, 1fr);
  align-items: start;
  gap: var(--space-5);
  margin-block: var(--space-4);
}
.booking-order-showtime__body > img {
  width: 100%;
  aspect-ratio: var(--lumiere-poster-ratio);
  object-fit: cover;
  border-radius: var(--radius-md);
}
.booking-order-showtime__body > div {
  min-width: 0;
}
.booking-order-showtime h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  overflow-wrap: anywhere;
}
.booking-order-showtime dl {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
}
.booking-order-showtime dl > div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}
.booking-order-showtime dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.booking-order-showtime dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
@variant lumiere-mobile {
  .booking-order-showtime {
    --order-showtime-poster-width: 4.0625rem;
  }
}
</style>
