<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { SeatTypeInputPhysicalSeatType } from '@/services/api/generated/inventory-service/model/seatTypeInputPhysicalSeatType'
import {
  pricingSeatFormSchema,
  seatTypeErrorMessage,
  seatTypeRequiresReload,
  usePricingSeatTypes,
} from '../api/admin-pricing-seat-types'

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

const { query, add } = usePricingSeatTypes(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
  }),
  () => props.canRead,
)

const labels: Record<SeatTypeInputPhysicalSeatType, string> = {
  STANDARD: 'Ghế tiêu chuẩn',
  VIP: 'Ghế cao cấp',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Ghế hỗ trợ người khuyết tật',
}

const physicalTypes = Object.values(SeatTypeInputPhysicalSeatType)
const name = ref('')
const physicalSeatType = ref<SeatTypeInputPhysicalSeatType | ''>('')
const suggestedName = ref('')
const validationMessage = ref('')

const rows = computed(() => {
  if (!props.canRead || !query.isSuccess.value || query.isFetching.value) {
    return []
  }

  return query.data.value?.seatTypes ?? []
})

const dirty = computed(() => name.value !== '' || physicalSeatType.value !== '')

const locked = computed(() => dirty.value || add.isPending.value)

const requiresReload = computed(() => seatTypeRequiresReload(add.error.value))

const isDraft = computed(() => query.data.value?.policy.status === 'DRAFT')

const editable = computed(
  () =>
    props.canRead &&
    props.canEdit &&
    query.isSuccess.value &&
    !query.isFetching.value &&
    isDraft.value &&
    !add.isPending.value &&
    !requiresReload.value,
)

const unusedTypes = computed(() =>
  physicalTypes.filter((type) => !rows.value.some((row) => row.physicalSeatType === type)),
)

const hasRoom = computed(() => rows.value.length < 100 && unusedTypes.value.length > 0)

function typeUsed(type: SeatTypeInputPhysicalSeatType) {
  return rows.value.some((row) => row.physicalSeatType === type)
}

function typeChanged() {
  const suggestion = physicalSeatType.value ? labels[physicalSeatType.value] : ''

  if (!name.value.trim() || name.value === suggestedName.value) {
    name.value = suggestion
  }

  suggestedName.value = suggestion
  validationMessage.value = ''
}

function clearForm() {
  name.value = ''
  physicalSeatType.value = ''
  suggestedName.value = ''
  validationMessage.value = ''
}

function cancel() {
  if (add.isPending.value) return

  clearForm()

  if (!requiresReload.value) add.reset()
}

async function submit() {
  if (!editable.value || !hasRoom.value) return

  const parsed = pricingSeatFormSchema.safeParse({
    name: name.value,
    physicalSeatType: physicalSeatType.value,
  })

  if (!parsed.success) {
    validationMessage.value = 'Chọn loại ghế trong phòng và nhập tên hiển thị từ 1 đến 150 ký tự.'
    return
  }

  validationMessage.value = ''

  try {
    await add.mutateAsync({
      cinemaId: props.cinemaId,
      policyId: props.policyId,
      version: props.version,
      ...parsed.data,
    })

    clearForm()
    emit('locked', false)
    emit('saved')
  } catch {
    // Giữ thông tin người dùng nhập và hiển thị lỗi bên dưới.
  }
}

function allowDiscard() {
  return !dirty.value || window.confirm('Hủy thông tin loại ghế chưa lưu?')
}

function reloadAll() {
  if (add.isPending.value || !props.canEdit || !allowDiscard()) {
    return
  }

  clearForm()
  emit('locked', false)
  emit('reload')
}

function confirmLeave() {
  return !add.isPending.value && allowDiscard()
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
    class="pricing-seat-setup"
    :open="dirty || add.isPending.value || (query.isSuccess.value && rows.length === 0)"
  >
    <summary>
      Loại ghế áp dụng
      <span
        v-if="canRead && query.isSuccess.value && !query.isFetching.value"
        class="pricing-badge"
      >
        {{ rows.length }}
      </span>
    </summary>

    <div class="pricing-seat-setup__content">
      <p class="pricing-hint">
        Chọn các loại ghế trong phòng chiếu để đặt mức giá tương ứng. Thông tin này áp dụng cho toàn
        bộ bản giá.
      </p>

      <p v-if="!canRead" role="alert">Bạn không có quyền xem loại ghế.</p>

      <p v-else-if="query.isPending.value || query.isFetching.value" role="status">
        Đang tải loại ghế…
      </p>

      <div v-else-if="query.isError.value" class="pricing-feedback" role="alert">
        <p class="pricing-error">
          {{ seatTypeErrorMessage(query.error.value) }}
        </p>

        <AppButton type="button" variant="secondary" :disabled="!canEdit" @click="reloadAll">
          Tải lại bản giá
        </AppButton>
      </div>

      <template v-else-if="query.isSuccess.value">
        <p v-if="rows.length === 0" class="pricing-help">
          Bản giá chưa có loại ghế.
          {{ isDraft ? 'Thêm loại ghế đầu tiên để tiếp tục đặt giá.' : '' }}
        </p>

        <div
          v-else
          class="pricing-seat-setup__scroll"
          tabindex="0"
          role="region"
          aria-label="Danh sách loại ghế áp dụng, có thể cuộn ngang"
        >
          <table class="pricing-seat-setup__table">
            <caption class="admin-visually-hidden">
              Các loại ghế đã có trong bản giá
            </caption>

            <thead>
              <tr>
                <th scope="col">Tên hiển thị</th>
                <th scope="col">Ghế trong phòng chiếu</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="row in rows" :key="row.code">
                <th scope="row">{{ row.name }}</th>
                <td>
                  {{ row.physicalSeatType ? labels[row.physicalSeatType] : 'Chưa lựa chọn' }}
                </td>
                <td>
                  {{ row.mappingStatus === 'CONFIRMED' ? 'Đã xác định' : 'Cần kiểm tra' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="!isDraft" class="pricing-hint">Bản giá đã công bố, chỉ có thể xem.</p>

        <p v-else-if="!hasRoom" class="pricing-hint">Đã thêm đủ các loại ghế có thể lựa chọn.</p>

        <form
          v-else
          class="pricing-seat-setup__form"
          aria-label="Thêm loại ghế áp dụng"
          :aria-busy="add.isPending.value"
          @submit.prevent="submit"
        >
          <fieldset class="pricing-seat-setup__fields" :disabled="!editable">
            <legend class="admin-visually-hidden">Thông tin loại ghế</legend>

            <label class="admin-reference__field">
              <span>Ghế trong phòng chiếu</span>
              <select
                v-model="physicalSeatType"
                class="admin-reference__input"
                required
                @change="typeChanged"
              >
                <option value="">Chọn loại ghế</option>
                <option
                  v-for="type in physicalTypes"
                  :key="type"
                  :value="type"
                  :disabled="typeUsed(type)"
                >
                  {{ labels[type] }}{{ typeUsed(type) ? ' · Đã thêm' : '' }}
                </option>
              </select>
            </label>

            <label class="admin-reference__field">
              <span>Tên hiển thị trong bản giá</span>
              <input v-model="name" class="admin-reference__input" maxlength="150" required />
            </label>
          </fieldset>

          <p v-if="physicalSeatType === 'COUPLE'" class="pricing-hint">
            Lựa chọn này xác định ghế đôi trong phòng. Cách tính tiền và phụ thu sẽ được cấu hình
            tại phần mức giá.
          </p>

          <p v-if="validationMessage" class="pricing-error" role="alert">
            {{ validationMessage }}
          </p>

          <p v-if="add.isError.value" class="pricing-error" role="alert">
            {{ seatTypeErrorMessage(add.error.value) }}
          </p>

          <div class="pricing-type-detail__actions">
            <AppButton
              type="button"
              variant="secondary"
              :disabled="!dirty || add.isPending.value"
              @click="cancel"
            >
              Hủy nhập
            </AppButton>

            <AppButton type="submit" :loading="add.isPending.value" :disabled="!editable || !dirty">
              Lưu loại ghế
            </AppButton>

            <AppButton
              v-if="requiresReload"
              type="button"
              variant="secondary"
              :disabled="add.isPending.value || !canEdit"
              @click="reloadAll"
            >
              Tải lại bản giá
            </AppButton>
          </div>
        </form>
      </template>
    </div>
  </details>
</template>

<style scoped>
[data-reference='admin-pricing-policies'] .pricing-seat-setup {
  --pricing-seat-table-min-width: 32rem;

  min-width: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup > summary {
  display: list-item;
  cursor: pointer;
  color: var(--color-text-primary);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup > summary .pricing-badge {
  margin-inline-start: var(--space-2);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__content,
[data-reference='admin-pricing-policies'] .pricing-seat-setup__form {
  display: grid;
  gap: var(--space-4);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__content {
  padding-block-start: var(--space-4);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__fields > label {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__scroll {
  min-width: 0;
  overflow-x: auto;
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__table {
  width: 100%;
  min-width: var(--pricing-seat-table-min-width);
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__table th,
[data-reference='admin-pricing-policies'] .pricing-seat-setup__table td {
  padding: var(--space-3);
  border-block-end: var(--border-width-thin) solid var(--color-border);
  text-align: start;
  vertical-align: top;
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup__table thead {
  background: var(--color-surface-raised);
}

[data-reference='admin-pricing-policies'] .pricing-seat-setup :focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
