<script setup lang="ts">
import { Ticket } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
</script>
<template>
  <div class="booking-start-page">
    <AppContainer
      ><header class="lumiere-account-heading">
        <p class="lumiere-eyebrow">THÊM NIỀM VUI CHO CUỘC HẸN</p>
        <h1>Một chút ưu đãi, thật nhiều cảm xúc</h1>
        <p>Những chương trình dành cho trải nghiệm điện ảnh của bạn.</p>
      </header>
      <section class="lumiere-empty">
        <Ticket aria-hidden="true" />
        <h2>Chưa có ưu đãi được công bố</h2>
        <p>
          Các chương trình mới sẽ được cập nhật tại đây. Khám phá phim và chọn cuộc hẹn tiếp theo
          của bạn.
        </p>
        <RouterLink class="home-button home-button--primary" :to="{ name: ROUTE_NAMES.MOVIES }"
          >Khám phá phim →</RouterLink
        >
      </section></AppContainer
    >
  </div>
</template>
