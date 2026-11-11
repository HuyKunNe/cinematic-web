<script setup lang="ts">
import { computed } from 'vue'
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from 'reka-ui'

const props = withDefaults(
  defineProps<{ message: string; variant?: 'success' | 'error' | 'info' | 'warning' }>(),
  { variant: 'info' },
)
const title = computed(
  () =>
    ({ success: 'Thành công', error: 'Lỗi', warning: 'Cảnh báo', info: 'Thông tin' })[
      props.variant
    ],
)
const open = defineModel<boolean>('open', { default: false })
const duration = 4000
</script>

<template>
  <ToastProvider :duration="duration" swipe-direction="right">
    <ToastRoot
      v-model:open="open"
      v-slot="{ remaining, duration: totalDuration }"
      class="app-toast"
      :data-variant="variant"
      :duration="duration"
    >
      <span class="app-toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path v-if="variant === 'success'" d="m6 12 4 4 8-9" />
          <path v-else-if="variant === 'error'" d="m8 8 8 8m0-8-8 8" />
          <template v-else>
            <circle cx="12" cy="12" r="9" />
            <path :d="variant === 'warning' ? 'M12 7v6m0 4h.01' : 'M12 11v5m0-8h.01'" />
          </template>
        </svg>
      </span>
      <div class="app-toast__content">
        <ToastTitle class="app-toast__title">{{ title }}</ToastTitle>
        <ToastDescription class="app-toast__message">{{ message }}</ToastDescription>
      </div>
      <ToastClose class="app-toast__close" :aria-label="`Đóng thông báo ${title}`">×</ToastClose>
      <span
        v-if="variant === 'success'"
        class="app-toast__timer"
        aria-hidden="true"
        :style="{ transform: `scaleX(${Math.max(0, Math.min(1, remaining / totalDuration))})` }"
      />
    </ToastRoot>
    <Teleport to="body">
      <ToastViewport class="app-toast__viewport" label="Thông báo" />
    </Teleport>
  </ToastProvider>
</template>

<!-- Reka teleports the toast through multiple roots, so use uniquely named global classes. -->
<style>
.app-toast__viewport {
  --toast-max-width: 20.75rem;
  position: fixed;
  right: var(--space-4);
  top: calc(var(--admin-header-height) + var(--space-4));
  z-index: var(--z-toast);
  width: var(--toast-max-width);
  max-width: min(var(--toast-max-width), calc(100vw - var(--space-8)));
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.app-toast {
  --toast-enter-duration: var(--duration-slow);
  --toast-exit-duration: var(--duration-normal);
  --toast-motion-distance: var(--space-4);
  --toast-motion-easing: var(--easing-standard);
  --toast-padding: 1.0625rem 1rem 1rem 1.125rem;
  --toast-close-size: 1.375rem;
  --toast-accent: #3266e8;
  --toast-background: #e8eefc;
  --toast-text: #303238;
  --toast-icon-size: 0.8125rem;
  --toast-icon-container-size: 1.0625rem;
  --toast-columns: var(--space-6) minmax(0, 1fr) 1.125rem;
  --toast-min-height: 5.625rem;
  --toast-border-width: 0.1875rem;
  --toast-font-size: 0.8125rem;
  --toast-line-height: 1.35;
  --toast-title-weight: 650;
  --toast-shadow: 0 0.3125rem 0.75rem rgb(25 32 42 / 20%);
  --toast-icon-radius: 50%;
  --toast-icon-stroke: 2.5;
  --toast-icon-color: #fff;
  --toast-close-offset: -0.3125rem;
  --toast-close-color: #17191c;
  --toast-close-hover: rgb(0 0 0 / 7%);
  --toast-close-font-size: 1.3125rem;
  --toast-timer-height: 0.125rem;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  display: grid;
  grid-template-columns: var(--toast-columns);
  align-items: start;
  gap: var(--space-4);
  min-height: var(--toast-min-height);
  padding: var(--toast-padding);
  overflow: hidden;
  border: 0;
  border-inline-start: var(--toast-border-width) solid var(--toast-accent);
  background: var(--toast-background);
  color: var(--toast-text);
  font-size: var(--toast-font-size);
  font-weight: var(--font-weight-regular);
  line-height: var(--toast-line-height);
  box-shadow: var(--toast-shadow);
}
.app-toast[data-state='open'] {
  animation: app-toast-enter var(--toast-enter-duration) var(--toast-motion-easing) both;
}
.app-toast[data-state='closed'] {
  animation: app-toast-exit var(--toast-exit-duration) var(--toast-motion-easing) both;
}
@keyframes app-toast-enter {
  from {
    opacity: 0;
    transform: translateY(calc(-1 * var(--toast-motion-distance)));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes app-toast-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(calc(-1 * var(--toast-motion-distance)));
  }
}
.app-toast[data-variant='error'] {
  --toast-accent: #e3232d;
  --toast-background: #fbe7e8;
}
.app-toast[data-variant='success'] {
  --toast-accent: #168329;
  --toast-background: #e8f3e7;
}
.app-toast[data-variant='warning'] {
  --toast-accent: #e6b800;
  --toast-background: #fff9e2;
}
.app-toast__icon {
  display: grid;
  place-items: center;
  width: var(--toast-icon-container-size);
  height: var(--toast-icon-container-size);
  margin-top: var(--toast-timer-height);
  border-radius: var(--toast-icon-radius);
  color: var(--toast-icon-color);
  background: var(--toast-accent);
}
.app-toast__icon svg {
  width: var(--toast-icon-size);
  height: var(--toast-icon-size);
  fill: none;
  stroke: currentColor;
  stroke-width: var(--toast-icon-stroke);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.app-toast__content {
  min-width: 0;
}
.app-toast__title {
  margin: 0 0 var(--space-1);
  font-size: inherit;
  line-height: inherit;
  font-weight: var(--toast-title-weight);
}
.app-toast__message {
  margin: 0;
  overflow-wrap: anywhere;
}
.app-toast__timer {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: var(--toast-timer-height);
  transform-origin: left center;
  background: var(--toast-accent);
}
.app-toast__close {
  display: grid;
  place-items: center;
  width: var(--toast-close-size);
  height: var(--toast-close-size);
  margin: var(--toast-close-offset) var(--toast-close-offset) 0 0;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0;
  background: transparent;
  color: var(--toast-close-color);
  font-size: var(--toast-close-font-size);
  line-height: 1;
  cursor: pointer;
}
.app-toast__close:hover {
  background: var(--toast-close-hover);
}
.app-toast__close:focus-visible {
  outline: var(--focus-ring-width) solid var(--toast-accent);
  outline-offset: var(--space-1);
}
</style>
