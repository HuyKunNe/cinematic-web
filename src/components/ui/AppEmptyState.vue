<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '',
  },
)
</script>

<template>
  <section class="app-empty-state" role="status" aria-live="polite">
    <div v-if="$slots.illustration" class="app-empty-state__illustration">
      <slot name="illustration" />
    </div>

    <div class="app-empty-state__content">
      <h2 class="app-empty-state__title">{{ title }}</h2>
      <p v-if="description" class="app-empty-state__description">
        {{ description }}
      </p>
      <div v-if="$slots.action" class="app-empty-state__action">
        <slot name="action" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.app-empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  background: var(--color-surface);
}

.app-empty-state__illustration {
  color: var(--color-primary);
}

.app-empty-state__content {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  max-width: var(--container-width-narrow);
}

.app-empty-state__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-heading);
}

.app-empty-state__description {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
