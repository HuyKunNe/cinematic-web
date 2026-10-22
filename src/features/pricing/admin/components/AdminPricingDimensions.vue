<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { DayGroupInputDaysOfWeekItem } from '@/services/api/generated/inventory-service/model/dayGroupInputDaysOfWeekItem'
import {
  dayGroupFormSchema,
  dimensionErrorMessage,
  dimensionRequiresReload,
  timeBandFormSchema,
  usePricingDimensions,
} from '../api/admin-pricing-dimensions'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  canRead: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  locked: [value: boolean]
  saved: []
  reload: []
}>()

const { query, save } = usePricingDimensions(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
  }),
  () => props.canRead,
  () => props.canEdit,
)

const weekdayLabels: Record<DayGroupInputDaysOfWeekItem, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ nhật',
}

const weekdays = Object.values(DayGroupInputDaysOfWeekItem)

const kind = ref<'day' | 'time' | ''>('')
const name = ref('')
const daysOfWeek = ref<DayGroupInputDaysOfWeekItem[]>([])
const includesHolidays = ref(false)
const from = ref('')
const to = ref('')
const validationMessage = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const matrix = computed(() => {
  if (!props.canRead || !query.isSuccess.value || query.isFetching.value) {
    return undefined
  }

  return query.data.value
})

const dirty = computed(
  () =>
    name.value !== '' ||
    daysOfWeek.value.length > 0 ||
    includesHolidays.value ||
    from.value !== '' ||
    to.value !== '',
)

const locked = computed(() => kind.value !== '' || save.isPending.value)

const requiresReload = computed(() => dimensionRequiresReload(save.error.value))

const isDraft = computed(() => matrix.value?.policy.status === 'DRAFT')

const editable = computed(
  () =>
    props.canRead &&
    props.canEdit &&
    Boolean(matrix.value) &&
    isDraft.value &&
    matrix.value?.policy.currency === 'VND' &&
    !save.isPending.value &&
    !requiresReload.value,
)

function clock(value: number) {
  const hour = Math.floor(value / 60)
    .toString()
    .padStart(2, '0')
  const minute = (value % 60).toString().padStart(2, '0')
  return `${hour}:${minute}`
}

function dayDescription(days: DayGroupInputDaysOfWeekItem[], holidays: boolean) {
  const labels = weekdays.filter((day) => days.includes(day)).map((day) => weekdayLabels[day])

  if (holidays) labels.push('Ngày lễ')

  return labels.join(', ')
}

async function openForm(value: 'day' | 'time') {
  if (!editable.value || locked.value) return

  const count = value === 'day' ? matrix.value?.dayGroups.length : matrix.value?.timeBands.length

  if ((count ?? 100) >= 100) return

  kind.value = value
  validationMessage.value = ''
  save.reset()

  await nextTick()
  nameInput.value?.focus()
}

function clearForm() {
  kind.value = ''
  name.value = ''
  daysOfWeek.value = []
  includesHolidays.value = false
  from.value = ''
  to.value = ''
  validationMessage.value = ''
}

function cancel() {
  if (save.isPending.value) return

  clearForm()

  if (!requiresReload.value) save.reset()
}

async function submit() {
  if (!editable.value || !kind.value) return

  const parsed =
    kind.value === 'day'
      ? dayGroupFormSchema.safeParse({
          kind: 'day',
          name: name.value,
          daysOfWeek: daysOfWeek.value,
          includesHolidays: includesHolidays.value,
        })
      : timeBandFormSchema.safeParse({
          kind: 'time',
          name: name.value,
          from: from.value,
          to: to.value,
        })

  if (!parsed.success) {
    validationMessage.value = parsed.error.issues[0]?.message ?? 'Kiểm tra thông tin đã nhập.'
    return
  }

  validationMessage.value = ''

  try {
    await save.mutateAsync({
      cinemaId: props.cinemaId,
      policyId: props.policyId,
      version: props.version,
      ...parsed.data,
    })

    clearForm()
    emit('locked', false)
    emit('saved')
  } catch {
    // Giữ nguyên dữ liệu nhập để người dùng kiểm tra.
  }
}

function allowDiscard() {
  return !dirty.value || window.confirm('Hủy cấu hình ngày và giờ chưa lưu?')
}

function reloadAll() {
  if (save.isPending.value || !props.canEdit || !allowDiscard()) {
    return
  }

  clearForm()
  emit('locked', false)
  emit('reload')
}

function confirmLeave() {
  return !save.isPending.value && allowDiscard()
}

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  locked,
  (value) => {
    emit('locked', value)

    if (value) {
      window.addEventListener('beforeunload', preventUnload)
    } else {
      window.removeEventListener('beforeunload', preventUnload)
    }
  },
  { immediate: true, flush: 'sync' },
)

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('locked', false)
})
</script>

<template>
  <details
    class="pricing-dimensions"
    :open="
      locked ||
      (Boolean(matrix) && (matrix?.dayGroups.length === 0 || matrix?.timeBands.length === 0))
    "
  >
    <summary>Ngày và khung giờ áp dụng</summary>

    <div class="pricing-dimensions__content">
      <p v-if="!canRead" role="alert">Bạn không có quyền xem cấu hình giá.</p>

      <p v-else-if="query.isPending.value || query.isFetching.value" role="status">
        Đang tải ngày và khung giờ…
      </p>

      <div v-else-if="query.isError.value" role="alert">
        <p class="pricing-error">
          {{ dimensionErrorMessage(query.error.value) }}
        </p>
        <AppButton type="button" variant="secondary" :disabled="!canEdit" @click="reloadAll">
          Tải lại bản giá
        </AppButton>
      </div>

      <template v-else-if="matrix">
        <p class="pricing-hint">
          Cấu hình này dùng chung cho các loại vé trong bản giá. Giờ được hiểu theo múi giờ
          {{ matrix.policy.timeZone }}.
        </p>

        <div class="pricing-dimensions__columns">
          <section aria-labelledby="pricing-day-groups-title">
            <h3 id="pricing-day-groups-title">Nhóm ngày</h3>

            <p v-if="matrix.dayGroups.length === 0">Chưa có nhóm ngày.</p>

            <ul v-else class="pricing-dimensions__list">
              <li v-for="item in matrix.dayGroups" :key="item.code">
                <strong>{{ item.name }}</strong>
                <span>
                  {{ dayDescription(item.daysOfWeek, item.includesHolidays) }}
                </span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="pricing-time-bands-title">
            <h3 id="pricing-time-bands-title">Khung giờ</h3>

            <p v-if="matrix.timeBands.length === 0">Chưa có khung giờ.</p>

            <ul v-else class="pricing-dimensions__list">
              <li v-for="item in matrix.timeBands" :key="item.code">
                <strong>{{ item.name }}</strong>
                <span> {{ clock(item.fromMinute) }}–{{ clock(item.toMinute) }} </span>
              </li>
            </ul>
          </section>
        </div>

        <p class="pricing-hint">
          Ngày lễ được xét riêng với thứ trong tuần, theo danh sách ngày lễ đã cấu hình cho bản giá.
        </p>

        <p v-if="!isDraft" class="pricing-hint">Bản giá đã công bố, chỉ có thể xem.</p>

        <template v-else>
          <div class="pricing-type-detail__actions">
            <AppButton
              type="button"
              variant="secondary"
              :disabled="!editable || locked || matrix.dayGroups.length >= 100"
              @click="openForm('day')"
            >
              Thêm nhóm ngày
            </AppButton>

            <AppButton
              type="button"
              variant="secondary"
              :disabled="!editable || locked || matrix.timeBands.length >= 100"
              @click="openForm('time')"
            >
              Thêm khung giờ
            </AppButton>
          </div>

          <form
            v-if="kind"
            class="pricing-dimensions__form"
            :aria-label="kind === 'day' ? 'Thêm nhóm ngày' : 'Thêm khung giờ'"
            :aria-busy="save.isPending.value"
            novalidate
            @submit.prevent="submit"
          >
            <fieldset class="pricing-dimensions__fields" :disabled="!editable">
              <legend class="admin-visually-hidden">
                {{ kind === 'day' ? 'Thông tin nhóm ngày' : 'Thông tin khung giờ' }}
              </legend>

              <label class="admin-reference__field">
                <span>Tên hiển thị</span>
                <input
                  ref="nameInput"
                  v-model="name"
                  class="admin-reference__input"
                  maxlength="150"
                  required
                />
              </label>

              <template v-if="kind === 'day'">
                <fieldset class="pricing-dimensions__weekdays">
                  <legend>Các thứ áp dụng</legend>

                  <label v-for="day in weekdays" :key="day">
                    <input v-model="daysOfWeek" type="checkbox" :value="day" />
                    <span>{{ weekdayLabels[day] }}</span>
                  </label>
                </fieldset>

                <label class="pricing-dimensions__check">
                  <input v-model="includesHolidays" type="checkbox" />
                  <span>Áp dụng cả vào ngày lễ</span>
                </label>

                <p class="pricing-hint">
                  Có thể chỉ chọn ngày lễ. Lựa chọn này không thêm ngày lễ cụ thể vào lịch của bản
                  giá.
                </p>
              </template>

              <template v-else>
                <div class="pricing-dimensions__columns">
                  <label class="admin-reference__field">
                    <span>Từ giờ</span>
                    <input
                      v-model="from"
                      class="admin-reference__input"
                      type="text"
                      placeholder="HH:mm"
                      maxlength="5"
                      autocomplete="off"
                      aria-describedby="pricing-time-band-help"
                      required
                    />
                  </label>

                  <label class="admin-reference__field">
                    <span>Đến trước giờ</span>
                    <input
                      v-model="to"
                      class="admin-reference__input"
                      type="text"
                      placeholder="HH:mm"
                      maxlength="5"
                      autocomplete="off"
                      aria-describedby="pricing-time-band-help"
                      required
                    />
                  </label>
                </div>

                <p id="pricing-time-band-help" class="pricing-hint">
                  Nhập giờ dạng HH:mm. Giờ bắt đầu được tính vào khung, giờ kết thúc không được tính
                  vào. Có thể kết thúc lúc 24:00; không tạo khung giờ đi qua ngày hôm sau.
                </p>
              </template>
            </fieldset>

            <p v-if="validationMessage" class="pricing-error" role="alert">
              {{ validationMessage }}
            </p>

            <div class="pricing-type-detail__actions">
              <AppButton
                type="button"
                variant="secondary"
                :disabled="save.isPending.value"
                @click="cancel"
              >
                Hủy nhập
              </AppButton>

              <AppButton type="submit" :loading="save.isPending.value" :disabled="!editable">
                {{ kind === 'day' ? 'Lưu nhóm ngày' : 'Lưu khung giờ' }}
              </AppButton>
            </div>
          </form>

          <p v-if="save.isError.value" class="pricing-error" role="alert">
            {{ dimensionErrorMessage(save.error.value) }}
          </p>

          <AppButton
            v-if="requiresReload"
            type="button"
            variant="secondary"
            :disabled="save.isPending.value || !canEdit"
            @click="reloadAll"
          >
            Tải lại bản giá
          </AppButton>
        </template>
      </template>
    </div>
  </details>
</template>

<style scoped>
[data-reference='admin-pricing-policies'] .pricing-dimensions {
  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions > summary {
  cursor: pointer;
  color: var(--color-text-primary);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__content,
[data-reference='admin-pricing-policies'] .pricing-dimensions__form,
[data-reference='admin-pricing-policies'] .pricing-dimensions__fields {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__content {
  padding-block-start: var(--space-4);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__fields,
[data-reference='admin-pricing-policies'] .pricing-dimensions__weekdays {
  margin: 0;
  padding: 0;
  border: 0;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__columns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__columns > * {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__list li {
  display: grid;
  gap: var(--space-1);
  overflow-wrap: anywhere;
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__list span {
  color: var(--color-text-secondary);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__weekdays {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__weekdays legend {
  margin-block-end: var(--space-3);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions__weekdays label,
[data-reference='admin-pricing-policies'] .pricing-dimensions__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

[data-reference='admin-pricing-policies'] .pricing-dimensions :focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
