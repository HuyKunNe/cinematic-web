<script setup lang="ts">
import AppContainer from '../components/ui/AppContainer.vue'
import AppLink from '../components/ui/AppLink.vue'
import { ROUTE_NAMES } from '../router/route-constants'
</script>

<template>
  <div class="auth-layout">
    <header class="auth-layout__header">
      <AppContainer as="div">
        <AppLink class="auth-layout__brand" :to="{ name: ROUTE_NAMES.HOME }"> CINEMATIC </AppLink>
      </AppContainer>
    </header>

    <AppContainer as="main" width="narrow">
      <slot />
    </AppContainer>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: var(--color-background);
}

.auth-layout__header {
  border-bottom: 1px solid var(--color-border);
  padding-block: var(--space-4);
  background: var(--color-surface);
}

.auth-layout__brand {
  color: var(--color-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-display);
  letter-spacing: var(--letter-spacing-wide);
  text-decoration: none;
}

.auth-layout :deep(main) {
  padding-block: var(--space-12);
}
</style>
