<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    to: RouteLocationRaw
    variant?: 'default' | 'muted'
    disabled?: boolean
  }>(),
  {
    variant: 'default',
    disabled: false,
  },
)

function preventDisabledNavigation(event: MouseEvent) {
  event.preventDefault()
}
</script>

<template>
  <RouterLink :to="to" custom v-slot="{ href, navigate, isActive }">
    <a
      class="app-link"
      :class="[
        `app-link--${variant}`,
        { 'app-link--active': isActive, 'app-link--disabled': disabled },
      ]"
      :href="disabled ? undefined : href"
      :aria-disabled="disabled || undefined"
      :tabindex="disabled ? -1 : undefined"
      @click="disabled ? preventDisabledNavigation($event) : navigate($event)"
    >
      <slot />
    </a>
  </RouterLink>
</template>

<style scoped>
.app-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration-color: transparent;
  text-underline-offset: var(--space-1);
  transition:
    color var(--duration-fast) var(--easing-standard),
    text-decoration-color var(--duration-fast) var(--easing-standard);
}

.app-link:hover,
.app-link--active {
  color: var(--color-primary-hover);
  text-decoration-color: currentColor;
}

.app-link--muted {
  color: var(--color-text-secondary);
}

.app-link--muted:hover,
.app-link--muted.app-link--active {
  color: var(--color-text-primary);
}

.app-link--disabled {
  cursor: not-allowed;
  opacity: 0.56;
  text-decoration: none;
}
</style>
