<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
import CustomerBrand from './CustomerBrand.vue'
</script>

<template>
  <footer class="home-footer">
    <div class="home-container home-footer__grid">
      <div class="home-footer__brand">
        <RouterLink :to="{ name: ROUTE_NAMES.HOME }" class="cinematic-wordmark"
          ><CustomerBrand
        /></RouterLink>
        <p>Mỗi thước phim, một thế giới.<br />Mỗi cuộc hẹn, một điều đáng nhớ.</p>
      </div>
      <div>
        <h2>Khám phá</h2>
        <RouterLink :to="{ name: ROUTE_NAMES.SHOWTIMES }">Lịch chiếu</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.MOVIES }">Phim</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.CINEMAS }">Rạp</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.PROMOTIONS }">Ưu đãi</RouterLink>
      </div>
      <div>
        <h2>Cuộc hẹn của bạn</h2>
        <RouterLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }">Vé &amp; giao dịch</RouterLink>
        <RouterLink :to="{ name: ROUTE_NAMES.BOOKING_START }">Chọn suất chiếu</RouterLink>
        <RouterLink :to="{ name: ROUTE_NAMES.ACCOUNT }">Tài khoản</RouterLink>
        <RouterLink :to="{ name: ROUTE_NAMES.REGISTER }">Đăng ký tài khoản</RouterLink>
      </div>
      <div>
        <h2>Thông tin đặt vé</h2>
        <p>Chọn phim, suất chiếu và ghế phù hợp. Theo dõi trạng thái đơn trong Vé của tôi.</p>
        <small>Thời gian hiển thị theo giờ Việt Nam (UTC+7).</small>
      </div>
    </div>
    <div class="home-container home-footer__bottom">
      <span>© {{ new Date().getFullYear() }} Lumière Cinema. Made for movie moments.</span>
    </div>
  </footer>
</template>
