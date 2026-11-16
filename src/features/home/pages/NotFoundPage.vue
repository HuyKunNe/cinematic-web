<script setup lang="ts">
import AppContainer from '@/components/ui/AppContainer.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
</script>

<template>
  <div class="customer-not-found">
    <AppContainer>
      <span class="customer-not-found__number" aria-hidden="true">404</span>
      <h1>Có vẻ bạn đã lạc sang một cảnh khác.</h1>
      <p>Trang bạn tìm không tồn tại. Câu chuyện hay vẫn đang chờ bạn.</p>
      <RouterLink class="home-button home-button--primary" :to="{ name: ROUTE_NAMES.HOME }"
        >Về trang chủ →</RouterLink
      >
      <RouterLink class="customer-not-found__support" :to="{ name: ROUTE_NAMES.SUPPORT }"
        >Cần hỗ trợ?</RouterLink
      >
    </AppContainer>
  </div>
</template>

<style scoped>
@reference '../../../styles/main.css';
.customer-not-found {
  --not-found-number-size: 7.8125rem;
  --not-found-number-color: #e4bba1;
  --not-found-number-tracking: -0.06em;
  --not-found-title-size: 2.0625rem;
  padding-block: var(--lumiere-page-space);
  text-align: center;
}
.customer-not-found__number {
  display: block;
  color: var(--not-found-number-color);
  font-size: var(--not-found-number-size);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--not-found-number-tracking);
  line-height: var(--line-height-heading);
}
.customer-not-found h1 {
  margin: var(--space-4) 0;
  font-size: var(--not-found-title-size);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}
.customer-not-found p {
  margin: 0 0 var(--space-6);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}
.customer-not-found__support {
  display: block;
  width: fit-content;
  margin: var(--space-5) auto 0;
  color: var(--lumiere-orange-dark);
  font-size: var(--font-size-xs);
}
@variant lumiere-mobile {
  .customer-not-found {
    --not-found-number-size: 6.25rem;
    --not-found-title-size: 1.75rem;
  }
}
</style>
