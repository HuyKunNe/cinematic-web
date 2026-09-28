<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
  },
)
</script>

<template>
  <button
    class="app-button"
    :class="[`app-button--${variant}`, `app-button--${size}`]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <span class="app-button__content">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  min-height: var(--control-height-md);
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding-inline: var(--space-4);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition:
    color var(--duration-normal) var(--easing-standard),
    background-color var(--duration-normal) var(--easing-standard),
    border-color var(--duration-normal) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard);
}

.app-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.app-button:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
  box-shadow: var(--shadow-focus);
}

.app-button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  transform: none;
}

.app-button--primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.app-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.app-button--secondary {
  color: var(--color-on-secondary);
  border-color: var(--color-border);
  background: var(--color-secondary);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--color-secondary-hover);
}

.app-button--ghost {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: transparent;
}

.app-button--ghost:hover:not(:disabled) {
  background: var(--color-surface-raised);
}

.app-button--sm {
  min-height: var(--control-height-sm);
  padding-inline: var(--space-3);
  font-size: var(--font-size-sm);
}

.app-button--md {
  min-height: var(--control-height-md);
}

.app-button--lg {
  min-height: var(--control-height-lg);
  padding-inline: var(--space-6);
  font-size: var(--font-size-lg);
}

.app-button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: inherit;
}

.app-button__spinner {
  width: var(--icon-size-sm);
  aspect-ratio: 1;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-pill);
  animation: app-button-spin 700ms linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
