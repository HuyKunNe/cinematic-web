<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MapPin, Ticket, ArrowUpRight } from 'lucide-vue-next'
import { useCinemaLocation } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'
const { cinemas, location, selectCinemaById } = useCinemaLocation()
const router = useRouter()
const error = ref('')
async function chooseCinema(event: MouseEvent, id: string, cityKey: string) {
  event.preventDefault()
  error.value = ''
  if (!selectCinemaById(id, cityKey)) {
    error.value = 'Đang cập nhật rạp. Vui lòng chọn lại sau giây lát.'
    return
  }
  try {
    await router.push({ name: ROUTE_NAMES.BOOKING_START })
  } catch {
    error.value = 'Chưa thể mở lịch chiếu. Vui lòng thử lại.'
  }
}
const nearby = computed(() =>
  cinemas.value
    .filter((cinema) => !location.selectedCityKey || cinema.cityKey === location.selectedCityKey)
    .slice(0, 2),
)
</script>
<template>
  <section class="home-container lumiere-discovery" aria-labelledby="lumiere-cinema-title">
    <header class="lumiere-programme__heading">
      <div>
        <p class="lumiere-eyebrow">MỘT CUỘC HẸN GẦN BẠN</p>
        <h2 id="lumiere-cinema-title">Rạp của bạn, ở ngay đây</h2>
      </div>
      <RouterLink :to="{ name: ROUTE_NAMES.CINEMAS }">Tất cả rạp →</RouterLink>
    </header>
    <div class="lumiere-cinema-grid">
      <article v-for="cinema in nearby" :key="cinema.id" class="lumiere-cinema-card">
        <div class="lumiere-cinema-card__art">
          <img
            src="/customer/cinema-placeholder.svg"
            alt="Không gian điện ảnh minh họa"
            loading="lazy"
          />
        </div>
        <div>
          <p class="lumiere-eyebrow">{{ cinema.city }}</p>
          <h3>{{ cinema.name }}</h3>
          <p><MapPin aria-hidden="true" /> {{ cinema.address || 'Địa chỉ đang cập nhật' }}</p>
          <RouterLink
            :to="{ name: ROUTE_NAMES.BOOKING_START }"
            @click="chooseCinema($event, cinema.id, cinema.cityKey)"
            >Chọn suất tại rạp <ArrowUpRight aria-hidden="true"
          /></RouterLink>
        </div>
      </article>
    </div>
    <p v-if="!nearby.length" class="booking-note">Chọn thành phố để khám phá rạp và lịch chiếu.</p>
    <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
  </section>
  <section class="home-container lumiere-invitation">
    <Ticket aria-hidden="true" />
    <div>
      <p class="lumiere-eyebrow">NHỮNG CUỘC HẸN ĐÃ LƯU</p>
      <h2>Một nơi cho những bộ phim bạn yêu.</h2>
      <p>Xem trạng thái đặt vé và thông tin ghế trong tài khoản của bạn.</p>
    </div>
    <RouterLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }">Vé của tôi →</RouterLink>
  </section>
</template>
