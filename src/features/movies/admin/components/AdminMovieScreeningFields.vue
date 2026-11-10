<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  createAdminMovieScreeningRow,
  screeningFormatOptions,
  screeningPresentationOptions,
  screeningProjectionOptions,
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

type ContentFormat = AdminMovieScreeningRow['contentFormat']
type ProjectionTechnology = AdminMovieScreeningRow['projectionTechnology']

function rowsFor(
  projectionTechnology: ProjectionTechnology,
  contentFormat: ContentFormat,
): AdminMovieScreeningRow[] {
  return props.modelValue.filter(
    (row) =>
      row.projectionTechnology === projectionTechnology && row.contentFormat === contentFormat,
  )
}

function hasPersistedRows(
  projectionTechnology: ProjectionTechnology,
  contentFormat: ContentFormat,
): boolean {
  return rowsFor(projectionTechnology, contentFormat).some((row) => row.id !== null)
}

function combinationId(
  projectionTechnology: ProjectionTechnology,
  contentFormat: ContentFormat,
): string {
  return `movie-screening-${projectionTechnology}-${contentFormat}`
}

const selectedCombinations = computed(() =>
  screeningProjectionOptions.flatMap((projection) =>
    screeningFormatOptions.flatMap((format) => {
      const rows = rowsFor(projection.value, format.value)

      return rows.length
        ? [
            {
              key: combinationId(projection.value, format.value),
              projectionTechnology: projection.value,
              projectionLabel: projection.label,
              contentFormat: format.value,
              formatLabel: format.label,
              rows,
            },
          ]
        : []
    }),
  ),
)

function patch(key: string, changes: Partial<AdminMovieScreeningRow>): void {
  if (props.disabled) return

  emit(
    'update:modelValue',
    props.modelValue.map((row) => (row.key === key ? { ...row, ...changes } : row)),
  )
}

function changeCombination(
  projectionTechnology: ProjectionTechnology,
  contentFormat: ContentFormat,
  event: Event,
): void {
  if (props.disabled) return

  const checked = (event.target as HTMLInputElement).checked
  const matchingRows = rowsFor(projectionTechnology, contentFormat)

  if (checked && matchingRows.length === 0) {
    emit('update:modelValue', [
      ...props.modelValue,
      createAdminMovieScreeningRow({ projectionTechnology, contentFormat }),
    ])
    return
  }

  if (!checked && !matchingRows.some((row) => row.id !== null)) {
    emit(
      'update:modelValue',
      props.modelValue.filter(
        (row) =>
          row.projectionTechnology !== projectionTechnology || row.contentFormat !== contentFormat,
      ),
    )
  }
}

function addLanguageVersion(
  projectionTechnology: ProjectionTechnology,
  contentFormat: ContentFormat,
): void {
  if (props.disabled) return

  emit('update:modelValue', [
    ...props.modelValue,
    createAdminMovieScreeningRow({ projectionTechnology, contentFormat }),
  ])
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

function remove(key: string): void {
  if (props.disabled) return

  const row = props.modelValue.find((item) => item.key === key)
  if (!row || row.id !== null) return

  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item.key !== key),
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

    <div class="movie-screening-fields__matrix-scroll">
      <table class="movie-screening-fields__matrix">
        <caption class="admin-visually-hidden">
          Chọn tổ hợp công nghệ chiếu và định dạng hình ảnh
        </caption>
        <thead>
          <tr>
            <th scope="col">Công nghệ chiếu</th>
            <th v-for="format in screeningFormatOptions" :key="format.value" scope="col">
              {{ format.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="projection in screeningProjectionOptions" :key="projection.value">
            <th scope="row">{{ projection.label }}</th>
            <td v-for="format in screeningFormatOptions" :key="format.value">
              <label
                class="movie-screening-fields__combination"
                :for="combinationId(projection.value, format.value)"
              >
                <input
                  :id="combinationId(projection.value, format.value)"
                  type="checkbox"
                  :checked="rowsFor(projection.value, format.value).length > 0"
                  :disabled="disabled || hasPersistedRows(projection.value, format.value)"
                  :aria-describedby="
                    hasPersistedRows(projection.value, format.value)
                      ? 'admin-movie-screening-persisted-help'
                      : 'admin-movie-screening-help'
                  "
                  :aria-label="`${projection.label} · ${format.label}`"
                  @change="changeCombination(projection.value, format.value, $event)"
                />
                <span v-if="rowsFor(projection.value, format.value).length" aria-hidden="true">
                  {{ rowsFor(projection.value, format.value).length }} cấu hình
                </span>
                <span v-else aria-hidden="true">Chọn</span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="selectedCombinations.length === 0" class="admin-movies__muted">
      Chưa chọn phiên bản chiếu nào.
    </p>

    <section
      v-for="combination in selectedCombinations"
      :key="combination.key"
      class="movie-screening-fields__configuration"
      :aria-labelledby="`${combination.key}-title`"
    >
      <header class="movie-screening-fields__configuration-heading">
        <div>
          <h3 :id="`${combination.key}-title`">
            {{ combination.projectionLabel }} · {{ combination.formatLabel }}
          </h3>
          <p class="admin-movies__muted">{{ combination.rows.length }} cấu hình ngôn ngữ</p>
        </div>

        <AppButton
          variant="secondary"
          size="sm"
          :disabled="disabled"
          @click="addLanguageVersion(combination.projectionTechnology, combination.contentFormat)"
        >
          Thêm bản ngôn ngữ
        </AppButton>
      </header>

      <div
        v-for="row in combination.rows"
        :key="row.key"
        class="movie-screening-fields__language-row"
      >
        <div class="movie-screening-fields__row-heading">
          <strong>{{
            row.id ? `Đã lưu · phiên bản ${row.expectedVersion}` : 'Phiên bản mới'
          }}</strong>
          <span v-if="creating" class="movie-screening-fields__status">Sẽ hoạt động</span>
        </div>

        <div class="movie-screening-fields__language-grid">
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

          <AppButton
            v-if="row.id === null"
            variant="secondary"
            size="sm"
            :disabled="disabled"
            @click="remove(row.key)"
          >
            Bỏ bản ngôn ngữ
          </AppButton>
        </div>
      </div>
    </section>

    <p v-if="error" id="admin-movie-screening-error" class="admin-movies__error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>

<style scoped>
.movie-screening-fields {
  --movie-screening-table-min-width: calc(var(--space-16) * 6);
  --movie-screening-field-min-width: calc(var(--space-16) * 3);

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

.movie-screening-fields__matrix-scroll {
  min-width: 0;
  overflow-x: auto;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
}

.movie-screening-fields__matrix {
  width: 100%;
  min-width: var(--movie-screening-table-min-width);
  border-collapse: collapse;
  text-align: left;
}

.movie-screening-fields__matrix th,
.movie-screening-fields__matrix td {
  padding: var(--space-3);
  border-bottom: var(--border-width-thin) solid var(--color-border);
}

.movie-screening-fields__matrix th:not(:last-child),
.movie-screening-fields__matrix td:not(:last-child) {
  border-right: var(--border-width-thin) solid var(--color-border);
}

.movie-screening-fields__matrix tbody tr:last-child > * {
  border-bottom: 0;
}

.movie-screening-fields__matrix thead,
.movie-screening-fields__matrix tbody th {
  background: var(--color-surface-raised);
}

.movie-screening-fields__combination {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-height-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.movie-screening-fields__combination input,
.movie-screening-fields__actions input {
  accent-color: var(--color-primary);
}

.movie-screening-fields__combination:has(input:disabled) {
  cursor: not-allowed;
}

.movie-screening-fields__configuration {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
}

.movie-screening-fields__configuration-heading,
.movie-screening-fields__row-heading,
.movie-screening-fields__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.movie-screening-fields__configuration-heading h3,
.movie-screening-fields__configuration-heading p {
  margin: 0;
}

.movie-screening-fields__configuration-heading h3 {
  font-size: var(--font-size-md);
}

.movie-screening-fields__language-row {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding-block: var(--space-3);
  border-top: var(--border-width-thin) solid var(--color-border);
}

.movie-screening-fields__language-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--movie-screening-field-min-width)), 1fr)
  );
  gap: var(--space-3);
  min-width: 0;
}

.movie-screening-fields__status {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}

.movie-screening-fields:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
