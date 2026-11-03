<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  createAdminMovieScreeningRow,
  screeningFormatOptions,
  screeningPresentationOptions,
  type AdminMovieScreeningRow,
} from '../schemas/admin-movie-screening.schema'

const props = defineProps<{
  modelValue: AdminMovieScreeningRow[]
  creating: boolean
  disabled: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:modelValue': [rows: AdminMovieScreeningRow[]]
}>()

function patch(key: string, changes: Partial<AdminMovieScreeningRow>): void {
  if (props.disabled) return

  emit(
    'update:modelValue',
    props.modelValue.map((row) => (row.key === key ? { ...row, ...changes } : row)),
  )
}

function changeFormat(key: string, value: string): void {
  const option = screeningFormatOptions.find((item) => item.value === value)
  if (option) patch(key, { contentFormat: option.value })
}

function changePresentation(key: string, value: string): void {
  const option = screeningPresentationOptions.find((item) => item.value === value)
  const row = props.modelValue.find((item) => item.key === key)
  if (!option || !row) return

  patch(key, {
    presentationType: option.value,
    subtitleLanguage: option.value === 'SUBTITLED' ? row.subtitleLanguage : '',
  })
}

function changeText(key: string, field: 'audioLanguage' | 'subtitleLanguage', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  patch(key, field === 'audioLanguage' ? { audioLanguage: value } : { subtitleLanguage: value })
}

function changeActive(key: string, event: Event): void {
  patch(key, { active: (event.target as HTMLInputElement).checked })
}

function add(): void {
  if (!props.disabled) {
    emit('update:modelValue', [...props.modelValue, createAdminMovieScreeningRow()])
  }
}

function remove(key: string): void {
  if (props.disabled) return

  emit(
    'update:modelValue',
    props.modelValue.filter((row) => row.key !== key || row.id !== null),
  )
}
</script>

<template>
  <fieldset
    id="admin-movie-screening-fields"
    class="movie-screening-fields"
    tabindex="-1"
    :disabled="disabled"
    :aria-invalid="Boolean(error)"
    :aria-describedby="error ? 'admin-movie-screening-error' : undefined"
  >
    <legend>Phiên bản chiếu</legend>

    <p class="admin-movies__muted">
      Phiên bản đã lưu chỉ đổi trạng thái hoạt động. Muốn đổi định dạng hoặc ngôn ngữ, hãy thêm
      phiên bản mới.
    </p>

    <div v-for="row in modelValue" :key="row.key" class="movie-screening-fields__row">
      <strong>{{ row.id ? 'Phiên bản đã lưu' : 'Phiên bản mới' }}</strong>

      <div class="admin-movie-form__grid">
        <AppSelect
          :id="`movie-screening-format-${row.key}`"
          label="Định dạng"
          :model-value="row.contentFormat"
          :options="screeningFormatOptions"
          :disabled="disabled || row.id !== null"
          required
          @update:model-value="changeFormat(row.key, $event)"
        />

        <div class="admin-movie-form__field">
          <label :for="`movie-screening-audio-${row.key}`">Ngôn ngữ âm thanh</label>
          <input
            :id="`movie-screening-audio-${row.key}`"
            class="admin-movie-form__input"
            :value="row.audioLanguage"
            :readonly="row.id !== null"
            maxlength="100"
            required
            @input="changeText(row.key, 'audioLanguage', $event)"
          />
        </div>

        <AppSelect
          :id="`movie-screening-presentation-${row.key}`"
          label="Kiểu trình chiếu"
          :model-value="row.presentationType"
          :options="screeningPresentationOptions"
          :disabled="disabled || row.id !== null"
          required
          @update:model-value="changePresentation(row.key, $event)"
        />

        <div v-if="row.presentationType === 'SUBTITLED'" class="admin-movie-form__field">
          <label :for="`movie-screening-subtitle-${row.key}`">Ngôn ngữ phụ đề</label>
          <input
            :id="`movie-screening-subtitle-${row.key}`"
            class="admin-movie-form__input"
            :value="row.subtitleLanguage"
            :readonly="row.id !== null"
            maxlength="100"
            required
            @input="changeText(row.key, 'subtitleLanguage', $event)"
          />
        </div>
      </div>

      <div class="movie-screening-fields__actions">
        <label v-if="!creating" class="admin-movie-form__checkbox">
          <input type="checkbox" :checked="row.active" @change="changeActive(row.key, $event)" />
          <span>Đang hoạt động</span>
        </label>
        <span v-else class="admin-movies__muted">Hoạt động sau khi tạo phim</span>

        <AppButton
          v-if="row.id === null"
          variant="secondary"
          size="sm"
          :disabled="disabled"
          @click="remove(row.key)"
        >
          Bỏ phiên bản mới
        </AppButton>
      </div>
    </div>

    <p v-if="error" id="admin-movie-screening-error" class="admin-movies__error" role="alert">
      {{ error }}
    </p>

    <AppButton variant="secondary" :disabled="disabled" @click="add">
      Thêm phiên bản chiếu
    </AppButton>
  </fieldset>
</template>

<style scoped>
.movie-screening-fields {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.movie-screening-fields > legend {
  padding: 0 0 var(--space-3);
  font-weight: var(--font-weight-semibold);
}

.movie-screening-fields__row {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
}

.movie-screening-fields__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.movie-screening-fields:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
