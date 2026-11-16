<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ id: string; disabled?: boolean; toggleLabel?: string }>(), {
  disabled: false,
  toggleLabel: 'Hiện mật khẩu',
})
const value = defineModel<string>({ required: true })
const visible = ref(false)
watch(value, (password) => {
  if (!password) visible.value = false
})
</script>

<template>
  <div class="app-password-input">
    <input
      v-bind="$attrs"
      :id="id"
      v-model="value"
      class="app-password-input__input"
      :type="visible ? 'text' : 'password'"
      :disabled="disabled"
      spellcheck="false"
      autocapitalize="off"
    />
    <button
      type="button"
      class="app-password-input__toggle"
      :disabled="disabled"
      :aria-controls="id"
      :aria-pressed="visible"
      :aria-label="toggleLabel"
      :title="visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" aria-hidden="true" /><Eye v-else aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.app-password-input {
  --password-toggle-size: 2rem;
  --password-toggle-inset: var(--space-2);
  position: relative;
  min-width: 0;
}
.app-password-input > input.app-password-input__input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: var(--control-height-md);
  padding: var(--space-3);
  padding-inline-end: calc(
    var(--password-toggle-size) + var(--password-toggle-inset) + var(--space-2)
  );
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text-primary);
  font: inherit;
}
.app-password-input > input[aria-invalid='true'] {
  border-color: var(--color-error);
}
.app-password-input__toggle {
  position: absolute;
  right: var(--password-toggle-inset);
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: var(--password-toggle-size);
  height: var(--password-toggle-size);
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.app-password-input__toggle:hover {
  color: var(--color-primary-hover);
  background: var(--color-surface-raised);
}
.app-password-input__toggle:disabled {
  cursor: default;
  opacity: var(--opacity-disabled);
}
.app-password-input__toggle svg {
  width: var(--icon-size-md);
  height: var(--icon-size-md);
}
.app-password-input :is(input, button):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
