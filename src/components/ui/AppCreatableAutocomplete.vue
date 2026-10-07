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
    options: readonly string[]
    contentClass?: string
    helperText?: string
    error?: string
    maxlength?: number
    required?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    contentClass: '',
    helperText: '',
    error: '',
    required: false,
    disabled: false,
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const open = ref(false)
const searching = ref(false)
const text = ref(props.modelValue)

function clean(value: string) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ')
}

function key(value: string) {
  return clean(value).toLocaleLowerCase('vi-VN')
}

const choices = computed(() => {
  const unique = new Map<string, string>()

  for (const option of props.options) {
    const label = clean(option)
    if (label && !unique.has(key(label))) unique.set(key(label), label)
  }

  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'))
})

const filtered = computed(() => {
  if (!searching.value) return choices.value

  const words = key(text.value).split(/\s+/).filter(Boolean)
  return choices.value.filter((option) => words.every((word) => key(option).includes(word)))
})

const candidate = computed(() => clean(text.value))
const canCreate = computed(
  () =>
    Boolean(candidate.value) &&
    !choices.value.some((option) => key(option) === key(candidate.value)),
)

const describedBy = computed(() => {
  const ids = [
    props.error ? `${props.id}-error` : '',
    props.helperText ? `${props.id}-helper` : '',
    props.loading ? `${props.id}-loading` : '',
  ].filter(Boolean)

  return ids.join(' ') || undefined
})

function canonical(value: string) {
  const normalized = clean(value)
  return choices.value.find((option) => key(option) === key(normalized)) ?? normalized
}

function displayValue(value: unknown) {
  return typeof value === 'string' ? value : props.modelValue
}

function onInput(event: Event) {
  if (props.disabled) return

  const value = (event.target as HTMLInputElement).value
  text.value = value
  searching.value = true
  open.value = true

  // Cập nhật ngay để submit nhận được cả giá trị chưa chọn trong popup.
  emit('update:modelValue', value)
}

function select(value: unknown) {
  if (props.disabled || typeof value !== 'string') return

  const selected = canonical(value)
  text.value = selected
  searching.value = false
  open.value = false
  emit('update:modelValue', selected)
}

function onBlur(event: FocusEvent) {
  if (props.disabled) return

  const value = canonical((event.target as HTMLInputElement).value)
  text.value = value
  emit('update:modelValue', value)
  emit('blur')
}

function onFocus() {
  if (props.disabled) return
  searching.value = false
  open.value = true
}

watch(
  () => props.modelValue,
  (value) => {
    if (text.value !== value) text.value = value
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false
  },
)
</script>

<template>
  <div class="app-creatable">
    <label :for="id" class="app-creatable__label">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>

    <ComboboxRoot
      v-model:open="open"
      :model-value="modelValue"
      :disabled="disabled"
      :ignore-filter="true"
      :reset-search-term-on-blur="false"
      :reset-search-term-on-select="false"
      @update:model-value="select"
    >
      <ComboboxAnchor
        class="app-creatable__anchor"
        :class="{ 'is-disabled': disabled, 'is-invalid': Boolean(error) }"
      >
        <ComboboxInput
          :id="id"
          v-model="text"
          class="app-creatable__input"
          :display-value="displayValue"
          :disabled="disabled"
          :required="required"
          :maxlength="maxlength"
          :aria-invalid="Boolean(error)"
          :aria-describedby="describedBy"
          :placeholder="`Chọn hoặc nhập ${label.toLocaleLowerCase('vi-VN')}…`"
          autocomplete="off"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />
        <ComboboxTrigger
          class="app-creatable__trigger"
          type="button"
          :disabled="disabled"
          :aria-label="`Mở danh sách ${label.toLocaleLowerCase('vi-VN')}`"
        >
          <ChevronDown aria-hidden="true" />
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          :class="['app-creatable__content', contentClass]"
          position="popper"
          align="start"
        >
          <ComboboxViewport>
            <ComboboxItem
              v-for="option in filtered"
              :key="option"
              class="app-creatable__item"
              :value="option"
            >
              <span>{{ option }}</span>
              <ComboboxItemIndicator class="app-creatable__indicator">
                <Check aria-hidden="true" />
              </ComboboxItemIndicator>
            </ComboboxItem>

            <ComboboxItem v-if="canCreate" class="app-creatable__item" :value="candidate">
              <span>Dùng tên mới “{{ candidate }}”</span>
            </ComboboxItem>

            <p v-if="!filtered.length && !candidate" class="app-creatable__message">
              Nhập tên để thêm giá trị mới.
            </p>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p v-if="loading" :id="`${id}-loading`" class="app-creatable__message" role="status">
      Đang tải gợi ý…
    </p>
    <p v-if="helperText" :id="`${id}-helper`" class="app-creatable__message">
      {{ helperText }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="app-creatable__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style src="../../styles/app-creatable-autocomplete.css"></style>
