<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import {
  CategoryEditorError,
  categoryListSchema,
  usePricingCategoriesEditor,
  type CategoryForm,
} from '../api/admin-pricing-categories-editor'
import { pricingErrorMessage } from '../api/admin-pricing-queries'

const props = defineProps<{
  cinemaId: string
  policyId: string
  version: number
  canRead: boolean
  canEdit: boolean
  selectedCode: string
}>()

const emit = defineEmits<{
  selected: [value: { code: string; name: string } | null]
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

const rows = ref<CategoryForm[]>([])
const savedRows = ref<CategoryForm[]>([])
const activeCode = ref('')
const initialized = ref(false)
const validationMessage = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const roleLabels = {
  UNCONFIRMED: 'Cần kiểm tra',
  REGULAR: 'Vé thông thường',
  CATEGORY_DISCOUNT: 'Vé ưu đãi theo nhóm khách',
  C_MONDAY: 'Ưu đãi thứ Hai',
  C_MEMBER: 'Ưu đãi thành viên',
  C_TEN: 'Ưu đãi C’Ten',
} as const

const roleDescriptions = {
  UNCONFIRMED: 'Chưa rõ cách áp dụng',
  REGULAR: 'Dành cho mọi khách',
  CATEGORY_DISCOUNT: 'Dành cho khách đủ điều kiện',
  C_MONDAY: 'Chương trình riêng của rạp',
  C_MEMBER: 'Dành cho thành viên',
  C_TEN: 'Chương trình riêng của rạp',
} as const

const roles = Object.keys(roleLabels) as Array<CategoryForm['pricingRole']>

function copy(items: CategoryForm[]) {
  return items.map((item) => ({ ...item }))
}

function preferredCode(items: CategoryForm[], preferred = '') {
  return (
    items.find((item) => item.code === preferred)?.code ??
    items.find((item) => item.pricingRole === 'REGULAR')?.code ??
    items[0]?.code ??
    ''
  )
}

watch(
  query.data,
  (data) => {
    if (!data || initialized.value) return

    savedRows.value = copy(data.ticketCategories)
    rows.value = copy(data.ticketCategories)
    activeCode.value = preferredCode(rows.value, props.selectedCode)
    initialized.value = true
  },
  { immediate: true },
)

const selected = computed(() => rows.value.find((item) => item.code === activeCode.value))

watch(
  () => ({
    ready: initialized.value,
    code: selected.value?.code ?? '',
    name: selected.value?.name ?? '',
  }),
  (value) => {
    if (!value.ready) return

    emit('selected', value.code ? { code: value.code, name: value.name } : null)
  },
  { immediate: true },
)

const dirty = computed(
  () => initialized.value && JSON.stringify(rows.value) !== JSON.stringify(savedRows.value),
)

const requiresReload = computed(
  () => save.error.value instanceof CategoryEditorError && save.error.value.requiresReload,
)

const editable = computed(
  () =>
    props.canRead &&
    props.canEdit &&
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

const hasRegular = computed(() => rows.value.some((item) => item.pricingRole === 'REGULAR'))

const savedCondition = computed(
  () => savedRows.value.find((item) => item.code === activeCode.value)?.eligibilityRuleCode ?? '',
)

function readableError(error: unknown) {
  const message = error instanceof CategoryEditorError ? error.message : pricingErrorMessage(error)

  return message
    .replaceAll('Metadata policy', 'Thông tin bản giá')
    .replaceAll('metadata policy', 'thông tin bản giá')
    .replaceAll('Policy', 'Bản giá')
    .replaceAll('policy', 'bản giá')
    .replaceAll('Backend', 'Hệ thống')
    .replaceAll('Response xác nhận', 'Thông tin xác nhận')
    .replaceAll('vai trò giá', 'cách tính giá')
}

function restore(preferred = activeCode.value) {
  rows.value = copy(savedRows.value)
  activeCode.value = preferredCode(rows.value, preferred)
  validationMessage.value = ''
}

function allowDiscard() {
  return !dirty.value || window.confirm('Hủy thay đổi loại vé chưa lưu?')
}

function selectTicket(code: string) {
  if (save.isPending.value || code === activeCode.value) return
  if (!allowDiscard()) return

  if (dirty.value) restore(code)
  else activeCode.value = code
}

async function addTicket(role: CategoryForm['pricingRole']) {
  if (!editable.value || !allowDiscard()) return

  if (dirty.value) restore()
  if (rows.value.length >= 100) return
  if (role === 'REGULAR' && hasRegular.value) return

  let index = 1
  let code = `${role}_${index}`

  while (rows.value.some((item) => item.code === code)) {
    code = `${role}_${++index}`
  }

  rows.value.push({
    code,
    name: roleLabels[role],
    pricingRole: role,
    eligibilityMode: role === 'REGULAR' ? 'UNRESTRICTED' : 'UNCONFIRMED',
    eligibilityRuleCode: '',
  })

  activeCode.value = code
  validationMessage.value = ''

  await nextTick()
  nameInput.value?.focus()
}

function roleChanged() {
  const row = selected.value
  if (!row) return

  if (row.pricingRole === 'REGULAR') {
    row.eligibilityMode = 'UNRESTRICTED'
    row.eligibilityRuleCode = ''
  }
}

function eligibilityChanged() {
  const row = selected.value
  if (!row) return

  row.eligibilityRuleCode = row.eligibilityMode === 'RULE_REQUIRED' ? savedCondition.value : ''
}

async function persist(items: CategoryForm[]) {
  if (!editable.value) return

  const parsed = categoryListSchema.safeParse(items)

  if (!parsed.success) {
    validationMessage.value =
      'Kiểm tra tên loại vé, cách tính giá và điều kiện mua. ' +
      'Mỗi bản giá chỉ có một loại vé thông thường.'
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

    savedRows.value = copy(result.ticketCategories)
    rows.value = copy(result.ticketCategories)
    activeCode.value = preferredCode(rows.value, activeCode.value)
    emit('saved')
  } catch {
    // Giữ nguyên thông tin nhập và hiển thị lỗi.
  }
}

async function submit() {
  if (!dirty.value) return
  await persist(rows.value)
}

async function removeTicket() {
  const row = selected.value
  if (!row || !editable.value) return

  if (!savedRows.value.some((item) => item.code === row.code)) {
    restore()
    return
  }

  if (
    !window.confirm(`Xóa “${row.name}”? Các mức giá đang dùng loại vé này cần được kiểm tra lại.`)
  ) {
    return
  }

  await persist(rows.value.filter((item) => item.code !== row.code))
}

function reloadAll() {
  if (save.isPending.value || !allowDiscard()) return
  restore()
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
  <section class="admin-reference__panel pricing-workspace" aria-labelledby="ticket-types-title">
    <header class="pricing-panel-heading">
      <div>
        <p class="admin-reference__eyebrow">Bước 2</p>
        <h2 id="ticket-types-title">Chọn loại vé</h2>
        <p>Chọn một mục bên trái để xem cách áp dụng và mức giá.</p>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        :disabled="!editable || rows.length >= 100"
        @click="addTicket('CATEGORY_DISCOUNT')"
      >
        Thêm loại vé ưu đãi
      </AppButton>
    </header>

    <p v-if="!canRead">Bạn không có quyền xem loại vé.</p>

    <p v-else-if="query.isPending.value || query.isFetching.value" role="status">
      Đang tải các loại vé…
    </p>

    <div v-else-if="query.isError.value" class="pricing-feedback" role="alert">
      <p class="pricing-error">{{ readableError(query.error.value) }}</p>
      <AppButton type="button" variant="secondary" @click="reloadAll"> Tải lại bản giá </AppButton>
    </div>

    <template v-else-if="initialized">
      <div v-if="!hasRegular" class="pricing-help">
        <p>Bản giá chưa có vé thông thường.</p>
        <AppButton
          type="button"
          variant="secondary"
          :disabled="!editable || rows.length >= 100"
          @click="addTicket('REGULAR')"
        >
          Thêm vé thông thường
        </AppButton>
      </div>

      <p v-if="rows.length === 0">Chưa có loại vé. Hãy thêm vé thông thường để bắt đầu.</p>

      <div v-else class="pricing-workspace__layout">
        <nav class="pricing-type-list" aria-label="Các loại vé">
          <button
            v-for="row in rows"
            :key="row.code"
            type="button"
            class="pricing-type-button"
            :class="{
              'is-selected': activeCode === row.code,
              'pricing-type-button--warning': row.pricingRole === 'UNCONFIRMED',
            }"
            :aria-pressed="activeCode === row.code"
            aria-controls="pricing-type-detail"
            :disabled="save.isPending.value"
            @click="selectTicket(row.code)"
          >
            <span class="pricing-type-button__copy">
              <strong>{{ row.name || roleLabels[row.pricingRole] }}</strong>
              <small>{{ roleDescriptions[row.pricingRole] }}</small>
            </span>
            <span v-if="row.pricingRole === 'REGULAR'" class="pricing-type-button__badge">
              Cần có
            </span>
            <span v-else-if="row.pricingRole === 'UNCONFIRMED'" class="pricing-type-button__badge">
              Xem lại
            </span>
          </button>
        </nav>

        <form
          v-if="selected"
          id="pricing-type-detail"
          class="pricing-type-detail"
          aria-labelledby="selected-type-title"
          @submit.prevent="submit"
        >
          <header class="pricing-type-detail__heading">
            <div>
              <span class="pricing-hint">Loại vé đang chọn</span>
              <h3 id="selected-type-title">
                {{ selected.name || roleLabels[selected.pricingRole] }}
              </h3>
            </div>
            <span class="pricing-badge">
              {{
                query.data.value?.policy.status === 'PUBLISHED'
                  ? 'Chỉ xem'
                  : selected.pricingRole === 'REGULAR'
                    ? 'Dành cho mọi khách'
                    : 'Bản nháp'
              }}
            </span>
          </header>

          <p class="pricing-type-detail__description">
            {{
              selected.pricingRole === 'REGULAR'
                ? 'Đây là mức giá thông thường của rạp. Mỗi bản giá cần có một loại vé như thế này.'
                : 'Loại vé này có cách áp dụng riêng. Giá được đặt theo ngày, giờ, hình thức chiếu và loại ghế.'
            }}
          </p>

          <fieldset class="pricing-type-detail__fields" :disabled="!editable">
            <legend class="admin-visually-hidden">Thông tin loại vé</legend>

            <label class="admin-reference__field">
              <span>Tên hiển thị</span>
              <input
                ref="nameInput"
                v-model="selected.name"
                class="admin-reference__input"
                maxlength="150"
                required
              />
              <small>Tên này giúp nhân viên nhận biết loại vé.</small>
            </label>

            <label class="admin-reference__field">
              <span>Ai được mua?</span>
              <select
                v-model="selected.eligibilityMode"
                class="admin-reference__input"
                :disabled="selected.pricingRole === 'REGULAR'"
                @change="eligibilityChanged"
              >
                <option value="UNRESTRICTED">Tất cả khách</option>
                <option value="RULE_REQUIRED" :disabled="!savedCondition">
                  Khách cần đáp ứng điều kiện
                </option>
                <option value="UNCONFIRMED">Chưa xác định</option>
              </select>
              <small v-if="selected.eligibilityMode === 'RULE_REQUIRED'">
                Giữ nguyên điều kiện mua vé đã được cấu hình.
              </small>
              <small v-else-if="selected.pricingRole !== 'REGULAR' && !savedCondition">
                Chưa có điều kiện mua vé để lựa chọn. Có thể lưu bản nháp với lựa chọn “Chưa xác
                định”.
              </small>
            </label>

            <label class="admin-reference__field pricing-type-detail__field-wide">
              <span>Cách tính giá</span>
              <select
                v-model="selected.pricingRole"
                class="admin-reference__input"
                @change="roleChanged"
              >
                <option
                  v-for="role in roles"
                  :key="role"
                  :value="role"
                  :disabled="
                    role === 'REGULAR' &&
                    rows.some((row) => row.code !== selected?.code && row.pricingRole === 'REGULAR')
                  "
                >
                  {{ roleLabels[role] }}
                </option>
              </select>
              <small>
                Một số loại vé ưu đãi dùng giá thông thường khi chiếu sớm hoặc chiếu tại rạp cao
                cấp.
              </small>
            </label>
          </fieldset>

          <p v-if="validationMessage" class="pricing-error" role="alert">
            {{ validationMessage }}
          </p>
          <p v-if="save.isError.value" class="pricing-error" role="alert">
            {{ readableError(save.error.value) }}
          </p>

          <div class="pricing-type-detail__actions">
            <AppButton
              type="button"
              variant="secondary"
              :disabled="!editable"
              @click="removeTicket"
            >
              Xóa loại vé
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              :disabled="!dirty || save.isPending.value"
              @click="restore()"
            >
              Hủy thay đổi
            </AppButton>
            <AppButton
              type="submit"
              :loading="save.isPending.value"
              :disabled="!editable || !dirty"
            >
              Lưu loại vé
            </AppButton>
          </div>

          <AppButton v-if="requiresReload" type="button" variant="secondary" @click="reloadAll">
            Tải lại bản giá
          </AppButton>
        </form>
      </div>
    </template>
  </section>
</template>
