<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import {
  CategoryEditorError,
  categoryListSchema,
  usePricingCategoriesEditor,
  type CategoryForm,
} from '../api/admin-pricing-categories-editor'
import { pricingErrorMessage } from '../api/admin-pricing-queries'
import { CategoryInputEligibilityMode } from '@/services/api/generated/inventory-service/model/categoryInputEligibilityMode'
import { CategoryInputPricingRole } from '@/services/api/generated/inventory-service/model/categoryInputPricingRole'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  canRead: boolean
}>()

const emit = defineEmits<{
  locked: [value: boolean]
  saved: []
  reload: []
}>()

const { query, save } = usePricingCategoriesEditor(
  () => ({
    cinemaId: props.cinemaId,
    policyId: props.policyId,
    version: props.version,
  }),
  () => props.canRead,
)

type FormRow = CategoryForm & { localKey: number }

let nextKey = 0
const rows = ref<FormRow[]>([])
const baseline = ref('[]')
const initialized = ref(false)
const validationMessage = ref('')

function values(): CategoryForm[] {
  return rows.value.map((row) => ({
    code: row.code,
    name: row.name,
    pricingRole: row.pricingRole,
    eligibilityMode: row.eligibilityMode,
    eligibilityRuleCode: row.eligibilityRuleCode,
  }))
}

watch(
  query.data,
  (data) => {
    if (!data || initialized.value) return

    rows.value = data.ticketCategories.map((item) => ({
      ...item,
      localKey: nextKey++,
    }))
    baseline.value = JSON.stringify(values())
    initialized.value = true
  },
  { immediate: true },
)

const dirty = computed(() => initialized.value && JSON.stringify(values()) !== baseline.value)

const requiresReload = computed(
  () => save.error.value instanceof CategoryEditorError && save.error.value.requiresReload,
)

const editable = computed(
  () =>
    props.canRead &&
    initialized.value &&
    query.isSuccess.value &&
    !query.isFetching.value &&
    query.data.value?.policy.status === 'DRAFT' &&
    !save.isPending.value &&
    !requiresReload.value,
)

const locked = computed(() => dirty.value || save.isPending.value)

watch(locked, (value) => emit('locked', value), {
  immediate: true,
  flush: 'sync',
})

const roles = Object.values(CategoryInputPricingRole)
const modes = Object.values(CategoryInputEligibilityMode)

const roleLabels = {
  UNCONFIRMED: 'Chưa xác nhận',
  REGULAR: 'Giá thường',
  CATEGORY_DISCOUNT: 'Giá theo đối tượng',
  C_MONDAY: 'C’Monday',
  C_MEMBER: 'C’Member',
  C_TEN: 'C’Ten',
} as const

const modeLabels = {
  UNCONFIRMED: 'Chưa xác nhận',
  UNRESTRICTED: 'Không yêu cầu điều kiện riêng',
  RULE_REQUIRED: 'Yêu cầu rule điều kiện',
} as const

const incomplete = computed(
  () =>
    rows.value.filter((row) => row.pricingRole === 'REGULAR').length !== 1 ||
    rows.value.some(
      (row) => row.pricingRole === 'UNCONFIRMED' || row.eligibilityMode === 'UNCONFIRMED',
    ),
)

function roleChanged(row: FormRow) {
  if (row.pricingRole === 'REGULAR') {
    row.eligibilityMode = CategoryInputEligibilityMode.UNRESTRICTED
    row.eligibilityRuleCode = ''
  }
}

function errorText(error: unknown) {
  return error instanceof CategoryEditorError ? error.message : pricingErrorMessage(error)
}

function addRow() {
  if (!editable.value || rows.value.length >= 100) return

  rows.value.push({
    localKey: nextKey++,
    code: '',
    name: '',
    pricingRole: CategoryInputPricingRole.UNCONFIRMED,
    eligibilityMode: CategoryInputEligibilityMode.UNCONFIRMED,
    eligibilityRuleCode: '',
  })
}

async function submit() {
  if (!editable.value || !dirty.value) return

  const parsed = categoryListSchema.safeParse(values())

  if (!parsed.success) {
    validationMessage.value = parsed.error.issues
      .map((issue) => {
        const index = issue.path[0]
        return typeof index === 'number' ? `Nhóm ${index + 1}: ${issue.message}` : issue.message
      })
      .join(' ')
    return
  }

  validationMessage.value = ''

  try {
    const result = await save.mutateAsync({
      cinemaId: props.cinemaId,
      policyId: props.policyId,
      version: props.version,
      ticketCategories: parsed.data,
    })

    rows.value = result.ticketCategories.map((item) => ({
      ...item,
      localKey: nextKey++,
    }))
    baseline.value = JSON.stringify(values())
    emit('saved')
  } catch {
    // Giữ dữ liệu nhập và hiển thị lỗi của mutation.
  }
}

function confirmLeave() {
  if (save.isPending.value) return false

  return !dirty.value || window.confirm('Bỏ thay đổi nhóm vé chưa lưu?')
}

function reloadPolicy() {
  if (!confirmLeave()) return

  baseline.value = JSON.stringify(values())
  validationMessage.value = ''
  emit('reload')
}

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(
  locked,
  (value) => {
    if (value) window.addEventListener('beforeunload', preventUnload)
    else window.removeEventListener('beforeunload', preventUnload)
  },
  { flush: 'sync' },
)

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('locked', false)
})
</script>

<template>
  <section
    class="admin-reference__panel category-editor"
    data-reference="admin-pricing-category-editor"
    aria-labelledby="category-editor-title"
  >
    <header class="category-editor__heading">
      <div>
        <h2 id="category-editor-title">Nhóm vé của policy</h2>
        <p>Vai trò giá và điều kiện riêng của từng nhóm vé.</p>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        :disabled="save.isPending.value"
        @click="reloadPolicy"
      >
        {{ dirty ? 'Bỏ thay đổi và tải lại policy' : 'Tải lại policy' }}
      </AppButton>
    </header>

    <p v-if="!canRead">Bạn không có quyền xem hoặc sửa danh mục.</p>

    <p v-else-if="query.isPending.value || query.isFetching.value" role="status">
      Đang tải nhóm vé…
    </p>

    <p v-else-if="query.isError.value" class="category-editor__error" role="alert">
      {{ errorText(query.error.value) }}
    </p>

    <form v-else-if="initialized" @submit.prevent="submit">
      <p v-if="query.data.value?.policy.status === 'PUBLISHED'" role="status">
        Phiên bản đã xuất bản chỉ được xem.
      </p>

      <fieldset :disabled="!editable">
        <legend class="admin-visually-hidden">Danh mục nhóm vé</legend>

        <p v-if="rows.length === 0">Chưa có nhóm vé.</p>

        <article
          v-for="(row, index) in rows"
          :key="row.localKey"
          class="category-editor__row"
          :aria-label="`Nhóm vé ${index + 1}`"
        >
          <label class="admin-reference__field">
            <span>Mã nhóm vé *</span>
            <input v-model="row.code" class="admin-reference__input" maxlength="64" required />
          </label>

          <label class="admin-reference__field">
            <span>Tên nhóm vé *</span>
            <input v-model="row.name" class="admin-reference__input" maxlength="150" required />
          </label>

          <label class="admin-reference__field">
            <span>Vai trò giá *</span>
            <select
              v-model="row.pricingRole"
              class="admin-reference__input"
              @change="roleChanged(row)"
            >
              <option v-for="role in roles" :key="role" :value="role">
                {{ roleLabels[role] }}
              </option>
            </select>
          </label>

          <label class="admin-reference__field">
            <span>Điều kiện *</span>
            <select
              v-model="row.eligibilityMode"
              class="admin-reference__input"
              :disabled="row.pricingRole === 'REGULAR'"
              @change="row.eligibilityRuleCode = ''"
            >
              <option v-for="mode in modes" :key="mode" :value="mode">
                {{ modeLabels[mode] }}
              </option>
            </select>
          </label>

          <label class="admin-reference__field">
            <span>Mã rule điều kiện</span>
            <input
              v-model="row.eligibilityRuleCode"
              class="admin-reference__input"
              maxlength="64"
              :required="row.eligibilityMode === 'RULE_REQUIRED'"
              :disabled="row.eligibilityMode !== 'RULE_REQUIRED'"
            />
          </label>

          <AppButton
            type="button"
            variant="secondary"
            :disabled="!editable"
            :aria-label="`Xóa nhóm vé ${index + 1}`"
            @click="rows.splice(index, 1)"
          >
            Xóa nhóm
          </AppButton>
        </article>

        <AppButton
          type="button"
          variant="secondary"
          :disabled="!editable || rows.length >= 100"
          @click="addRow"
        >
          Thêm nhóm vé
        </AppButton>
      </fieldset>

      <p v-if="incomplete" class="category-editor__notice" role="status">
        Danh mục còn chưa hoàn chỉnh. Có thể lưu draft, nhưng policy hoàn chỉnh cần đúng một nhóm
        REGULAR và không còn vai trò/điều kiện UNCONFIRMED.
      </p>

      <p class="category-editor__notice">
        Lưu thay toàn bộ danh mục; danh sách rỗng sẽ xóa danh mục. Đổi hoặc xóa mã nhóm có thể làm
        fare rule mất tham chiếu. Khai báo điều kiện không xác nhận khách hàng đủ điều kiện.
      </p>

      <p v-if="validationMessage" class="category-editor__error" role="alert">
        {{ validationMessage }}
      </p>

      <p v-if="save.isError.value" class="category-editor__error" role="alert">
        {{ errorText(save.error.value) }}
      </p>

      <AppButton type="submit" :loading="save.isPending.value" :disabled="!editable || !dirty">
        Lưu danh mục · {{ rows.length }} nhóm
      </AppButton>
    </form>
  </section>
</template>

<style scoped>
[data-reference='admin-pricing-category-editor'] {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  margin-top: var(--space-5);
  padding: var(--space-5);
}

[data-reference='admin-pricing-category-editor'] .category-editor__heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-4);
}

[data-reference='admin-pricing-category-editor'] h2 {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-lg);
}

[data-reference='admin-pricing-category-editor'] p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

[data-reference='admin-pricing-category-editor'] :is(form, fieldset) {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

[data-reference='admin-pricing-category-editor'] fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

[data-reference='admin-pricing-category-editor'] .category-editor__row {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
}

[data-reference='admin-pricing-category-editor'] .category-editor__row > label {
  flex: 1 1 var(--admin-reference-preview-width);
  min-width: 0;
}

[data-reference='admin-pricing-category-editor'] .category-editor__notice {
  padding: var(--space-4);
  background: var(--color-surface-raised);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

[data-reference='admin-pricing-category-editor'] .category-editor__error {
  color: var(--color-error);
}

[data-reference='admin-pricing-category-editor'] :is(input, select, button):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
