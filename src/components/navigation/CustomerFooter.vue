<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
</script>

<template>
  <footer class="home-footer">
    <div class="home-container home-footer__grid">
      <div class="home-footer__brand">
        <RouterLink :to="{ name: ROUTE_NAMES.HOME }" class="cinematic-wordmark"
          >CINEMATIC</RouterLink
        >
        <p>Điện ảnh kết nối cảm xúc</p>
        <div class="home-footer__socials" aria-hidden="true">
          <span>f</span><span>◎</span><span>▶</span><span>♪</span>
        </div>
      </div>
      <div>
        <h2>Khám phá</h2>
        <RouterLink :to="{ name: ROUTE_NAMES.SHOWTIMES }">Lịch chiếu</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.MOVIES }">Phim</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.CINEMAS }">Rạp</RouterLink
        ><RouterLink :to="{ name: ROUTE_NAMES.PROMOTIONS }">Ưu đãi</RouterLink>
      </div>
      <div>
        <h2>Hỗ trợ</h2>
        <span>Câu hỏi thường gặp</span><span>Hướng dẫn đặt vé</span><span>Chính sách bảo mật</span
        ><span>Điều khoản sử dụng</span>
      </div>
      <div>
        <h2>Về CINEMATIC</h2>
        <span>Giới thiệu</span><span>Tuyển dụng</span><span>Liên hệ</span><span>Tin tức</span>
      </div>
      <div class="home-footer__app">
        <h2>Ứng dụng di động</h2>
        <p>Đặt vé nhanh hơn trên ứng dụng CINEMATIC</p>
        <div class="home-footer__stores" aria-label="Ứng dụng sắp ra mắt">
          <span> App Store</span><span>▶ Google Play</span>
        </div>
        <small>Sắp cập nhật</small>
      </div>
    </div>
    <div class="home-container home-footer__bottom">
      <span>© {{ new Date().getFullYear() }} CINEMATIC. Tất cả quyền được bảo lưu.</span>
    </div>
  </footer>
</template>
