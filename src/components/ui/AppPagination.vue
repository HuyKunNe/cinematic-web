<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  page: number
  total: number
  pageSize: number
  disabled?: boolean
  controls?: string
}>(), { disabled: false })
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => {
  const numbers = new Set([1, pageCount.value])
  for (let page = Math.max(1, props.page - 1); page <= Math.min(pageCount.value, props.page + 1); page += 1) numbers.add(page)
  const sorted = [...numbers].sort((a, b) => a - b)
  return sorted.flatMap((page, index): { value: number; gap: boolean }[] => {
    const previous = sorted[index - 1]
    return previous !== undefined && page - previous > 1
      ? [{ value: previous, gap: true }, { value: page, gap: false }]
      : [{ value: page, gap: false }]
  })
})
function select(page: number) {
  if (!props.disabled && page >= 1 && page <= pageCount.value && page !== props.page) emit('update:page', page)
}
</script>

<template>
  <nav v-if="total > 0" class="app-pagination" aria-label="Phân trang">
    <span class="app-pagination__status" role="status">Trang {{ page }} / {{ pageCount }}</span>
    <div class="app-pagination__buttons">
      <button type="button" :disabled="disabled || page <= 1" :aria-controls="controls" @click="select(page - 1)">Trước</button>
      <template v-for="item in pages" :key="`${item.gap ? 'gap' : 'page'}-${item.value}`">
        <span v-if="item.gap" class="app-pagination__gap" aria-hidden="true">…</span>
        <button v-else type="button" :aria-label="`Trang ${item.value}`" :aria-current="item.value === page ? 'page' : undefined" :aria-controls="controls" :disabled="disabled" @click="select(item.value)">{{ item.value }}</button>
      </template>
      <button type="button" :disabled="disabled || page >= pageCount" :aria-controls="controls" @click="select(page + 1)">Sau</button>
    </div>
  </nav>
</template>

<style scoped>
.app-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-8); color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.app-pagination__buttons { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2); }
.app-pagination button { display: inline-grid; place-items: center; min-width: var(--control-height-sm); min-height: var(--control-height-sm); padding-inline: var(--space-3); border: var(--border-width-thin) solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary); background: var(--color-surface); font: inherit; cursor: pointer; }
.app-pagination button[aria-current='page'] { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); }
.app-pagination button:hover:not(:disabled):not([aria-current='page']) { border-color: var(--color-primary); background: var(--color-surface-hover); }
.app-pagination button:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus); outline-offset: var(--space-1); }
.app-pagination button:disabled { color: var(--color-text-muted); cursor: not-allowed; }
.app-pagination__gap { align-self: center; padding-inline: var(--space-1); }
</style>
