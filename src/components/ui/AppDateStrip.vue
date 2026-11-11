<script setup lang="ts">
import { computed } from 'vue'
import { getCinemaDateKey, getCinemaDayRange, formatCinemaDateKey } from '@/utils/cinema-time'
const props = withDefaults(defineProps<{ startDate: string; disabled?: boolean }>(), {
  disabled: false,
})
const selected = defineModel<string>({ required: true })
const days = computed(() => {
  const range = getCinemaDayRange(props.startDate)
  if (!range) return []
  return Array.from({ length: 7 }, (_, index) => {
    const instant = new Date(Date.parse(range.from) + index * 86400000)
    return {
      value: getCinemaDateKey(instant.toISOString()),
      label:
        index === 0
          ? 'Hôm nay'
          : index === 1
            ? 'Ngày mai'
            : new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                weekday: 'short',
              }).format(instant),
    }
  })
})
</script>
<template>
  <div class="lumiere-schedule__dates" role="group" aria-label="Ngày xem phim">
    <button
      v-for="day in days"
      :key="day.value"
      type="button"
      :aria-pressed="selected === day.value"
      :disabled="disabled"
      @click="selected = day.value"
    >
      <span>{{ day.label }}</span
      ><strong>{{ formatCinemaDateKey(day.value).replace(/\/\d{4}$/, '') }}</strong>
    </button>
  </div>
</template>
