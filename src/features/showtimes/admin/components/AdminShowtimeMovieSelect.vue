<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, Film } from 'lucide-vue-next'
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxItemIndicator,
} from 'reka-ui'

const props = withDefaults(
  defineProps<{
    options: readonly {
      id: string
      title: string
      durationMinutes?: number | null
      status?: string | null
    }[]
    disabled?: boolean
    loading?: boolean
    id?: string
    required?: boolean
    allowAll?: boolean
  }>(),
  { id: 'batch-movie', required: true, allowAll: false },
)
const selected = defineModel<string>({ required: true })
const allMoviesValue = '__all_movies__'
const comboboxValue = computed({
  get: () => (props.allowAll && !selected.value ? allMoviesValue : selected.value),
  set: (value: string) => {
    selected.value = value === allMoviesValue ? '' : value
  },
})
const open = ref(false)
const search = ref('')
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()
}
const filtered = computed(() => {
  const words = normalize(search.value).split(/\s+/).filter(Boolean)
  return props.options.filter((movie) =>
    words.every((word) => normalize(`${movie.title} ${movie.id}`).includes(word)),
  )
})
function displayValue(value: unknown) {
  return (
    props.options.find((movie) => movie.id === value)?.title ??
    (props.allowAll && (!value || value === allMoviesValue) ? 'Tất cả phim' : '')
  )
}
const statusLabels: Record<string, string> = {
  NOW_SHOWING: 'Đang chiếu',
  UPCOMING: 'Sắp chiếu',
  ENDED: 'Đã kết thúc',
  INACTIVE: 'Ngừng hiển thị',
}
watch(open, (value) => {
  if (!value) search.value = ''
})
</script>

<template>
  <div class="app-creatable">
    <label :for="id" class="showtime-movie-select__label"
      ><Film aria-hidden="true" /> Phim <span v-if="required" aria-hidden="true">*</span></label
    >
    <ComboboxRoot
      v-model="comboboxValue"
      v-model:open="open"
      :disabled="disabled || loading"
      :ignore-filter="true"
      open-on-focus
    >
      <ComboboxAnchor class="app-creatable__anchor" :class="{ 'is-disabled': disabled || loading }">
        <ComboboxInput
          :id="id"
          class="app-creatable__input"
          :display-value="displayValue"
          :disabled="disabled || loading"
          :required="required"
          autocomplete="off"
          :placeholder="loading ? 'Đang tải phim…' : 'Tìm tên hoặc mã phim…'"
          @input="search = ($event.target as HTMLInputElement).value"
        />
        <ComboboxTrigger
          class="app-creatable__trigger"
          :disabled="disabled || loading"
          aria-label="Mở danh sách phim"
          ><ChevronDown aria-hidden="true"
        /></ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent
          class="app-creatable__content admin-reference-autocomplete showtime-movie-select"
          position="popper"
          align="start"
        >
          <ComboboxViewport>
            <ComboboxItem
              v-if="allowAll"
              :value="allMoviesValue"
              text-value="Tất cả phim"
              class="app-creatable__item"
              >Tất cả phim<ComboboxItemIndicator class="app-creatable__indicator"
                ><Check aria-hidden="true" /></ComboboxItemIndicator
            ></ComboboxItem>
            <ComboboxItem
              v-for="movie in filtered"
              :key="movie.id"
              :value="movie.id"
              :text-value="movie.title"
              class="app-creatable__item"
            >
              <span class="showtime-movie-select__option"
                ><strong>{{ movie.title }}</strong
                ><span class="showtime-movie-select__meta"
                  ><span>{{
                    movie.durationMinutes == null
                      ? 'Chưa có thời lượng'
                      : `${movie.durationMinutes} phút`
                  }}</span
                  ><span
                    v-if="movie.status"
                    class="showtime-movie-select__status"
                    :data-status="movie.status"
                    >{{ statusLabels[movie.status] ?? movie.status }}</span
                  ></span
                ></span
              >
              <ComboboxItemIndicator class="app-creatable__indicator"
                ><Check aria-hidden="true"
              /></ComboboxItemIndicator>
            </ComboboxItem>
            <div v-if="!filtered.length" class="app-creatable__message" role="status">
              {{ options.length ? 'Không tìm thấy phim phù hợp.' : 'Chưa có phim để chọn.' }}
            </div>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </div>
</template>

<style src="../../../../styles/app-creatable-autocomplete.css"></style>
<style>
.showtime-movie-select__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.showtime-movie-select__label svg {
  width: var(--icon-size-sm);
  height: var(--icon-size-sm);
}
.showtime-movie-select__option {
  display: grid;
  gap: var(--space-2);
}
.showtime-movie-select__option strong {
  font-weight: var(--font-weight-semibold);
}
.showtime-movie-select__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.showtime-movie-select__status {
  padding: var(--space-1) var(--space-2);
  border: var(--border-width-thin) solid currentColor;
  border-radius: var(--radius-sm);
  color: var(--color-warning);
}
.showtime-movie-select__status[data-status='NOW_SHOWING'] {
  color: var(--color-success);
}
.showtime-movie-select__status:is([data-status='ENDED'], [data-status='INACTIVE']) {
  color: var(--color-text-secondary);
}
</style>
