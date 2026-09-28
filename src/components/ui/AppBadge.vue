<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'neutral' | 'success' | 'warning' | 'error'
  }>(),
  {
    variant: 'neutral',
  },
)
</script>

<template>
  <span class="app-badge" :class="`app-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.app-badge {
  display: inline-flex;
  min-height: var(--control-height-sm);
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding-inline: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.app-badge--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.app-badge--neutral {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: var(--color-surface-raised);
}

.app-badge--success {
  color: var(--primitive-color-ink-950);
  background: var(--color-success);
}

.app-badge--warning {
  color: var(--primitive-color-ink-950);
  background: var(--color-warning);
}

.app-badge--error {
  color: var(--primitive-color-ink-950);
  background: var(--color-error);
}
</style>
