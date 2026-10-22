<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { FareRuleInputContentFormat } from '@/services/api/generated/inventory-service/model/fareRuleInputContentFormat'
import { FareRuleInputFareUnit } from '@/services/api/generated/inventory-service/model/fareRuleInputFareUnit'
import { FareRuleInputAdvanceScreeningCondition } from '@/services/api/generated/inventory-service/model/fareRuleInputAdvanceScreeningCondition'
import {
  fareCreateErrorMessage,
  fareCreateRequiresReload,
  fareCreateSchema,
  usePricingFareCreate,
} from '../api/admin-pricing-fare-create'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  categoryCode: string
  categoryName: string
  canRead: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  locked: [value: boolean]
  cancel: []
  saved: []
  reload: []
}>()

const { query, save } = usePricingFareCreate(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
    categoryCode: props.categoryCode,
  }),
  () => props.canRead,
  () => props.canEdit,
)

const title = ref<HTMLElement | null>(null)
const validationMessage = ref('')

const form = reactive({
  dayGroupCode: '',
  timeBandCode: '',
  seatTypeCode: '',
  contentFormat: '' as FareRuleInputContentFormat | '',
  advanceScreeningCondition: '' as FareRuleInputAdvanceScreeningCondition | '',
  fareUnit: '' as FareRuleInputFareUnit | '',
  amountVnd: '',
})

const matrix = computed(() => {
  if (!props.canRead || !query.isSuccess.value || query.isFetching.value) {
    return undefined
  }

  return query.data.value
})

const seats = computed(() =>
  (matrix.value?.seatTypes ?? []).filter(
    (item) => item.mappingStatus === 'CONFIRMED' && item.physicalSeatType !== null,
  ),
)

const selectedSeat = computed(() => seats.value.find((item) => item.code === form.seatTypeCode))

const requiresReload = computed(() => fareCreateRequiresReload(save.error.value))

const editable = computed(
  () =>
    props.canRead &&
    props.canEdit &&
    Boolean(matrix.value) &&
    matrix.value?.policy.status === 'DRAFT' &&
    !save.isPending.value &&
    !requiresReload.value,
)

const dirty = computed(() => Object.values(form).some((value) => value !== ''))

const formats = Object.values(FareRuleInputContentFormat)

function clock(value: number) {
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`
}

function seatChanged() {
  form.fareUnit = ''
  validationMessage.value = ''
}

function allowDiscard() {
  return !dirty.value || window.confirm('Hủy mức giá chưa lưu?')
}

function cancel() {
  if (save.isPending.value || !allowDiscard()) return

  emit('locked', false)
  emit('cancel')
}

function reloadAll() {
  if (save.isPending.value || !props.canEdit || !allowDiscard()) {
    return
  }

  emit('locked', false)
  emit('reload')
}

async function submit() {
  if (!editable.value) return

  if (
    !form.dayGroupCode ||
    !form.timeBandCode ||
    !form.seatTypeCode ||
    !form.contentFormat ||
    !form.advanceScreeningCondition ||
    !form.fareUnit
  ) {
    validationMessage.value = 'Chọn đầy đủ thông tin áp dụng mức giá.'
    return
  }

  const parsed = fareCreateSchema.safeParse(form)

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
      categoryCode: props.categoryCode,
      ...parsed.data,
    })

    Object.assign(form, {
      dayGroupCode: '',
      timeBandCode: '',
      seatTypeCode: '',
      contentFormat: '',
      advanceScreeningCondition: '',
      fareUnit: '',
      amountVnd: '',
    })

    emit('locked', false)
    emit('saved')
  } catch {
    // Giữ nguyên form và hiển thị lỗi.
  }
}

function confirmLeave() {
  return !save.isPending.value && allowDiscard()
}

function preventUnload(event: BeforeUnloadEvent) {
  if (!dirty.value && !save.isPending.value) return

  event.preventDefault()
  event.returnValue = ''
}

emit('locked', true)

onMounted(() => {
  title.value?.focus()
  window.addEventListener('beforeunload', preventUnload)
})

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('locked', false)
})
</script>

<template>
  <section
    class="pricing-fare-create"
    aria-labelledby="pricing-fare-create-title"
    :aria-busy="save.isPending.value"
  >
    <h3 id="pricing-fare-create-title" ref="title" tabindex="-1">
      Thêm mức giá cho {{ categoryName }}
    </h3>

    <p class="pricing-hint">Chiếu thường · Giá trọn gói, không cộng thêm phụ thu.</p>

    <p v-if="query.isPending.value || query.isFetching.value" role="status">
      Đang tải thông tin áp dụng…
    </p>

    <p v-else-if="query.isError.value" class="pricing-error" role="alert">
      {{ fareCreateErrorMessage(query.error.value) }}
    </p>

    <form v-if="matrix" class="pricing-form" novalidate @submit.prevent="submit">
      <fieldset class="pricing-fare-create__fields" :disabled="!editable">
        <legend class="admin-visually-hidden">Thông tin mức giá mới</legend>

        <label class="admin-reference__field">
          <span>Nhóm ngày</span>
          <select v-model="form.dayGroupCode" class="admin-reference__input" required>
            <option value="">Chọn nhóm ngày</option>
            <option v-for="item in matrix.dayGroups" :key="item.code" :value="item.code">
              {{ item.name }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Khung giờ</span>
          <select v-model="form.timeBandCode" class="admin-reference__input" required>
            <option value="">Chọn khung giờ</option>
            <option v-for="item in matrix.timeBands" :key="item.code" :value="item.code">
              {{ item.name }} · {{ clock(item.fromMinute) }}–{{ clock(item.toMinute) }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Loại ghế</span>
          <select
            v-model="form.seatTypeCode"
            class="admin-reference__input"
            required
            @change="seatChanged"
          >
            <option value="">Chọn loại ghế</option>
            <option v-for="item in seats" :key="item.code" :value="item.code">
              {{ item.name }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Định dạng phim</span>
          <select v-model="form.contentFormat" class="admin-reference__input" required>
            <option value="">Chọn định dạng</option>
            <option v-for="format in formats" :key="format" :value="format">
              {{ format }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Loại suất chiếu</span>
          <select v-model="form.advanceScreeningCondition" class="admin-reference__input" required>
            <option value="">Chọn loại suất chiếu</option>
            <option :value="FareRuleInputAdvanceScreeningCondition.REGULAR_SCREENING">
              Suất chiếu thông thường
            </option>
            <option :value="FareRuleInputAdvanceScreeningCondition.ADVANCE_SCREENING">
              Suất chiếu sớm
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Giá vé (VND)</span>
          <input
            v-model="form.amountVnd"
            class="admin-reference__input"
            type="text"
            inputmode="numeric"
            maxlength="19"
            aria-describedby="pricing-fare-amount-help"
            required
          />
        </label>

        <label class="admin-reference__field">
          <span>Số tiền trên được tính cho</span>
          <select
            v-model="form.fareUnit"
            class="admin-reference__input"
            :disabled="!selectedSeat"
            required
          >
            <option value="">Xác nhận cách tính</option>
            <option
              v-if="selectedSeat?.physicalSeatType === 'COUPLE'"
              :value="FareRuleInputFareUnit.PER_PAIR"
            >
              Cả cặp ghế đôi
            </option>
            <option v-else-if="selectedSeat" :value="FareRuleInputFareUnit.PER_TICKET">
              Một vé
            </option>
          </select>
        </label>
      </fieldset>

      <p class="pricing-hint">
        Áp dụng từ {{ matrix.policy.effectiveFrom }}
        {{ matrix.policy.effectiveTo ? `đến trước ${matrix.policy.effectiveTo}.` : '' }}
      </p>

      <p v-if="validationMessage" class="pricing-error" role="alert">
        {{ validationMessage }}
      </p>

      <p v-if="save.isError.value" class="pricing-error" role="alert">
        {{ fareCreateErrorMessage(save.error.value) }}
      </p>

      <AppButton type="submit" :loading="save.isPending.value" :disabled="!editable">
        Lưu mức giá
      </AppButton>
    </form>

    <div class="pricing-type-detail__actions">
      <AppButton type="button" variant="secondary" :disabled="save.isPending.value" @click="cancel">
        Hủy nhập
      </AppButton>

      <AppButton
        v-if="requiresReload || query.isError.value"
        type="button"
        variant="secondary"
        :disabled="save.isPending.value || !canEdit"
        @click="reloadAll"
      >
        Tải lại bản giá
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
[data-reference='admin-pricing-policies'] .pricing-fare-create {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--pricing-panel-padding);
  border-block: var(--border-width-thin) solid var(--color-border);
  background: var(--color-surface);
}

[data-reference='admin-pricing-policies'] .pricing-fare-create h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

[data-reference='admin-pricing-policies'] .pricing-fare-create__fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

[data-reference='admin-pricing-policies'] .pricing-fare-create__fields > label {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-policies'] .pricing-fare-create :focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
