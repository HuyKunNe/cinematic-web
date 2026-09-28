<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'text' | 'title' | 'avatar' | 'poster' | 'card'
    label?: string
  }>(),
  {
    variant: 'text',
    label: '',
  },
)
</script>

<template>
  <span
    class="app-skeleton"
    :class="`app-skeleton--${variant}`"
    :role="label ? 'status' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <span v-if="label" class="app-skeleton__sr-only">{{ label }}</span>
  </span>
</template>

<style scoped>
.app-skeleton {
  display: block;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-raised),
    var(--color-border),
    var(--color-surface-raised)
  );
  background-size: 200% 100%;
  animation: app-skeleton-shimmer var(--duration-slow) var(--easing-standard) infinite;
}

.app-skeleton--text {
  width: 100%;
  height: var(--skeleton-line-height);
}

.app-skeleton--title {
  width: 70%;
  height: var(--skeleton-title-height);
}

.app-skeleton--avatar {
  width: var(--skeleton-avatar-size);
  aspect-ratio: 1;
  border-radius: var(--radius-pill);
}

.app-skeleton--poster {
  width: 100%;
  aspect-ratio: var(--poster-aspect-ratio);
  border-radius: var(--radius-md);
}

.app-skeleton--card {
  width: 100%;
  min-height: var(--control-height-lg);
  border-radius: var(--radius-md);
}

.app-skeleton__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@keyframes app-skeleton-shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-skeleton {
    animation: none;
  }
}
</style>
