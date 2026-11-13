<script setup lang="ts">
defineProps<{ bookingId?: string }>()
</script>
<template>
  <section class="booking-processing" aria-labelledby="booking-processing-title">
    <span class="booking-processing__spinner" aria-hidden="true"></span>
    <h1 id="booking-processing-title">Đang xử lý thanh toán</h1>
    <p role="status">Vui lòng chờ. Chưa có vé được phát hành cho đơn này.</p>
    <p v-if="bookingId">
      Mã đơn: <strong>{{ bookingId }}</strong>
    </p>
    <slot />
  </section>
</template>
<style scoped>
@reference '../../../styles/main.css';
.booking-processing {
  --processing-spinner-size: 3rem;
  --processing-spinner-border: 0.1875rem;
  --processing-spinner-duration: 1s;
  --processing-spinner-track: #e3e6dc;
  --processing-spinner-bottom: 1.875rem;
  --processing-title-size: 2.625rem;
  --processing-copy-size: 0.8125rem;
  --processing-copy-width: 42.5rem;
  text-align: center;
  margin-bottom: var(--journey-result-gap, var(--space-8));
}
.booking-processing__spinner {
  display: block;
  width: var(--processing-spinner-size);
  height: var(--processing-spinner-size);
  margin: var(--space-5) auto var(--processing-spinner-bottom);
  border: var(--processing-spinner-border) solid var(--processing-spinner-track);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-pill);
  animation: booking-processing-spin var(--processing-spinner-duration) linear infinite;
}
.booking-processing h1 {
  margin: 0;
  font-size: var(--processing-title-size);
  letter-spacing: var(--letter-spacing-tight);
  line-height: var(--line-height-heading);
}
.booking-processing > p {
  max-width: var(--processing-copy-width);
  margin: var(--space-4) auto var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--processing-copy-size);
  overflow-wrap: anywhere;
}
@keyframes booking-processing-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .booking-processing__spinner {
    animation: none;
  }
}
@variant lumiere-mobile {
  .booking-processing {
    --processing-title-size: 2.0625rem;
    --processing-copy-size: var(--font-size-xs);
  }
}
</style>
