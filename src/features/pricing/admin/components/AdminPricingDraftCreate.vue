<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
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
  busy: [value: boolean]
  cancel: []
}>()

const form = reactive({ effectiveFrom: '', effectiveTo: '' })
const attempted = ref(false)
const mutation = useCreatePricingDraft()

watch(mutation.isPending, (value) => emit('busy', value), { immediate: true, flush: 'sync' })

onBeforeUnmount(() => emit('busy', false))

const validation = computed(() =>
  pricingDraftSchema.safeParse({ cinemaId: props.cinemaId, ...form }),
)

const uncertain = computed(
  () => mutation.error.value instanceof PricingDraftCreationError && mutation.error.value.uncertain,
)

const blocked = computed(
  () => !props.canCreate || mutation.isPending.value || mutation.isSuccess.value || uncertain.value,
)

function fieldError(field: 'effectiveFrom' | 'effectiveTo') {
  const result = validation.value
  if (!attempted.value || result.success) return ''
  return result.error.flatten().fieldErrors[field]?.[0] ?? ''
}

const errorMessage = computed(() => {
  const error = mutation.error.value
  return error instanceof PricingDraftCreationError
    ? error.message.replaceAll('Backend', 'Hệ thống')
    : 'Chưa tạo được bản giá. Vui lòng kiểm tra lại danh sách.'
})

async function submit() {
  if (blocked.value) return

  attempted.value = true
  const result = validation.value
  if (!result.success) return

  try {
    emit('created', await mutation.mutateAsync(result.data))
  } catch {
    // Giữ lỗi để hiển thị, không tự gửi lại.
  }
}
</script>

<template>
  <section class="admin-reference__panel pricing-policy-context" aria-labelledby="new-price-title">
    <header class="pricing-panel-heading">
      <div>
        <h2 id="new-price-title">Tạo bản giá mới</h2>
        <p>Chọn ngày dự kiến bắt đầu áp dụng. Bản mới được lưu ở trạng thái nháp.</p>
      </div>
    </header>

    <form class="pricing-form" @submit.prevent="submit">
      <fieldset class="pricing-new-price-fields" :disabled="blocked">
        <legend class="admin-visually-hidden">Thông tin bản giá mới</legend>

        <label class="admin-reference__field">
          <span>Tiền tệ</span>
          <input class="admin-reference__input" value="Đồng Việt Nam" readonly />
        </label>

        <label class="admin-reference__field">
          <span>Ngày bắt đầu *</span>
          <input
            v-model="form.effectiveFrom"
            class="admin-reference__input"
            type="date"
            required
            :aria-invalid="Boolean(fieldError('effectiveFrom'))"
            aria-describedby="new-price-from-error"
          />
          <span id="new-price-from-error" class="pricing-error">
            {{ fieldError('effectiveFrom') }}
          </span>
        </label>

        <label class="admin-reference__field">
          <span>Ngày kết thúc</span>
          <input
            v-model="form.effectiveTo"
            class="admin-reference__input"
            type="date"
            :aria-invalid="Boolean(fieldError('effectiveTo'))"
            aria-describedby="new-price-to-error"
          />
          <small>Để trống nếu chưa ấn định ngày kết thúc.</small>
          <span id="new-price-to-error" class="pricing-error">
            {{ fieldError('effectiveTo') }}
          </span>
        </label>
      </fieldset>

      <p class="pricing-help">
        Bản giá mới chưa có loại vé và mức giá. Bạn sẽ bổ sung các thông tin này trước khi đưa vào
        sử dụng.
      </p>

      <p v-if="mutation.isPending.value" role="status">Đang tạo bản giá…</p>
      <p v-if="mutation.isError.value" class="pricing-error" role="alert">
        {{ errorMessage }}
      </p>

      <div class="pricing-type-detail__actions">
        <AppButton
          type="button"
          variant="secondary"
          :disabled="mutation.isPending.value"
          @click="emit('cancel')"
        >
          Đóng
        </AppButton>
        <AppButton type="submit" :loading="mutation.isPending.value" :disabled="blocked">
          Tạo bản giá
        </AppButton>
      </div>
    </form>
  </section>
</template>
