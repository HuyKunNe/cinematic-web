<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: 'div' | 'main' | 'section' | 'header' | 'footer'
    width?: 'default' | 'narrow'
  }>(),
  {
    as: 'div',
    width: 'default',
  },
)
</script>

<template>
  <component :is="as" class="app-container" :class="`app-container--${width}`">
    <slot />
  </component>
</template>

<style scoped>
.app-container {
  width: min(calc(100% - var(--page-gutter) - var(--page-gutter)), var(--container-width));
  margin-inline: auto;
}

.app-container--narrow {
  max-width: var(--container-width-narrow);
}
</style>
