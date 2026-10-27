<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import type {
  CellInput,
  CreateCinemaPricingPolicyRequest,
  OptionsCellStatesItem,
  OptionsTimeBandsItem,
  ReplaceFareMatrixRequest,
  ScopeInput,
} from '@/services/api/generated/inventory-service/model'
import {
  pricingCellKey,
  pricingErrorMessage,
  pricingErrorStatus,
  pricingLabel,
  pricingMetadataSchema,
  pricingScopeKey,
  pricingSeatLabel,
  useAdminPricingActions,
  type PricingCinema,
  type PricingContext,
  type PricingDetail,
  type PricingMatrix,
  type PricingMetadata,
  type PricingPolicy,
  type PricingValidation,
} from '../api/admin-pricing-queries'

const props = defineProps<{
  cinemas: PricingCinema[]
  anchorCinemaId: string
  canManage: boolean
  initial?: PricingDetail
  readOnly?: boolean
}>()

const emit = defineEmits<{
  close: []
  changed: []
  locked: [value: boolean]
}>()

type CellIdentity = Omit<CellInput, 'state' | 'amount'>
type DraftValue = {
  state: OptionsCellStatesItem
  amount: string
}

const actions = useAdminPricingActions(() => props.canManage)
const policy = ref<PricingPolicy | null>(props.initial?.policy ?? null)
const sourceMatrix = ref<PricingMatrix | null>(props.initial?.matrix ?? null)
const step = ref(props.initial ? 4 : 1)
const busy = ref(false)
const requiresReload = ref(false)
const error = ref('')
const notice = ref('')
const validation = ref<PricingValidation | null>(null)
const pendingCreate = ref<CreateCinemaPricingPolicyRequest | null>(null)
const formElement = ref<HTMLFormElement | null>(null)
const baseline = ref('')

const metadata = reactive<PricingMetadata>({
  name: props.initial?.policy.name ?? '',
  description: props.initial?.policy.description ?? '',
  dayGroup: props.initial?.policy.dayGroup ?? 'WEEKDAY',
  cinemaIds: [...(props.initial?.policy.cinemaIds ?? [props.anchorCinemaId])],
})

const selectedScopeKeys = ref<string[]>([])
const selectedCategories = ref<ReplaceFareMatrixRequest['ticketCategories']>([])
const selectedSeats = ref<ReplaceFareMatrixRequest['seatTypes']>([])
const values = ref<Record<string, DraftValue>>({})
const activeScopeKey = ref('')
const activeTime = ref<OptionsTimeBandsItem>('BEFORE_17')
const quoteTime = ref('17:00')
const quoteSeat = ref('')
const quoteCategory = ref('')

const steps = [
  'Thông tin & phạm vi',
  'Loại ngày & khung giờ',
  'Nhập giá vé',
  'Kiểm tra & xem trước',
]

const readOnly = computed(
  () => props.readOnly || (policy.value !== null && policy.value.status !== 'DRAFT'),
)

const waitingForCreateResult = computed(() => pendingCreate.value !== null && policy.value === null)

const editable = computed(
  () =>
    props.canManage &&
    !readOnly.value &&
    !busy.value &&
    !requiresReload.value &&
    !waitingForCreateResult.value,
)

const options = computed(() => sourceMatrix.value?.options)

const scopeOptions = computed(() =>
  (options.value?.experienceTypes ?? []).flatMap((experienceType) =>
    (options.value?.contentFormats ?? []).map((contentFormat) => ({
      experienceType,
      contentFormat,
      key: pricingScopeKey({ experienceType, contentFormat }),
      label: `${pricingLabel(experienceType)} · ${contentFormat}`,
    })),
  ),
)

const scopes = computed<ScopeInput[]>(() =>
  scopeOptions.value
    .filter((item) => selectedScopeKeys.value.includes(item.key))
    .map((item) => ({
      experienceType: item.experienceType,
      contentFormat: item.contentFormat,
    })),
)

const entries = computed(() =>
  scopes.value.flatMap((scope) =>
    (options.value?.timeBands ?? []).flatMap((timeBand) =>
      selectedCategories.value.flatMap((ticketCategory) =>
        selectedSeats.value.map((seatType) => {
          const identity: CellIdentity = {
            ...scope,
            timeBand,
            ticketCategory,
            seatType,
          }

          return { ...identity, key: pricingCellKey(identity) }
        }),
      ),
    ),
  ),
)

function blankValue(): DraftValue {
  return { state: 'UNCONFIGURED', amount: '' }
}

watch(
  entries,
  (items) => {
    for (const item of items) {
      if (!values.value[item.key]) values.value[item.key] = blankValue()
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  scopes,
  (items) => {
    if (!items.some((item) => pricingScopeKey(item) === activeScopeKey.value)) {
      activeScopeKey.value = items[0] ? pricingScopeKey(items[0]) : ''
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  selectedSeats,
  (items) => {
    if (!items.some((item) => item === quoteSeat.value)) {
      quoteSeat.value = items[0] ?? ''
    }
  },
  { immediate: true },
)

watch(
  selectedCategories,
  (items) => {
    if (!items.some((item) => item === quoteCategory.value)) {
      quoteCategory.value = items[0] ?? ''
    }
  },
  { immediate: true },
)

const activeScope = computed(() =>
  scopes.value.find((item) => pricingScopeKey(item) === activeScopeKey.value),
)

const grid = computed(() =>
  selectedSeats.value.map((seatType) => ({
    seatType,
    option: options.value?.seatTypes.find((item) => item.seatType === seatType),
    cells: selectedCategories.value.flatMap((ticketCategory) => {
      const scope = activeScope.value
      if (!scope) return []

      const key = pricingCellKey({
        ...scope,
        timeBand: activeTime.value,
        seatType,
        ticketCategory,
      })

      const value = values.value[key]
      return value ? [{ key, ticketCategory, value }] : []
    }),
  })),
)

function metadataValue(): PricingMetadata {
  return {
    name: metadata.name.trim(),
    description: metadata.description.trim(),
    dayGroup: metadata.dayGroup,
    cinemaIds: [...metadata.cinemaIds].sort(),
  }
}

function metadataFingerprint(value: PricingMetadata): string {
  return JSON.stringify({
    ...value,
    name: value.name.trim(),
    description: value.description.trim(),
    cinemaIds: [...value.cinemaIds].sort(),
  })
}

const snapshot = computed(() =>
  JSON.stringify({
    metadata: metadataValue(),
    scopes: [...selectedScopeKeys.value].sort(),
    categories: [...selectedCategories.value].sort(),
    seats: [...selectedSeats.value].sort(),
    cells: entries.value
      .map((item) => ({
        key: item.key,
        state: values.value[item.key]?.state ?? 'UNCONFIGURED',
        amount: values.value[item.key]?.amount ?? '',
      }))
      .sort((first, second) => first.key.localeCompare(second.key)),
  }),
)

const dirty = computed(() => snapshot.value !== baseline.value)

const missingCount = computed(
  () => entries.value.filter((item) => values.value[item.key]?.state === 'UNCONFIGURED').length,
)

const canPublish = computed(
  () =>
    editable.value &&
    !dirty.value &&
    validation.value?.canPublish === true &&
    validation.value.version === policy.value?.version,
)

function applyMatrix(matrix: PricingMatrix): void {
  sourceMatrix.value = matrix
  values.value = Object.fromEntries(
    matrix.cells.map((cell) => [
      pricingCellKey(cell),
      {
        state: cell.state,
        amount: cell.amount == null ? '' : String(cell.amount).replace('.', ','),
      },
    ]),
  )
  selectedScopeKeys.value = matrix.scopes.map(pricingScopeKey)
  selectedCategories.value = matrix.ticketCategories.length
    ? [...matrix.ticketCategories]
    : matrix.status === 'DRAFT'
      ? ['ADULT']
      : []
  selectedSeats.value = [...matrix.seatTypes]

  if (policy.value) {
    policy.value = {
      ...policy.value,
      version: matrix.version,
      status: matrix.status,
      dayGroup: matrix.dayGroup,
    }
  }
}

if (props.initial) applyMatrix(props.initial.matrix)
baseline.value = snapshot.value

watch(snapshot, () => {
  validation.value = null
  notice.value = ''
})

watch(
  () => busy.value || dirty.value || requiresReload.value || waitingForCreateResult.value,
  (value) => emit('locked', value),
  { immediate: true, flush: 'sync' },
)

function context(): PricingContext {
  if (!policy.value) throw new Error('Chưa có bản nháp để thực hiện thao tác.')

  return {
    cinemaId: props.anchorCinemaId,
    policyId: policy.value.policyId,
    versionId: policy.value.id,
  }
}

function parseAmount(text: string): number | null {
  const normalized = text.trim()

  if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?$/.test(normalized)) {
    return null
  }

  const amount = Number(normalized.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999.99 ? amount : null
}

function amountLabel(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(amount)}đ`
}

function cellLabel(value: DraftValue): string {
  if (value.state === 'UNCONFIGURED') return 'Chưa nhập giá'
  if (value.state === 'NOT_APPLICABLE') return 'Không áp dụng'

  const amount = parseAmount(value.amount)
  return amount === null ? 'Số tiền chưa hợp lệ' : amountLabel(amount)
}

function cellError(value: DraftValue): boolean {
  return value.state === 'PRICED' && parseAmount(value.amount) === null
}

function validateMetadata(): PricingMetadata {
  const result = pricingMetadataSchema.safeParse(metadataValue())

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Kiểm tra thông tin bảng giá.')
  }

  if (!result.data.cinemaIds.includes(props.anchorCinemaId)) {
    throw new Error('Phạm vi cần giữ cụm rạp đang mở để tiếp tục quản lý bản nháp này.')
  }

  return result.data
}

function matrixRequest(): ReplaceFareMatrixRequest {
  const current = policy.value
  if (!current) throw new Error('Chưa có bản nháp.')

  if (!scopes.value.length || !selectedSeats.value.length) {
    throw new Error('Chọn ít nhất một phạm vi chiếu và một loại ghế.')
  }

  if (!selectedCategories.value.includes('ADULT')) {
    throw new Error('Bảng giá phải có đối tượng vé người lớn.')
  }

  const uniformFares = new Map<string, number>()

  function requireSameAmount(key: string, amount: number, message: string): void {
    const previous = uniformFares.get(key)
    if (previous !== undefined && previous !== amount) throw new Error(message)
    uniformFares.set(key, amount)
  }

  const cells: CellInput[] = entries.value.map((item) => {
    const value = values.value[item.key] ?? blankValue()
    const identity: CellIdentity = {
      experienceType: item.experienceType,
      contentFormat: item.contentFormat,
      timeBand: item.timeBand,
      ticketCategory: item.ticketCategory,
      seatType: item.seatType,
    }

    if (value.state !== 'PRICED') {
      return { ...identity, state: value.state }
    }

    const amount = parseAmount(value.amount)

    if (amount === null) {
      throw new Error(
        `Kiểm tra giá ${pricingSeatLabel(item.seatType)}, ` +
          `${pricingLabel(item.ticketCategory)}, ${item.contentFormat}, ` +
          `${pricingLabel(item.timeBand)}.`,
      )
    }

    if (item.experienceType === 'PREMIUM_CINEMA') {
      requireSameAmount(
        JSON.stringify([
          'premium',
          item.experienceType,
          item.contentFormat,
          item.timeBand,
          item.seatType,
        ]),
        amount,
        'Rạp cao cấp phải có cùng giá giữa các đối tượng vé cho cùng định dạng, khung giờ và ghế.',
      )
    }

    if (item.seatType === 'COUPLE') {
      if (metadata.dayGroup !== 'HOLIDAY' && amount !== 200_000) {
        throw new Error('Giá ghế đôi ngoài Lễ, Tết phải là 200.000đ/cặp cho cả hai khung giờ.')
      }

      requireSameAmount(
        JSON.stringify([
          'couple',
          item.experienceType,
          item.contentFormat,
          metadata.dayGroup === 'HOLIDAY' ? item.timeBand : 'ALL_DAY',
        ]),
        amount,
        'Giá ghế đôi phải đồng nhất giữa các đối tượng vé trong cùng phạm vi áp dụng.',
      )
    }

    return { ...identity, state: value.state, amount }
  })

  return {
    expectedVersion: current.version,
    scopes: scopes.value.map((scope) => ({ ...scope })),
    ticketCategories: [...selectedCategories.value],
    seatTypes: [...selectedSeats.value],
    cells,
  }
}

function handleWriteError(cause: unknown): void {
  error.value = pricingErrorMessage(cause)
  const status = pricingErrorStatus(cause)

  if (status !== 400 && status !== 422) {
    requiresReload.value = true
  }
}

async function syncMetadata(): Promise<void> {
  const current = policy.value
  if (!current) throw new Error('Chưa có bản nháp.')

  const next = validateMetadata()
  const previous: PricingMetadata = {
    name: current.name,
    description: current.description,
    dayGroup: current.dayGroup,
    cinemaIds: [...current.cinemaIds],
  }

  if (metadataFingerprint(previous) === metadataFingerprint(next)) return

  try {
    policy.value = await actions.metadata.mutateAsync({
      context: context(),
      request: {
        ...next,
        expectedVersion: current.version,
      },
    })
    validation.value = null
    emit('changed')
  } catch (cause: unknown) {
    handleWriteError(cause)
    throw cause
  }
}

async function nextStep(): Promise<void> {
  if (busy.value || requiresReload.value || !props.canManage) return

  error.value = ''

  try {
    if (step.value === 1 && !readOnly.value) validateMetadata()

    if (step.value === 2 && !readOnly.value) {
      busy.value = true

      if (!policy.value) {
        if (!pendingCreate.value) {
          pendingCreate.value = {
            ...validateMetadata(),
            clientRequestId: crypto.randomUUID(),
          }
        }

        try {
          policy.value = await actions.create.mutateAsync({
            cinemaId: props.anchorCinemaId,
            request: pendingCreate.value,
          })
          emit('changed')
        } catch (cause: unknown) {
          const status = pricingErrorStatus(cause)

          if (status === 400 || status === 422) pendingCreate.value = null
          throw cause
        }
      } else {
        await syncMetadata()
      }

      if (!sourceMatrix.value) {
        const detail = await actions.loadDetail(context())
        policy.value = detail.policy
        applyMatrix(detail.matrix)
        baseline.value = snapshot.value
      }

      pendingCreate.value = null
    }

    if (step.value === 3 && !readOnly.value) {
      matrixRequest()
    }

    step.value = Math.min(4, step.value + 1)
    await focusHeading()
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function previousStep(): Promise<void> {
  if (busy.value || waitingForCreateResult.value || requiresReload.value) return
  step.value = Math.max(1, step.value - 1)
  await focusHeading()
}

async function focusHeading(): Promise<void> {
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[data-step-heading]')?.focus()
}

async function saveDraft(): Promise<void> {
  if (!editable.value || !policy.value) return

  error.value = ''
  notice.value = ''

  let prepared: ReplaceFareMatrixRequest

  try {
    validateMetadata()
    prepared = matrixRequest()
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
    return
  }

  busy.value = true

  try {
    await syncMetadata()

    const current = policy.value
    const result = await actions.matrix.mutateAsync({
      context: context(),
      request: {
        ...prepared,
        expectedVersion: current.version,
      },
    })

    applyMatrix(result)
    baseline.value = snapshot.value
    validation.value = null
    notice.value = 'Đã lưu bản nháp. Chưa công bố bảng giá.'
    emit('changed')
  } catch (cause: unknown) {
    handleWriteError(cause)
  } finally {
    busy.value = false
  }
}

async function validateDraft(): Promise<void> {
  if (!editable.value || dirty.value || !policy.value) return

  busy.value = true
  error.value = ''
  notice.value = ''

  try {
    const result = await actions.validation.mutateAsync(context())

    if (
      result.version !== policy.value.version ||
      result.revision !== policy.value.revision ||
      result.status !== policy.value.status
    ) {
      requiresReload.value = true
      throw new Error('Bản giá đã thay đổi. Hãy tải lại trước khi công bố.')
    }

    validation.value = result
    notice.value = result.canPublish
      ? 'Bản nháp đã đủ điều kiện công bố.'
      : 'Bản nháp chưa đủ điều kiện công bố. Xem các vấn đề bên dưới.'
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function publishDraft(): Promise<void> {
  if (!canPublish.value || !policy.value) return
  if (!window.confirm('Công bố bảng giá này? Phiên bản đã công bố sẽ chỉ được xem.')) return

  busy.value = true
  error.value = ''

  try {
    policy.value = await actions.publication.mutateAsync({
      context: context(),
      request: { expectedVersion: policy.value.version },
    })

    if (sourceMatrix.value) {
      sourceMatrix.value = {
        ...sourceMatrix.value,
        status: policy.value.status,
        version: policy.value.version,
      }
    }

    validation.value = null
    baseline.value = snapshot.value
    notice.value = 'Đã công bố bảng giá.'
    emit('changed')
  } catch (cause: unknown) {
    handleWriteError(cause)
  } finally {
    busy.value = false
  }
}

async function reloadDraft(): Promise<void> {
  if (busy.value || !policy.value || !props.canManage) return
  if (dirty.value && !window.confirm('Bỏ phần chưa lưu và tải lại bảng giá từ máy chủ?')) return

  busy.value = true
  error.value = ''

  try {
    const detail = await actions.loadDetail(context())
    policy.value = detail.policy

    Object.assign(metadata, {
      name: detail.policy.name,
      description: detail.policy.description,
      dayGroup: detail.policy.dayGroup,
      cinemaIds: [...detail.policy.cinemaIds],
    })

    applyMatrix(detail.matrix)
    requiresReload.value = false
    pendingCreate.value = null
    baseline.value = snapshot.value
    validation.value = null
    notice.value = 'Đã tải lại dữ liệu mới nhất.'
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

const quote = computed(() => {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(quoteTime.value)) {
    return 'Nhập giờ bắt đầu hợp lệ.'
  }

  const timeBand = quoteTime.value < '17:00' ? 'BEFORE_17' : 'FROM_17'
  const entry = entries.value.find(
    (item) =>
      pricingScopeKey(item) === activeScopeKey.value &&
      item.timeBand === timeBand &&
      item.seatType === quoteSeat.value &&
      item.ticketCategory === quoteCategory.value,
  )

  if (!entry) return 'Chưa chọn đủ phạm vi, hạng ghế và đối tượng vé.'

  const value = values.value[entry.key] ?? blankValue()
  const unit = options.value?.seatTypes.find((item) => item.seatType === entry.seatType)?.unit

  return `${pricingLabel(timeBand)} · ${cellLabel(value)}${
    value.state === 'PRICED' && unit ? ` / ${pricingLabel(unit)}` : ''
  }`
})

function confirmLeave(): boolean {
  if (busy.value) return false

  if (waitingForCreateResult.value) {
    return window.confirm(
      'Chưa xác định được kết quả tạo bản nháp. Quay lại danh sách để kiểm tra trước khi tạo thêm?',
    )
  }

  return !dirty.value || window.confirm('Bỏ các thay đổi chưa lưu của bảng giá?')
}

function close(): void {
  if (confirmLeave()) emit('close')
}

function preventUnload(event: BeforeUnloadEvent): void {
  if (!dirty.value && !busy.value && !waitingForCreateResult.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('locked', false)
})
</script>

<template>
  <form
    ref="formElement"
    class="pricing-workflow-create"
    :aria-busy="busy"
    novalidate
    @submit.prevent="step < 4 ? nextStep() : saveDraft()"
  >
    <header class="pricing-workflow__heading">
      <div>
        <h2>
          {{ readOnly ? 'Tra cứu bảng giá' : policy ? 'Chỉnh sửa bản nháp' : 'Tạo bảng giá' }}
        </h2>
        <p v-if="policy">Phiên bản {{ policy.revision }} · {{ pricingLabel(policy.status) }}</p>
      </div>
      <AppButton type="button" variant="secondary" :disabled="busy" @click="close">
        Quay lại danh sách
      </AppButton>
    </header>

    <nav class="pricing-workflow__progress" aria-label="Các bước thiết lập bảng giá">
      <ol>
        <li
          v-for="(title, index) in steps"
          :key="title"
          :class="{ 'is-current': step === index + 1 }"
          :aria-current="step === index + 1 ? 'step' : undefined"
        >
          <span class="pricing-workflow__number">{{ index + 1 }}</span>
          <strong>{{ title }}</strong>
        </li>
      </ol>
    </nav>

    <section class="pricing-workflow__card">
      <h2 data-step-heading tabindex="-1">{{ steps[step - 1] }}</h2>

      <template v-if="step === 1">
        <div class="pricing-workflow__fields">
          <label class="admin-reference__field">
            <span>Tên bảng giá *</span>
            <input
              v-model="metadata.name"
              class="admin-reference__input"
              maxlength="120"
              :disabled="!editable"
              autocomplete="off"
            />
          </label>
          <label class="admin-reference__field">
            <span>Trạng thái</span>
            <input
              class="admin-reference__input"
              :value="pricingLabel(policy?.status ?? 'DRAFT')"
              readonly
            />
          </label>
        </div>

        <label class="admin-reference__field">
          <span>Mô tả</span>
          <textarea
            v-model="metadata.description"
            class="admin-reference__input"
            maxlength="1000"
            rows="3"
            :disabled="!editable"
          />
        </label>

        <fieldset class="pricing-editor__choices" :disabled="!editable">
          <legend>Cụm rạp áp dụng *</legend>
          <label v-for="cinema in cinemas" :key="cinema.id" class="pricing-editor__check">
            <input
              v-model="metadata.cinemaIds"
              type="checkbox"
              :value="cinema.id"
              :disabled="cinema.id === anchorCinemaId"
            />
            <span> {{ cinema.name }}{{ cinema.active ? '' : ' · Ngừng hoạt động' }} </span>
          </label>
        </fieldset>

        <p class="pricing-workflow__help">
          Có thể áp dụng một bảng giá cho nhiều cụm rạp. Giữ cụm rạp đang mở trong phạm vi để tiếp
          tục quản lý bảng giá trong phiên này. Định dạng và loại hình chiếu được chọn ở bước nhập
          giá.
        </p>
      </template>

      <template v-else-if="step === 2">
        <label class="admin-reference__field">
          <span>Nhóm ngày *</span>
          <select v-model="metadata.dayGroup" class="admin-reference__input" :disabled="!editable">
            <option value="WEEKDAY">Ngày thường</option>
            <option value="WEEKEND">Cuối tuần</option>
            <option value="HOLIDAY">Lễ, Tết</option>
          </select>
        </label>

        <div class="pricing-workflow__summary">
          <div>
            <strong>Trước 17:00</strong>
            <p>00:00 ≤ giờ bắt đầu &lt; 17:00</p>
          </div>
          <div>
            <strong>Từ 17:00</strong>
            <p>17:00 ≤ giờ bắt đầu ≤ 23:59</p>
          </div>
        </div>

        <p class="pricing-workflow__help">
          Mỗi bảng giá thuộc một nhóm ngày. Chọn trực tiếp bảng Lễ, Tết cho suất chiếu thuộc dịp lễ;
          ưu tiên bảng lễ và không tự suy luận lịch lễ theo ngày tháng. Giá là giá bán trọn gói,
          không cộng phụ thu.
        </p>

        <p v-if="!policy" class="pricing-workflow__help">
          Chọn “Tiếp tục” để lưu thông tin bản nháp và tải các lựa chọn cấu hình từ hệ thống. Bản
          nháp chưa được công bố.
        </p>

        <p v-if="waitingForCreateResult" class="pricing-workflow__help" role="status">
          Thông tin tạo đang được giữ nguyên. “Tiếp tục” gửi lại cùng mã yêu cầu để kiểm tra kết
          quả, tránh tạo trùng bản nháp.
        </p>
      </template>

      <template v-else-if="step === 3">
        <template v-if="options">
          <fieldset class="pricing-editor__choices" :disabled="!editable">
            <legend>Loại hình và định dạng cần nhập giá riêng *</legend>
            <label v-for="item in scopeOptions" :key="item.key" class="pricing-editor__check">
              <input v-model="selectedScopeKeys" type="checkbox" :value="item.key" />
              <span>{{ item.label }}</span>
            </label>
          </fieldset>

          <div class="pricing-workflow__fields">
            <fieldset class="pricing-editor__choices" :disabled="!editable">
              <legend>Đối tượng vé</legend>
              <label
                v-for="category in options.ticketCategories"
                :key="category"
                class="pricing-editor__check"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="category"
                  :disabled="category === 'ADULT'"
                />
                <span>{{ pricingLabel(category) }}</span>
              </label>
            </fieldset>

            <fieldset class="pricing-editor__choices" :disabled="!editable">
              <legend>Hạng ghế *</legend>
              <label
                v-for="seat in options.seatTypes"
                :key="seat.seatType"
                class="pricing-editor__check"
              >
                <input v-model="selectedSeats" type="checkbox" :value="seat.seatType" />
                <span>
                  {{ pricingSeatLabel(seat.seatType) }} · {{ pricingLabel(seat.unit) }} ·
                  {{ seat.capacity }} chỗ
                </span>
              </label>
            </fieldset>
          </div>

          <div class="pricing-workflow__fields">
            <label class="admin-reference__field">
              <span>Phạm vi đang nhập</span>
              <select v-model="activeScopeKey" class="admin-reference__input" :disabled="busy">
                <option value="">Chọn phạm vi</option>
                <option
                  v-for="item in scopeOptions.filter((item) =>
                    selectedScopeKeys.includes(item.key),
                  )"
                  :key="item.key"
                  :value="item.key"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label class="admin-reference__field">
              <span>Khung giờ</span>
              <select v-model="activeTime" class="admin-reference__input" :disabled="busy">
                <option v-for="time in options.timeBands" :key="time" :value="time">
                  {{ pricingLabel(time) }}
                </option>
              </select>
            </label>
          </div>

          <p role="status">
            {{ entries.length }} ô trong phạm vi đã chọn · {{ missingCount }} ô chưa nhập.
          </p>

          <div
            v-if="activeScope && selectedCategories.length && selectedSeats.length"
            class="pricing-workflow-table__scroll"
            role="region"
            aria-label="Bảng nhập giá vé"
            tabindex="0"
          >
            <table class="pricing-workflow-table__table" role="table">
              <caption class="admin-visually-hidden">
                Giá bán riêng cho từng đối tượng vé và hạng ghế
              </caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">Hạng ghế / đơn vị</th>
                  <th
                    v-for="category in selectedCategories"
                    :key="category"
                    scope="col"
                    role="columnheader"
                  >
                    {{ pricingLabel(category) }}
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                <tr v-for="row in grid" :key="row.seatType" role="row">
                  <th scope="row" role="rowheader">
                    {{ pricingSeatLabel(row.seatType) }}
                    <small v-if="row.option" class="pricing-workflow-table__unit">
                      {{ pricingLabel(row.option.unit) }} · {{ row.option.capacity }} chỗ
                    </small>
                  </th>
                  <td
                    v-for="cell in row.cells"
                    :key="cell.key"
                    :data-label="pricingLabel(cell.ticketCategory)"
                    role="cell"
                  >
                    <label class="admin-reference__field">
                      <span class="admin-visually-hidden">
                        Trạng thái {{ pricingSeatLabel(row.seatType) }},
                        {{ pricingLabel(cell.ticketCategory) }}
                      </span>
                      <select
                        v-model="cell.value.state"
                        class="admin-reference__input"
                        :disabled="!editable"
                      >
                        <option v-for="state in options.cellStates" :key="state" :value="state">
                          {{ pricingLabel(state) }}
                        </option>
                      </select>
                    </label>

                    <label
                      v-if="cell.value.state === 'PRICED'"
                      class="admin-reference__field pricing-editor__amount"
                    >
                      <span class="admin-visually-hidden">
                        Giá {{ activeScope.contentFormat }}, {{ pricingLabel(activeTime) }},
                        {{ pricingSeatLabel(row.seatType) }},
                        {{ pricingLabel(cell.ticketCategory) }}
                      </span>
                      <input
                        v-model="cell.value.amount"
                        class="admin-reference__input pricing-workflow-table__input"
                        type="text"
                        inputmode="decimal"
                        maxlength="24"
                        autocomplete="off"
                        placeholder="Chưa nhập số tiền"
                        :disabled="!editable"
                        :aria-invalid="cellError(cell.value)"
                      />
                      <small v-if="cellError(cell.value)" class="pricing-error">
                        Nhập số tiền hợp lệ, ví dụ 55.000 hoặc 55000.
                      </small>
                    </label>
                    <p v-else>{{ cellLabel(cell.value) }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else>Chọn phạm vi, đối tượng vé và hạng ghế để nhập giá.</p>

          <div class="pricing-workflow-table__notes">
            <p>2D và 3D nhập giá riêng. Chuyển phạm vi hoặc khung giờ vẫn giữ phần đang nhập.</p>
            <p>Chưa nhập khác với giá 0đ. “Không áp dụng” nghĩa là không bán tổ hợp đó.</p>
            <p>
              Ghế đôi ngoài Lễ, Tết: 200.000đ/cặp cả ngày. Giá Lễ, Tết được nhập riêng. Giá ghế đôi
              đồng nhất giữa các đối tượng vé.
            </p>
            <p>
              Với rạp cao cấp, cùng định dạng, khung giờ và hạng ghế dùng chung giá giữa các đối
              tượng vé.
            </p>
          </div>
        </template>
        <p v-else>Chưa tải được lựa chọn cấu hình. Quay lại bước trước để thử tải lại.</p>
      </template>

      <template v-else>
        <dl class="pricing-workflow__summary">
          <div>
            <dt>Tên bảng giá</dt>
            <dd>{{ metadata.name }}</dd>
          </div>
          <div>
            <dt>Nhóm ngày</dt>
            <dd>{{ pricingLabel(metadata.dayGroup) }}</dd>
          </div>
          <div>
            <dt>Cụm rạp</dt>
            <dd>
              {{
                metadata.cinemaIds
                  .map((id) => cinemas.find((cinema) => cinema.id === id)?.name ?? id)
                  .join(', ')
              }}
            </dd>
          </div>
          <div>
            <dt>Phạm vi chiếu</dt>
            <dd>
              {{
                scopeOptions
                  .filter((item) => selectedScopeKeys.includes(item.key))
                  .map((item) => item.label)
                  .join(', ') || 'Chưa chọn'
              }}
            </dd>
          </div>
          <div>
            <dt>Mức độ hoàn chỉnh</dt>
            <dd>{{ entries.length }} ô · {{ missingCount }} ô chưa nhập</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{{ pricingLabel(policy?.status ?? 'DRAFT') }}</dd>
          </div>
        </dl>

        <p class="pricing-workflow__help">
          Có thể lưu bản nháp khi còn ô chưa nhập. Công bố cần kiểm tra dữ liệu đã lưu và được
          backend xác nhận đủ điều kiện.
        </p>

        <h3>Thử tra giá một tổ hợp</h3>
        <div class="pricing-workflow__fields">
          <label class="admin-reference__field">
            <span>Loại hình và định dạng</span>
            <select v-model="activeScopeKey" class="admin-reference__input" :disabled="busy">
              <option value="">Chọn phạm vi</option>
              <option
                v-for="item in scopeOptions.filter((item) => selectedScopeKeys.includes(item.key))"
                :key="item.key"
                :value="item.key"
              >
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="admin-reference__field">
            <span>Giờ bắt đầu suất chiếu</span>
            <input
              v-model="quoteTime"
              class="admin-reference__input"
              type="time"
              :disabled="busy"
            />
          </label>
          <label class="admin-reference__field">
            <span>Hạng ghế</span>
            <select v-model="quoteSeat" class="admin-reference__input" :disabled="busy">
              <option value="">Chọn hạng ghế</option>
              <option v-for="seat in selectedSeats" :key="seat" :value="seat">
                {{ pricingSeatLabel(seat) }}
              </option>
            </select>
          </label>
          <label class="admin-reference__field">
            <span>Đối tượng vé</span>
            <select v-model="quoteCategory" class="admin-reference__input" :disabled="busy">
              <option value="">Chọn đối tượng vé</option>
              <option v-for="category in selectedCategories" :key="category" :value="category">
                {{ pricingLabel(category) }}
              </option>
            </select>
          </label>
        </div>

        <p class="pricing-workflow__notice" role="status">{{ quote }}</p>
        <p class="pricing-workflow__help">
          Tra giá theo nội dung bảng đang xem{{ dirty ? ', có thay đổi chưa lưu' : '' }}. Giá bán
          trọn gói, không cộng phụ thu. Phần tra cứu này không kiểm tra phòng chiếu thực tế và không
          phải báo giá đặt vé.
        </p>

        <div v-if="validation" aria-live="polite">
          <p>
            {{ validation.canPublish ? 'Đủ điều kiện công bố' : 'Kết quả kiểm tra' }}
            · {{ validation.missingCellCount }} ô còn thiếu.
          </p>
          <ul v-if="validation.issues.length" class="pricing-editor__issues">
            <li v-for="(issue, index) in validation.issues" :key="`${issue.code}:${index}`">
              <strong>{{ issue.message }}</strong>
              <span v-if="issue.cell">
                — {{ pricingLabel(issue.cell.experienceType) }}, {{ issue.cell.contentFormat }},
                {{ pricingLabel(issue.cell.timeBand) }},
                {{ pricingSeatLabel(issue.cell.seatType) }},
                {{ pricingLabel(issue.cell.ticketCategory) }}
              </span>
              <small>{{ issue.code }}</small>
            </li>
          </ul>
        </div>
      </template>

      <p v-if="error" class="pricing-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="pricing-workflow__notice" role="status">{{ notice }}</p>
      <p v-if="busy" role="status">Đang xử lý…</p>
      <p v-if="dirty && !readOnly" role="status">Có thay đổi chưa lưu.</p>

      <footer class="pricing-workflow__actions">
        <AppButton
          v-if="step > 1"
          type="button"
          variant="secondary"
          :disabled="busy || requiresReload || waitingForCreateResult"
          @click="previousStep"
        >
          Quay lại
        </AppButton>

        <AppButton
          v-if="requiresReload && policy"
          type="button"
          variant="secondary"
          :loading="busy"
          @click="reloadDraft"
        >
          Tải lại bảng giá
        </AppButton>

        <AppButton
          v-if="step < 4"
          type="submit"
          :loading="busy"
          :disabled="!canManage || requiresReload"
        >
          Tiếp tục
        </AppButton>

        <template v-else-if="!readOnly">
          <AppButton type="submit" :loading="busy" :disabled="!editable || !dirty">
            Lưu bản nháp
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="!editable || dirty"
            @click="validateDraft"
          >
            Kiểm tra dữ liệu đã lưu
          </AppButton>
          <AppButton type="button" :disabled="!canPublish" @click="publishDraft">
            Công bố bảng giá
          </AppButton>
        </template>
      </footer>
    </section>
  </form>
</template>

<style scoped>
.pricing-editor__choices {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  margin: 0;
  padding: var(--space-4);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
}

.pricing-editor__choices legend {
  padding-inline: var(--space-2);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}

.pricing-editor__check {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--color-text-primary);
  line-height: var(--line-height-base);
}

.pricing-editor__check input {
  flex: 0 0 auto;
  margin-top: var(--space-1);
  accent-color: var(--color-primary);
}

.pricing-editor__amount {
  margin-top: var(--space-3);
}

.pricing-editor__issues {
  display: grid;
  gap: var(--space-3);
  padding-left: var(--space-5);
  overflow-wrap: anywhere;
}

.pricing-editor__issues small {
  display: block;
  margin-top: var(--space-1);
}

textarea.admin-reference__input {
  min-height: var(--control-height-lg);
  resize: vertical;
}
</style>
