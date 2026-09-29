<script setup lang="ts">
import AppContainer from '../ui/AppContainer.vue'
import AppLink from '../ui/AppLink.vue'
import { ROUTE_NAMES } from '../../router/route-constants'

withDefaults(
  defineProps<{
    title: string
    description: string
    showHomeLink?: boolean
  }>(),
  {
    showHomeLink: true,
  },
)
</script>

<template>
  <AppContainer as="main">
    <section class="placeholder-page">
      <p class="placeholder-page__eyebrow">CINEMATIC</p>
      <h1 class="placeholder-page__title">{{ title }}</h1>
      <p class="placeholder-page__description">{{ description }}</p>

      <AppLink v-if="showHomeLink" :to="{ name: ROUTE_NAMES.HOME }"> Về trang chủ </AppLink>
    </section>
  </AppContainer>
</template>

<style scoped>
.placeholder-page {
  display: grid;
  min-height: 50vh;
  align-content: center;
  justify-items: start;
  gap: var(--space-4);
  padding-block: var(--space-12);
}

.placeholder-page__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-wide);
}

.placeholder-page__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-3xl);
  line-height: var(--line-height-heading);
}

.placeholder-page__description {
  max-width: var(--container-width-narrow);
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
