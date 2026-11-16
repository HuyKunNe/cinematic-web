<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="app-loading-state" role="status" aria-live="polite" aria-atomic="true">
    <span class="app-loading-state__spinner" aria-hidden="true"></span>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
  </div>
</template>

<style scoped>
.app-loading-state {
  --loading-state-min-height: 20rem;
  --loading-state-copy-width: 34rem;
  --loading-state-spinner-size: 3rem;
  --loading-state-spinner-border: 0.1875rem;
  --loading-state-spin-duration: 1s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  min-height: var(--loading-state-min-height);
  padding: var(--space-6);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}
.app-loading-state__spinner {
  flex-shrink: 0;
  width: var(--loading-state-spinner-size);
  height: var(--loading-state-spinner-size);
  border: var(--loading-state-spinner-border) solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-pill);
  animation: loading-state-spin var(--loading-state-spin-duration) linear infinite;
}
.app-loading-state h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}
.app-loading-state p {
  max-width: var(--loading-state-copy-width);
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}
@keyframes loading-state-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-loading-state__spinner {
    animation: none;
  }
}
</style>
