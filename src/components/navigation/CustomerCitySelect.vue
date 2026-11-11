<script setup lang="ts">
import { MapPin, ChevronDown, Check } from 'lucide-vue-next'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from 'reka-ui'
defineProps<{
  id: string
  modelValue: string
  options: readonly { key: string; name: string }[]
  disabled: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
function change(value: unknown) {
  if (typeof value === 'string') emit('update:modelValue', value)
}
</script>
<template>
  <SelectRoot :model-value="modelValue" :disabled="disabled" @update:model-value="change">
    <SelectTrigger
      :id="id"
      class="lumiere-city-trigger"
      data-location-trigger
      aria-label="Chọn thành phố"
      ><MapPin aria-hidden="true" /><span><SelectValue placeholder="Chọn thành phố" /></span
      ><ChevronDown aria-hidden="true"
    /></SelectTrigger>
    <SelectPortal
      ><SelectContent class="lumiere-city-content" position="popper" align="end"
        ><SelectViewport
          ><SelectItem
            v-for="city in options"
            :key="city.key"
            :value="city.key"
            class="lumiere-city-item"
            ><SelectItemText>{{ city.name }}</SelectItemText
            ><SelectItemIndicator
              ><Check
                aria-hidden="true" /></SelectItemIndicator></SelectItem></SelectViewport></SelectContent
    ></SelectPortal>
  </SelectRoot>
</template>
