<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue: string
    options: readonly { value: string; label: string }[]
    allLabel?: string
    contentClass?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    allLabel: 'Tất cả',
    contentClass: '',
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const ALL_OPTION = '__all__'
const open = ref(false)
const searchTerm = ref('')
const searching = ref(false)
const busy = computed(() => props.loading || props.disabled)

const selectedLabel = computed(
  () =>
    props.options.find((item) => item.value === props.modelValue)?.label ||
    (props.modelValue ? 'Mục đã chọn' : props.allLabel),
)

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()
}

const normalizedSearch = computed(() => (searching.value ? normalize(searchTerm.value) : ''))

const showAllOption = computed(
  () => !normalizedSearch.value || normalize(props.allLabel).includes(normalizedSearch.value),
)

const filteredOptions = computed(() => {
  const term = normalizedSearch.value
  if (!term) return props.options

  const words = term.split(/\s+/)

  return props.options.filter((item) => {
    const label = normalize(item.label)
    return words.every((word) => label.includes(word))
  })
})

function displayValue(value: unknown) {
  if (value === ALL_OPTION) return props.allLabel

  return props.options.find((item) => item.value === value)?.label || selectedLabel.value
}

function selectOption(value: unknown) {
  if (typeof value !== 'string') return

  if (value === ALL_OPTION) {
    emit('update:modelValue', '')
  } else if (props.options.some((item) => item.value === value)) {
    emit('update:modelValue', value)
  }
}

function focusInput(event: FocusEvent) {
  if (busy.value) return

  searching.value = false
  open.value = true

  const input = event.target
  if (input instanceof HTMLInputElement) input.select()
}

watch(
  selectedLabel,
  (label) => {
    if (!open.value) searchTerm.value = label
  },
  { immediate: true },
)

watch(open, (isOpen) => {
  if (!isOpen) {
    searching.value = false
    searchTerm.value = selectedLabel.value
  }
})

watch(busy, (isBusy) => {
  if (isBusy) open.value = false
})
</script>

<template>
  <div class="app-autocomplete">
    <label :for="id" class="app-autocomplete__label">
      {{ label }}
    </label>

    <ComboboxRoot
      v-model:open="open"
      :model-value="modelValue || ALL_OPTION"
      :disabled="busy"
      :ignore-filter="true"
      @update:model-value="selectOption"
    >
      <ComboboxAnchor
        class="app-autocomplete__anchor"
        :class="{ 'is-disabled': busy }"
        :aria-busy="loading"
      >
        <ComboboxInput
          :id="id"
          v-model="searchTerm"
          class="app-autocomplete__input"
          :display-value="displayValue"
          :disabled="busy"
          :placeholder="`Tìm ${label.toLocaleLowerCase('vi-VN')}…`"
          :aria-describedby="loading ? `${id}-loading` : undefined"
          autocomplete="off"
          @focus="focusInput"
          @input="searching = true"
        />

        <ComboboxTrigger
          class="app-autocomplete__trigger"
          type="button"
          :disabled="busy"
          :aria-label="`Mở danh sách ${label.toLocaleLowerCase('vi-VN')}`"
        >
          <ChevronDown aria-hidden="true" />
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          :class="['app-autocomplete__content', contentClass]"
          position="popper"
          align="start"
        >
          <ComboboxViewport>
            <ComboboxItem v-if="showAllOption" class="app-autocomplete__item" :value="ALL_OPTION">
              <span>{{ allLabel }}</span>
              <ComboboxItemIndicator class="app-autocomplete__indicator">
                <Check aria-hidden="true" />
              </ComboboxItemIndicator>
            </ComboboxItem>

            <ComboboxItem
              v-for="item in filteredOptions"
              :key="item.value"
              class="app-autocomplete__item"
              :value="item.value"
            >
              <span>{{ item.label }}</span>
              <ComboboxItemIndicator class="app-autocomplete__indicator">
                <Check aria-hidden="true" />
              </ComboboxItemIndicator>
            </ComboboxItem>

            <p
              v-if="!filteredOptions.length && !showAllOption"
              class="app-autocomplete__message"
              role="status"
            >
              Không có kết quả phù hợp.
            </p>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p v-if="loading" :id="`${id}-loading`" class="app-autocomplete__loading" role="status">
      Đang tải danh sách…
    </p>
  </div>
</template>

<style>
.app-autocomplete {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.app-autocomplete__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
}

.app-autocomplete__anchor {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: var(--app-autocomplete-height);
  border: var(--border-width-thin) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.app-autocomplete__anchor:focus-within {
  border-color: var(--color-focus);
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.app-autocomplete__anchor.is-disabled {
  opacity: var(--opacity-disabled);
}

.app-autocomplete__input {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: var(--app-autocomplete-height);
  padding: 0 var(--space-3);
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
}

.app-autocomplete__input::placeholder {
  color: var(--color-text-muted);
}

.app-autocomplete__trigger {
  display: grid;
  flex: 0 0 var(--app-autocomplete-height);
  place-items: center;
  width: var(--app-autocomplete-height);
  min-height: var(--app-autocomplete-height);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.app-autocomplete__trigger:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
}

.app-autocomplete__input:disabled,
.app-autocomplete__trigger:disabled {
  cursor: not-allowed;
}

.app-autocomplete__trigger svg,
.app-autocomplete__indicator svg {
  width: var(--icon-size-sm);
  height: var(--icon-size-sm);
}

.app-autocomplete__content {
  z-index: var(--app-autocomplete-layer);
  box-sizing: border-box;
  width: var(--reka-combobox-trigger-width);
  max-width: var(--reka-combobox-content-available-width);
  max-height: min(
    var(--app-autocomplete-list-height),
    var(--reka-combobox-content-available-height)
  );
  margin-block: var(--space-1);
  padding: var(--space-1);
  overflow: auto;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-raised);
  font-family: var(--font-family-base);
}

.app-autocomplete__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: var(--control-height-sm);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.app-autocomplete__item > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.app-autocomplete__item[data-highlighted] {
  outline: 0;
  background: var(--color-surface-hover);
}

.app-autocomplete__item[data-state='checked'] {
  color: var(--color-primary);
}

.app-autocomplete__indicator {
  display: inline-flex;
  flex: 0 0 auto;
}

.app-autocomplete__message,
.app-autocomplete__loading {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.app-autocomplete__message {
  padding: var(--space-3);
}
</style>
