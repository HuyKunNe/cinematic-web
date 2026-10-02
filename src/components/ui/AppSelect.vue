<script setup lang="ts">
import { computed } from 'vue'

type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue: string
    options: SelectOption[]
    placeholder?: string
    helperText?: string
    error?: string
    disabled?: boolean
    loading?: boolean
    required?: boolean
  }>(),
  {
    placeholder: 'Chọn...',
    helperText: '',
    error: '',
    disabled: false,
    loading: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const describedBy = computed(() => {
  const ids: string[] = []

  if (props.helperText) ids.push(`${props.id}-helper`)
  if (props.error) ids.push(`${props.id}-error`)

  return ids.length ? ids.join(' ') : undefined
})

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <div class="app-select">
    <label class="app-select__label" :for="id">
      {{ label }}
      <span v-if="required" aria-hidden="true" class="app-select__required">*</span>
    </label>

    <div class="app-select__control">
      <select
        :id="id"
        class="app-select__native"
        :value="modelValue"
        :disabled="disabled || loading"
        :required="required"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        @change="onChange"
      >
        <option value="" disabled>{{ loading ? 'Đang tải...' : placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <span class="app-select__chevron" aria-hidden="true" />
    </div>

    <p v-if="helperText && !error" :id="`${id}-helper`" class="app-select__helper">
      {{ helperText }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="app-select__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.app-select {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.app-select__label {
  min-width: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}

.app-select__required {
  margin-inline-start: var(--space-1);
  color: var(--color-error);
}

.app-select__control {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.app-select__native {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: var(--app-select-height);
  min-height: var(--app-select-height);

  -webkit-appearance: none;
  appearance: none;

  padding-block: 0;
  padding-inline: var(--app-select-padding-start) var(--app-select-padding-end);

  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);

  font-family: var(--font-family-base);
  font-size: var(--app-select-font-size);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);

  color: var(--color-text-primary);
  background: var(--color-surface-raised);

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;

  transition:
    border-color var(--duration-fast) var(--easing-standard),
    background-color var(--duration-fast) var(--easing-standard);
}

.app-select__native:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.app-select__native:focus-visible {
  border-color: var(--color-focus);
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.app-select__native:disabled {
  cursor: not-allowed;
  opacity: var(--app-select-disabled-opacity);
}

.app-select__chevron {
  position: absolute;
  top: 50%;
  right: var(--app-select-padding-start);

  width: var(--app-select-chevron-size);
  height: var(--app-select-chevron-size);

  border-right: var(--border-width-strong) solid var(--color-text-secondary);
  border-bottom: var(--border-width-strong) solid var(--color-text-secondary);

  pointer-events: none;
  transform: translateY(-70%) rotate(45deg);
}

.app-select__helper,
.app-select__error {
  min-width: 0;
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}

.app-select__helper {
  color: var(--color-text-secondary);
}

.app-select__error {
  color: var(--color-error);
}
</style>
