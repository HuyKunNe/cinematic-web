<script setup lang="ts">
import { computed, ref, useAttrs, useId, watch } from 'vue'
import { Clock3 } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
  allowEndOfDay?: boolean
}>(), { disabled: false, allowEndOfDay: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const attrs = useAttrs()
const prefix = useId()
const open = ref(false)
const touched = ref(false)
const inputAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')))
const pattern = computed(() => props.allowEndOfDay
  ? '(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00'
  : '(?:[01][0-9]|2[0-3]):[0-5][0-9]')
const invalid = computed(() => Boolean(attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true' ||
  (touched.value && props.modelValue && !new RegExp(`^(?:${pattern.value})$`).test(props.modelValue))))
const hours = computed(() => Array.from({ length: props.allowEndOfDay ? 25 : 24 }, (_, i) => String(i).padStart(2, '0')))
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const hour = computed(() => props.modelValue.split(':')[0] ?? '')
const minute = computed(() => props.modelValue.split(':')[1] ?? '')
const triggerLabel = computed(() => `${attrs['aria-label'] || 'Chọn giờ'} — định dạng 24 giờ`)

watch(() => props.disabled, (disabled) => { if (disabled) open.value = false })

function update(value: string) {
  if (!props.disabled) emit('update:modelValue', value)
}
function onInput(event: Event) {
  touched.value = false
  const input = event.target as HTMLInputElement
  let value = input.value
  if (/^\d{3,4}$/.test(value)) value = `${value.slice(0, 2)}:${value.slice(2)}`
  input.value = value
  update(value)
}
function onBlur() {
  touched.value = true
  const parts = /^(\d{1,2}):(\d{1,2})$/.exec(props.modelValue)
  if (!parts) return
  const value = `${parts[1]!.padStart(2, '0')}:${parts[2]!.padStart(2, '0')}`
  if (new RegExp(`^(?:${pattern.value})$`).test(value)) update(value)
}
function chooseHour(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  update(`${value}:${value === '24' ? '00' : minutes.includes(minute.value) ? minute.value : '00'}`)
}
function chooseMinute(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  update(`${hours.value.includes(hour.value) && hour.value !== '24' ? hour.value : '00'}:${value}`)
}
</script>

<template>
  <span class="app-time-picker" :class="attrs.class" :data-disabled="disabled || undefined" :data-invalid="invalid || undefined">
    <input v-bind="inputAttrs" class="app-time-picker__input" type="text" inputmode="numeric"
      autocomplete="off" placeholder="HH:mm" maxlength="5" :pattern="pattern" :value="modelValue"
      :disabled="disabled" :aria-invalid="invalid || undefined" @input="onInput" @blur="onBlur" />
    <PopoverRoot v-model:open="open">
      <PopoverTrigger as-child>
        <button class="app-time-picker__trigger" type="button" :disabled="disabled" :aria-label="triggerLabel" title="Chọn giờ (24 giờ)">
          <Clock3 aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent class="app-time-picker__content" align="end" :aria-labelledby="`${prefix}-title`">
          <p :id="`${prefix}-title`">Chọn giờ <span>24 giờ</span></p>
          <div class="app-time-picker__columns">
            <label :for="`${prefix}-hour`">Giờ
              <select :id="`${prefix}-hour`" :value="hour" @change="chooseHour">
                <option value="" disabled>--</option>
                <option v-for="value in hours" :key="value" :value="value">{{ value }}</option>
              </select>
            </label>
            <label :for="`${prefix}-minute`">Phút
              <select :id="`${prefix}-minute`" :value="minute" :disabled="hour === '24'" @change="chooseMinute">
                <option value="" disabled>--</option>
                <option v-for="value in minutes" :key="value" :value="value">{{ value }}</option>
              </select>
            </label>
          </div>
          <small v-if="allowEndOfDay">24:00 là cuối ngày.</small>
          <button class="app-time-picker__done" type="button" @click="open = false">Xong</button>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </span>
</template>

<style scoped>
.app-time-picker,
.app-time-picker__content {
  --time-picker-panel-width: 16rem;
  --time-picker-layer: calc(var(--z-modal) + 2);
  --time-picker-gap: var(--space-2);
}
.app-time-picker {
  display: flex;
  align-items: center;
  gap: var(--time-picker-gap);
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}
.app-time-picker__input {
  width: 100%;
  min-width: 0;
  flex: 1 1 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.app-time-picker__trigger {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: var(--space-6);
  height: var(--space-6);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.app-time-picker__trigger svg { width: var(--icon-size-sm); height: var(--icon-size-sm); }
.app-time-picker__trigger:hover:not(:disabled) { color: var(--color-primary); }
.app-time-picker:focus-within,
.app-time-picker__content :is(select, button):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
.app-time-picker[data-invalid] { border-color: var(--color-error); }
.app-time-picker[data-disabled] { background: var(--color-surface-raised); }
.app-time-picker :disabled { cursor: not-allowed; }
.app-time-picker__content {
  z-index: var(--time-picker-layer);
  display: grid;
  gap: var(--space-3);
  box-sizing: border-box;
  width: min(var(--time-picker-panel-width), var(--reka-popover-content-available-width));
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  box-shadow: var(--shadow-raised);
}
.app-time-picker__content p { display: flex; justify-content: space-between; margin: 0; font-weight: var(--font-weight-semibold); }
.app-time-picker__content :is(p span, small) { color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.app-time-picker__columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.app-time-picker__columns label { display: grid; gap: var(--time-picker-gap); }
.app-time-picker__content :is(select, button) {
  min-height: var(--control-height-sm);
  padding: var(--space-2);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: inherit;
  font: inherit;
}
.app-time-picker__content .app-time-picker__done { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); cursor: pointer; }
.app-time-picker__done:hover { background: var(--color-primary-hover); }
</style>
