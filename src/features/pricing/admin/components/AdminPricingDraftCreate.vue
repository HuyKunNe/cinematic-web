<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  PricingDraftCreationError,
  pricingDraftSchema,
  useCreatePricingDraft,
  type CreatedPricingDraft,
} from '../api/admin-pricing-create'

const props = defineProps<{
  cinemaId: string
  canCreate: boolean
}>()

const emit = defineEmits<{
  created: [draft: CreatedPricingDraft]
}>()

const form = reactive({
  effectiveFrom: '',
  effectiveTo: '',
})

const attempted = ref(false)
const mutation = useCreatePricingDraft()

const validation = computed(() =>
  pricingDraftSchema.safeParse({
    cinemaId: props.cinemaId,
    ...form,
  }),
)

const uncertain = computed(
  () => mutation.error.value instanceof PricingDraftCreationError && mutation.error.value.uncertain,
)

const blocked = computed(
  () => !props.canCreate || mutation.isPending.value || mutation.isSuccess.value || uncertain.value,
)

const errorMessage = computed(() => {
  const error = mutation.error.value

  return error instanceof PricingDraftCreationError
    ? error.message
    : 'Không thể tạo bản nháp. Vui lòng kiểm tra lại danh sách phiên bản.'
})

function fieldError(field: 'effectiveFrom' | 'effectiveTo') {
  const result = validation.value

  if (!attempted.value || result.success) return ''

  return result.error.flatten().fieldErrors[field]?.[0] ?? ''
}

async function submit() {
  if (blocked.value) return

  attempted.value = true

  const result = validation.value
  if (!result.success) return

  try {
    const draft = await mutation.mutateAsync(result.data)
    emit('created', draft)
  } catch {
    // Mutation giữ lỗi để hiển thị; không tự gửi lại POST.
  }
}

function startAnotherRequest() {
  if (mutation.isPending.value) return

  mutation.reset()
  attempted.value = false
}
</script>

<template>
  <section
    class="admin-reference__panel pricing-draft"
    data-reference="admin-pricing-draft"
    aria-labelledby="pricing-draft-title"
  >
    <header>
      <h2 id="pricing-draft-title">Tạo bản nháp chính sách</h2>
      <p>
        Tạo phiên bản ma trận mới cho rạp đang chọn. Backend tự cấp phiên bản và lấy timezone của
        rạp.
      </p>
    </header>

    <form @submit.prevent="submit">
      <fieldset :disabled="blocked">
        <legend class="admin-visually-hidden">Thông tin bản nháp mới</legend>

        <label class="admin-reference__field">
          <span>Đơn vị tiền</span>
          <input class="admin-reference__input" value="VND" readonly />
        </label>

        <label class="admin-reference__field">
          <span>Ngày bắt đầu hiệu lực *</span>
          <input
            v-model="form.effectiveFrom"
            class="admin-reference__input"
            type="date"
            required
            :aria-invalid="Boolean(fieldError('effectiveFrom'))"
            aria-describedby="draft-from-error"
          />
          <span id="draft-from-error" class="pricing-draft__error">
            {{ fieldError('effectiveFrom') }}
          </span>
        </label>

        <label class="admin-reference__field">
          <span>Ngày kết thúc hiệu lực</span>
          <input
            v-model="form.effectiveTo"
            class="admin-reference__input"
            type="date"
            :aria-invalid="Boolean(fieldError('effectiveTo'))"
            aria-describedby="draft-to-error draft-to-help"
          />
          <span id="draft-to-error" class="pricing-draft__error">
            {{ fieldError('effectiveTo') }}
          </span>
          <span id="draft-to-help"> Không bao gồm ngày kết thúc. Để trống nếu chưa giới hạn. </span>
        </label>
      </fieldset>

      <p class="pricing-draft__notice">
        Chỉ tạo metadata DRAFT thuộc mô hình FARE_MATRIX_V2. Chưa có giá, phạm vi bán hoặc phụ thu;
        chưa được xuất bản.
      </p>

      <p v-if="mutation.isPending.value" role="status">Đang tạo bản nháp…</p>

      <p v-else-if="mutation.isError.value" class="pricing-draft__error" role="alert">
        {{ errorMessage }}
      </p>

      <p v-else-if="mutation.isSuccess.value" role="status">
        Đã tạo bản nháp v{{ mutation.data.value?.policyVersion }}. Danh sách phiên bản đang được cập
        nhật.
      </p>

      <div class="pricing-draft__actions">
        <AppButton type="submit" :loading="mutation.isPending.value" :disabled="blocked">
          Tạo bản nháp
        </AppButton>

        <AppButton
          v-if="mutation.isSuccess.value || uncertain"
          type="button"
          variant="secondary"
          @click="startAnotherRequest"
        >
          {{ uncertain ? 'Đã kiểm tra danh sách, bắt đầu yêu cầu mới' : 'Tạo bản nháp khác' }}
        </AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
[data-reference='admin-pricing-draft'] {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin-top: var(--space-5);
  padding: var(--space-5);
}

[data-reference='admin-pricing-draft'] h2 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-lg);
}

[data-reference='admin-pricing-draft'] p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

[data-reference='admin-pricing-draft'] form {
  display: grid;
  gap: var(--space-4);
}

[data-reference='admin-pricing-draft'] fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

[data-reference='admin-pricing-draft'] fieldset > label {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-draft'] .pricing-draft__notice {
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-draft'] .pricing-draft__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

[data-reference='admin-pricing-draft'] .pricing-draft__error {
  color: var(--color-error);
}

[data-reference='admin-pricing-draft'] [aria-invalid='true'] {
  border-color: var(--color-error);
}

[data-reference='admin-pricing-draft'] :is(input, button):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
