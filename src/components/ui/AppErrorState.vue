<script setup lang="ts">
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    showRetry?: boolean
    retrying?: boolean
  }>(),
  {
    title: 'Không thể tải dữ liệu',
    description: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    showRetry: false,
    retrying: false,
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <section class="app-error-state" role="alert">
    <div class="app-error-state__content">
      <h2 class="app-error-state__title">{{ title }}</h2>
      <p class="app-error-state__description">{{ description }}</p>

      <AppButton
        v-if="showRetry"
        variant="secondary"
        size="sm"
        :loading="retrying"
        @click="emit('retry')"
      >
        Thử lại
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.app-error-state {
  display: grid;
  justify-items: center;
  border: 1px solid color-mix(in srgb, var(--color-error), transparent 58%);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  background: var(--color-surface);
  text-align: center;
}

.app-error-state__content {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  max-width: var(--container-width-narrow);
}

.app-error-state__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.app-error-state__description {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
