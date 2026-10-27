<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type {
  CellInput,
  CreateCinemaPricingPolicyRequest,
  OptionsCellStatesItem,
  OptionsContentFormatsItem,
  OptionsExperienceTypesItem,
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
} from '../api/admin-pricing-queries'
import { useAdminPricingVersions } from '../api/admin-pricing-list'

const props = defineProps<{
  cinemas: PricingCinema[]
  anchorCinemaId: string
  initialCinemaIds: string[]
  canManage: boolean
  configurationOptions?: PricingMatrix['options']
  initial?: PricingDetail
  readOnly?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

type Identity = Omit<CellInput, 'state' | 'amount'>
type Value = {
  state: OptionsCellStatesItem
  amount: string
}

const actions = useAdminPricingActions(() => props.canManage)
const policy = ref<PricingPolicy | null>(props.initial?.policy ?? null)
const anchorId = ref(props.initial ? props.anchorCinemaId : '')
const options = ref<PricingMatrix['options'] | undefined>(
  props.initial?.matrix.options ?? props.configurationOptions,
)
const confirmedOptions = ref(Boolean(props.initial))
const persistedDayGroup = ref<PricingMetadata['dayGroup'] | null>(
  props.initial?.matrix.dayGroup ?? null,
)
const persistedScopeCount = ref(props.initial?.matrix.scopes.length ?? 0)
const busy = ref(false)
const requiresReload = ref(false)
const error = ref('')
const notice = ref('')
const step = ref(1)
const targetStatus = ref<'DRAFT' | 'PUBLISHED'>('DRAFT')
const pendingCreate = ref<CreateCinemaPricingPolicyRequest | null>(null)
const baseline = ref('')
const formElement = ref<HTMLFormElement | null>(null)

const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const metadata = reactive<PricingMetadata>({
  name: props.initial?.policy.name ?? '',
  description: props.initial?.policy.description ?? '',
  dayGroup: props.initial?.policy.dayGroup ?? 'WEEKDAY',
  cinemaIds: [...(props.initial?.policy.cinemaIds ?? props.initialCinemaIds)],
})

const formats = ref<OptionsContentFormatsItem[]>([])
const experiences = ref<OptionsExperienceTypesItem[]>([])
const scopes = ref<ScopeInput[]>([])
const categories = ref<ReplaceFareMatrixRequest['ticketCategories']>([])
const seats = ref<ReplaceFareMatrixRequest['seatTypes']>([])
const values = ref<Record<string, Value>>({})
const activeScopeKey = ref('')
const activeTime = ref<OptionsTimeBandsItem>('BEFORE_17')

const quoteCinema = ref(metadata.cinemaIds[0] ?? '')
const quoteExperience = ref('')
const quoteFormat = ref('')
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
  () => Boolean(props.readOnly) || (policy.value !== null && policy.value.status !== 'DRAFT'),
)

const waitingForCreation = computed(() => pendingCreate.value !== null && policy.value === null)

const editable = computed(
  () =>
    props.canManage &&
    !readOnly.value &&
    !busy.value &&
    !requiresReload.value &&
    !waitingForCreation.value,
)

const dayGroupLocked = computed(() => persistedScopeCount.value > 0)

const entries = computed(() =>
  scopes.value.flatMap((scope) =>
    (options.value?.timeBands ?? []).flatMap((timeBand) =>
      seats.value.flatMap((seatType) =>
        categories.value.map((ticketCategory) => {
          const identity: Identity = {
            ...scope,
            timeBand,
            seatType,
            ticketCategory,
          }

          return { ...identity, key: pricingCellKey(identity) }
        }),
      ),
    ),
  ),
)

watch(
  entries,
  (items) => {
    for (const item of items) {
      if (!values.value[item.key]) {
        values.value[item.key] = { state: 'UNCONFIGURED', amount: '' }
      }
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

const contextValue = computed<PricingContext | null>(() =>
  policy.value
    ? {
        cinemaId: anchorId.value,
        policyId: policy.value.policyId,
        versionId: policy.value.id,
      }
    : null,
)

const versions = useAdminPricingVersions(
  contextValue,
  () => props.canManage && readOnly.value && contextValue.value !== null,
)

function context(): PricingContext {
  if (!contextValue.value) throw new Error('Chưa có bản nháp.')
  return { ...contextValue.value }
}

function metadataValue(): PricingMetadata {
  return {
    name: metadata.name.trim(),
    description: metadata.description.trim(),
    dayGroup: metadata.dayGroup,
    cinemaIds: [...metadata.cinemaIds].sort(),
  }
}

function metadataKey(value: PricingMetadata): string {
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
    targetStatus: targetStatus.value,
    scopes: scopes.value.map(pricingScopeKey).sort(),
    categories: [...categories.value].sort(),
    seats: [...seats.value].sort(),
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

const activeScope = computed(() =>
  scopes.value.find((item) => pricingScopeKey(item) === activeScopeKey.value),
)

const grid = computed(() =>
  seats.value.map((seatType) => ({
    seatType,
    option: options.value?.seatTypes.find((item) => item.seatType === seatType),
    cells: categories.value.flatMap((ticketCategory) => {
      if (!activeScope.value) return []

      const key = pricingCellKey({
        ...activeScope.value,
        timeBand: activeTime.value,
        seatType,
        ticketCategory,
      })
      const value = values.value[key]

      return value ? [{ key, ticketCategory, value }] : []
    }),
  })),
)

function rebuildScopes(): void {
  scopes.value = experiences.value.flatMap((experienceType) =>
    formats.value.map((contentFormat) => ({ experienceType, contentFormat })),
  )
}

function configureNew(value: PricingMatrix['options']): void {
  categories.value = [...value.ticketCategories]
  seats.value = value.seatTypes.map((item) => item.seatType)
  formats.value = value.contentFormats.filter((item) => item === '2D')

  if (!formats.value.length && value.contentFormats[0]) {
    formats.value = [value.contentFormats[0]]
  }

  experiences.value = [...value.experienceTypes]
  rebuildScopes()
}

function rememberPersistedMatrix(matrix: PricingMatrix): void {
  persistedDayGroup.value = matrix.dayGroup
  persistedScopeCount.value = matrix.scopes.length
}

function workflowErrorMessage(cause: unknown): string {
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === 'INVENTORY_PRICING_MATRIX_DAY_GROUP_LOCKED'
  ) {
    return 'Loại ngày đã được khóa vì bảng giá có cấu hình được lưu. Hãy tải lại trước khi tiếp tục.'
  }

  return pricingErrorMessage(cause)
}

function hydrate(detail: PricingDetail): void {
  rememberPersistedMatrix(detail.matrix)
  policy.value = detail.policy
  options.value = detail.matrix.options
  confirmedOptions.value = true

  Object.assign(metadata, {
    name: detail.policy.name,
    description: detail.policy.description,
    dayGroup: detail.policy.dayGroup,
    cinemaIds: [...detail.policy.cinemaIds],
  })

  values.value = Object.fromEntries(
    detail.matrix.cells.map((cell) => [
      pricingCellKey(cell),
      {
        state: cell.state,
        amount: cell.amount == null ? '' : String(cell.amount).replace('.', ','),
      },
    ]),
  )
  formats.value = [...new Set(detail.matrix.scopes.map((item) => item.contentFormat))]
  experiences.value = [...new Set(detail.matrix.scopes.map((item) => item.experienceType))]
  categories.value = [...detail.matrix.ticketCategories]
  seats.value = [...detail.matrix.seatTypes]
  scopes.value = detail.matrix.scopes.map((item) => ({ ...item }))
  targetStatus.value = detail.policy.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  baseline.value = snapshot.value

  if (detail.policy.status === 'DRAFT' && detail.matrix.scopes.length === 0) {
    configureNew(detail.matrix.options)
  }
}

if (props.initial) {
  hydrate(props.initial)
} else {
  if (options.value) configureNew(options.value)
  baseline.value = snapshot.value
}

function parseAmount(text: string): number | null {
  const value = text.trim()

  if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?$/.test(value)) {
    return null
  }

  const amount = Number(value.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(amount) && amount <= 9_999_999_999.99 ? amount : null
}

function money(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(value)}đ`
}

function changeMode(value: Value, event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return

  value.state =
    event.target.value === 'NOT_APPLICABLE'
      ? 'NOT_APPLICABLE'
      : value.amount.trim()
        ? 'PRICED'
        : 'UNCONFIGURED'
}

function changeAmount(value: Value, event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return

  value.amount = event.target.value
  value.state = value.amount.trim() ? 'PRICED' : 'UNCONFIGURED'
}

function validateMetadata(): PricingMetadata {
  const result = pricingMetadataSchema.safeParse(metadataValue())

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Kiểm tra thông tin bảng giá.')
  }

  if (policy.value && !result.data.cinemaIds.includes(anchorId.value)) {
    throw new Error('Cần giữ cụm rạp đang mở trong phạm vi của phiên bản này.')
  }

  if (dayGroupLocked.value && result.data.dayGroup !== persistedDayGroup.value) {
    throw new Error('Bảng giá đã có cấu hình được lưu nên không thể đổi loại ngày.')
  }

  return result.data
}

function validateDefinition(): void {
  if (!options.value || !scopes.value.length || !seats.value.length) {
    throw new Error('Chọn ít nhất một định dạng, loại phòng và hạng ghế.')
  }

  if (!categories.value.includes('ADULT')) {
    throw new Error('Bảng giá phải có đối tượng vé người lớn.')
  }

  if (
    scopes.value.some(
      (scope) =>
        !options.value?.experienceTypes.some((item) => item === scope.experienceType) ||
        !options.value?.contentFormats.some((item) => item === scope.contentFormat),
    ) ||
    seats.value.some((seat) => !options.value?.seatTypes.some((item) => item.seatType === seat)) ||
    categories.value.some(
      (category) => !options.value?.ticketCategories.some((item) => item === category),
    )
  ) {
    throw new Error('Lựa chọn cấu hình đã thay đổi. Hãy tải lại bảng giá.')
  }
}

function matrixRequest(expectedVersion: number): ReplaceFareMatrixRequest {
  validateDefinition()
  const uniform = new Map<string, number>()

  function sameFare(key: string, amount: number, message: string): void {
    const previous = uniform.get(key)
    if (previous !== undefined && previous !== amount) throw new Error(message)
    uniform.set(key, amount)
  }

  const cells: CellInput[] = entries.value.map((item) => {
    const value = values.value[item.key]
    const identity: Identity = {
      experienceType: item.experienceType,
      contentFormat: item.contentFormat,
      timeBand: item.timeBand,
      seatType: item.seatType,
      ticketCategory: item.ticketCategory,
    }

    if (!value || value.state !== 'PRICED') {
      return {
        ...identity,
        state: value?.state ?? 'UNCONFIGURED',
      }
    }

    const amount = parseAmount(value.amount)

    if (amount === null) {
      throw new Error(
        `Giá chưa hợp lệ: ${pricingSeatLabel(item.seatType)}, ` +
          `${pricingLabel(item.ticketCategory)}, ${item.contentFormat}, ` +
          `${pricingLabel(item.timeBand)}.`,
      )
    }

    if (item.experienceType === 'PREMIUM_CINEMA') {
      sameFare(
        JSON.stringify(['premium', item.contentFormat, item.timeBand, item.seatType]),
        amount,
        'Rạp cao cấp cần cùng giá giữa các đối tượng vé cho cùng định dạng, giờ và ghế.',
      )
    }

    if (item.seatType === 'COUPLE') {
      if (metadata.dayGroup !== 'HOLIDAY' && amount !== 200_000) {
        throw new Error('Ghế đôi ngoài Lễ, Tết phải là 200.000đ/cặp cả ngày.')
      }

      sameFare(
        JSON.stringify([
          'couple',
          item.experienceType,
          item.contentFormat,
          metadata.dayGroup === 'HOLIDAY' ? item.timeBand : 'ALL_DAY',
        ]),
        amount,
        'Giá ghế đôi phải đồng nhất giữa các đối tượng vé trong cùng phạm vi.',
      )
    }

    return { ...identity, state: 'PRICED', amount }
  })

  return {
    expectedVersion,
    scopes: scopes.value.map((item) => ({ ...item })),
    ticketCategories: [...categories.value],
    seatTypes: [...seats.value],
    cells,
  }
}

async function ensureDraft(): Promise<void> {
  if (!policy.value) {
    if (!pendingCreate.value) {
      pendingCreate.value = {
        ...validateMetadata(),
        clientRequestId: crypto.randomUUID(),
      }
      anchorId.value = pendingCreate.value.cinemaIds[0] ?? ''
    }

    try {
      const created = await actions.create.mutateAsync({
        cinemaId: anchorId.value,
        request: pendingCreate.value,
      })
      policy.value = created
      persistedDayGroup.value = created.dayGroup
    } catch (cause: unknown) {
      const status = pricingErrorStatus(cause)
      if (status === 400 || status === 422) pendingCreate.value = null
      throw cause
    }
  }

  if (!confirmedOptions.value) {
    const detail = await actions.loadDetail(context())
    rememberPersistedMatrix(detail.matrix)

    if (detail.matrix.requiredCellCount > 0) {
      requiresReload.value = true
      throw new Error('Bản nháp đã có cấu hình trên máy chủ. Hãy tải lại trước khi tiếp tục.')
    }

    policy.value = detail.policy
    options.value = detail.matrix.options
    confirmedOptions.value = true

    if (!scopes.value.length) configureNew(detail.matrix.options)
  }

  pendingCreate.value = null
}

async function focusStep(): Promise<void> {
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[data-step-focus]')?.focus()
}

async function nextStep(): Promise<void> {
  if (busy.value || requiresReload.value || !props.canManage || readOnly.value) return
  error.value = ''

  try {
    if (step.value === 1) {
      validateMetadata()

      if (!options.value) {
        busy.value = true
        await ensureDraft()
        notice.value = 'Đã lưu thông tin nháp. Chọn định dạng và loại phòng để tiếp tục.'
        return
      }

      validateDefinition()
    }

    if (step.value === 2) validateMetadata()
    if (step.value === 3) matrixRequest(policy.value?.version ?? 0)

    step.value = Math.min(4, step.value + 1)
    await focusStep()
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function previousStep(): Promise<void> {
  if (busy.value || requiresReload.value || waitingForCreation.value) return
  step.value = Math.max(1, step.value - 1)
  await focusStep()
}

async function save(): Promise<void> {
  if (!editable.value) return

  error.value = ''
  notice.value = ''

  try {
    validateMetadata()
    matrixRequest(policy.value?.version ?? 0)
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
    return
  }

  busy.value = true

  let stage: 'create' | 'metadata' | 'matrix' | 'validation' | 'publish' = 'create'

  try {
    await ensureDraft()

    let currentPolicy = policy.value

    if (!currentPolicy) {
      throw new Error('Chưa xác nhận được bản nháp.')
    }

    const currentContext: PricingContext = {
      cinemaId: anchorId.value,
      policyId: currentPolicy.policyId,
      versionId: currentPolicy.id,
    }

    const nextMetadata = validateMetadata()
    const previousMetadata: PricingMetadata = {
      name: currentPolicy.name,
      description: currentPolicy.description,
      dayGroup: currentPolicy.dayGroup,
      cinemaIds: [...currentPolicy.cinemaIds],
    }

    if (metadataKey(previousMetadata) !== metadataKey(nextMetadata)) {
      stage = 'metadata'

      currentPolicy = await actions.metadata.mutateAsync({
        context: currentContext,
        request: {
          ...nextMetadata,
          expectedVersion: currentPolicy.version,
        },
      })

      policy.value = currentPolicy
      persistedDayGroup.value = currentPolicy.dayGroup
    }

    stage = 'matrix'

    const matrix = await actions.matrix.mutateAsync({
      context: currentContext,
      request: matrixRequest(currentPolicy.version),
    })

    currentPolicy = {
      ...currentPolicy,
      version: matrix.version,
      status: matrix.status,
      dayGroup: matrix.dayGroup,
    }

    policy.value = currentPolicy
    rememberPersistedMatrix(matrix)
    baseline.value = snapshot.value

    if (targetStatus.value === 'PUBLISHED') {
      stage = 'validation'

      const result = await actions.validation.mutateAsync(currentContext)

      if (result.version !== currentPolicy.version) {
        requiresReload.value = true
        throw new Error('Bảng giá đã thay đổi. Hãy tải lại trước khi công bố.')
      }

      if (!result.canPublish) {
        error.value = [
          `Chưa thể công bố: còn ${result.missingCellCount} ô chưa nhập.`,
          ...result.issues.map((issue) => issue.message),
        ].join(' ')

        return
      }

      stage = 'publish'

      currentPolicy = await actions.publication.mutateAsync({
        context: currentContext,
        request: {
          expectedVersion: currentPolicy.version,
        },
      })

      policy.value = currentPolicy
    }

    emit('close')
  } catch (cause: unknown) {
    error.value = workflowErrorMessage(cause)

    const status = pricingErrorStatus(cause)

    if (
      (stage === 'metadata' || stage === 'matrix' || stage === 'publish') &&
      status !== 400 &&
      status !== 422
    ) {
      requiresReload.value = true
    }
  } finally {
    busy.value = false
  }
}

async function reload(): Promise<void> {
  if (busy.value || !policy.value || !props.canManage) return
  if (dirty.value && !window.confirm('Bỏ phần chưa lưu và tải lại bảng giá?')) return

  busy.value = true
  error.value = ''

  try {
    hydrate(await actions.loadDetail(context()))
    pendingCreate.value = null
    requiresReload.value = false
    notice.value = 'Đã tải dữ liệu mới nhất.'
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function changeVersion(event: Event): Promise<void> {
  const target = event.target

  if (!(target instanceof HTMLSelectElement) || busy.value || !readOnly.value) {
    return
  }

  const versionId = target.value
  const selected = versions.data.value?.find((item) => item.id === versionId)

  if (!selected) return

  busy.value = true
  error.value = ''

  try {
    const detail = await actions.loadDetail({
      cinemaId: anchorId.value,
      policyId: selected.policyId,
      versionId: selected.id,
    })

    hydrate(detail)
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

const quoteExperiences = computed(() => [
  ...new Set(scopes.value.map((item) => item.experienceType)),
])

const quoteFormats = computed(() =>
  scopes.value
    .filter((item) => item.experienceType === quoteExperience.value)
    .map((item) => item.contentFormat),
)

watch(
  () => [...metadata.cinemaIds],
  (items) => {
    if (!items.some((item) => item === quoteCinema.value)) quoteCinema.value = items[0] ?? ''
  },
  { immediate: true },
)

watch(
  quoteExperiences,
  (items) => {
    if (!items.some((item) => item === quoteExperience.value)) {
      quoteExperience.value = items[0] ?? ''
    }
  },
  { immediate: true },
)

watch(
  quoteFormats,
  (items) => {
    if (!items.some((item) => item === quoteFormat.value)) quoteFormat.value = items[0] ?? ''
  },
  { immediate: true },
)

watch(
  seats,
  (items) => {
    if (!items.some((item) => item === quoteSeat.value)) quoteSeat.value = items[0] ?? ''
  },
  { immediate: true },
)

watch(
  categories,
  (items) => {
    if (!items.some((item) => item === quoteCategory.value)) {
      quoteCategory.value = items[0] ?? ''
    }
  },
  { immediate: true },
)

const quote = computed(() => {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(quoteTime.value)) {
    return { label: 'Nhập giờ hợp lệ', unit: '', time: '' }
  }

  const timeBand = quoteTime.value < '17:00' ? 'BEFORE_17' : 'FROM_17'
  const item = entries.value.find(
    (entry) =>
      entry.experienceType === quoteExperience.value &&
      entry.contentFormat === quoteFormat.value &&
      entry.timeBand === timeBand &&
      entry.seatType === quoteSeat.value &&
      entry.ticketCategory === quoteCategory.value,
  )

  if (!item || !metadata.cinemaIds.includes(quoteCinema.value)) {
    return { label: 'Chưa có tổ hợp phù hợp', unit: '', time: pricingLabel(timeBand) }
  }

  const value = values.value[item.key]
  const unit = options.value?.seatTypes.find((seat) => seat.seatType === item.seatType)?.unit

  if (!value || value.state === 'UNCONFIGURED') {
    return { label: 'Chưa nhập giá', unit: '', time: pricingLabel(timeBand) }
  }

  if (value.state === 'NOT_APPLICABLE') {
    return { label: 'Không áp dụng', unit: '', time: pricingLabel(timeBand) }
  }

  const amount = parseAmount(value.amount)

  return {
    label: amount === null ? 'Giá chưa hợp lệ' : money(amount),
    unit: unit ? pricingLabel(unit) : '',
    time: pricingLabel(timeBand),
  }
})

function confirmLeave(): boolean {
  if (busy.value) return false

  if (waitingForCreation.value) {
    return window.confirm(
      'Chưa xác định được kết quả tạo. Đóng và kiểm tra danh sách trước khi tạo thêm?',
    )
  }

  return readOnly.value || !dirty.value || window.confirm('Bỏ thay đổi chưa lưu của bảng giá?')
}

function close(): void {
  if (confirmLeave()) emit('close')
}

function handleOpenChange(open: boolean): void {
  if (!open) close()
}

function restoreFocus(event: Event): void {
  event.preventDefault()
  if (returnFocus?.isConnected) returnFocus.focus()
}

function preventUnload(event: BeforeUnloadEvent): void {
  if (readOnly.value || (!dirty.value && !busy.value && !waitingForCreation.value)) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))
</script>

<template>
  <DialogRoot :open="true" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="price-dialog-overlay" />
      <DialogContent
        class="price-dialog"
        :class="{ 'price-dialog--preview': readOnly }"
        @escape-key-down.prevent="close"
        @pointer-down-outside.prevent
        @close-auto-focus="restoreFocus"
      >
        <header class="price-dialog-head">
          <DialogTitle>
            {{ readOnly ? 'Tra cứu giá vé' : initial ? 'Chỉnh sửa bảng giá' : 'Tạo bảng giá vé' }}
          </DialogTitle>
          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            aria-label="Đóng"
            :disabled="busy"
            @click="close"
          >
            <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12 M6 18L18 6" />
            </svg>
          </button>
        </header>

        <DialogDescription class="price-visually-hidden">
          {{
            readOnly
              ? 'Tra cứu giá theo cụm rạp, loại phòng, định dạng, giờ và đối tượng vé.'
              : 'Thiết lập thông tin, loại ngày, giá vé và kiểm tra trước khi lưu.'
          }}
        </DialogDescription>

        <form
          ref="formElement"
          class="price-dialog-form"
          :aria-busy="busy"
          novalidate
          @submit.prevent="readOnly ? undefined : step < 4 ? nextStep() : save()"
        >
          <div class="price-dialog-body">
            <nav v-if="!readOnly" class="price-stepper" aria-label="Các bước thiết lập bảng giá">
              <ol>
                <li
                  v-for="(title, index) in steps"
                  :key="title"
                  class="price-step"
                  :class="{ 'is-active': step === index + 1, 'is-done': step > index + 1 }"
                  :aria-current="step === index + 1 ? 'step' : undefined"
                >
                  <i aria-hidden="true">{{ step > index + 1 ? '✓' : index + 1 }}</i>
                  <span>{{ title }}</span>
                  <span class="price-visually-hidden">{{ index + 1 }}. {{ title }}</span>
                </li>
              </ol>
            </nav>

            <p v-if="error" class="price-notice price-notice--error" role="alert">{{ error }}</p>
            <p v-if="notice" class="price-notice price-notice--info" role="status">{{ notice }}</p>

            <template v-if="readOnly">
              <div class="price-notice price-notice--info">
                {{ metadata.description || 'Bảng giá được chọn trực tiếp theo suất chiếu.' }}
              </div>
              <label v-if="versions.data.value?.length" class="price-history">
                <span>Phiên bản</span>
                <select
                  class="price-control"
                  :value="policy?.id"
                  :disabled="busy"
                  @change="changeVersion"
                >
                  <option
                    v-for="version in versions.data.value"
                    :key="version.id"
                    :value="version.id"
                  >
                    {{ version.revision }} · {{ pricingLabel(version.status) }}
                  </option>
                </select>
              </label>
              <p v-if="versions.isError.value" class="price-note" role="status">
                Chưa tải được lịch sử phiên bản.
              </p>
            </template>

            <template v-else-if="step === 1">
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">
                Thông tin và phạm vi
              </h3>
              <div class="price-form-grid">
                <label class="price-field price-full">
                  <span>Tên bảng giá *</span>
                  <input
                    v-model="metadata.name"
                    class="price-control"
                    maxlength="120"
                    autocomplete="off"
                    :disabled="!editable"
                  />
                </label>

                <label class="price-field price-full">
                  <span>Mô tả ngắn</span>
                  <textarea
                    v-model="metadata.description"
                    class="price-control"
                    maxlength="1000"
                    :disabled="!editable"
                  />
                </label>

                <label class="price-field">
                  <span>Trạng thái khi lưu</span>
                  <select v-model="targetStatus" class="price-control" :disabled="!editable">
                    <option value="DRAFT">Bản nháp</option>
                    <option value="PUBLISHED">Công bố khi lưu</option>
                  </select>
                </label>

                <fieldset class="price-checks" :disabled="!editable || !options">
                  <legend>Định dạng cần nhập giá riêng *</legend>
                  <label v-for="format in options?.contentFormats ?? []" :key="format">
                    <input
                      v-model="formats"
                      type="checkbox"
                      :value="format"
                      @change="rebuildScopes"
                    />
                    {{ format }}
                  </label>
                </fieldset>

                <fieldset class="price-checks price-full" :disabled="!editable">
                  <legend>Phạm vi cụm rạp *</legend>
                  <label v-for="cinema in cinemas" :key="cinema.id">
                    <input
                      v-model="metadata.cinemaIds"
                      type="checkbox"
                      :value="cinema.id"
                      :disabled="policy !== null && cinema.id === anchorId"
                    />
                    {{ cinema.name }}
                  </label>
                </fieldset>

                <fieldset class="price-checks price-full" :disabled="!editable || !options">
                  <legend>Loại phòng áp dụng *</legend>
                  <label v-for="experience in options?.experienceTypes ?? []" :key="experience">
                    <input
                      v-model="experiences"
                      type="checkbox"
                      :value="experience"
                      @change="rebuildScopes"
                    />
                    {{ pricingLabel(experience) }}
                  </label>
                </fieldset>

                <div class="price-notice price-notice--info price-full">
                  {{
                    options
                      ? 'Mọi tổ hợp của định dạng được chọn cần có giá hoặc được đánh dấu “Không áp dụng” trước khi công bố.'
                      : 'Chưa có dữ liệu cấu hình. Nhập thông tin và chọn “Tiếp tục” để lưu bản nháp, tải lựa chọn từ hệ thống rồi hoàn tất phạm vi.'
                  }}
                </div>
              </div>
            </template>

            <template v-else-if="step === 2">
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">
                Loại ngày và khung giờ
              </h3>
              <div class="price-form-grid">
                <label class="price-field price-full">
                  <span>Mẫu loại ngày</span>
                  <select
                    v-model="metadata.dayGroup"
                    class="price-control"
                    :disabled="!editable || dayGroupLocked"
                    :aria-describedby="dayGroupLocked ? 'pricing-day-group-lock' : undefined"
                  >
                    <option value="WEEKDAY">Ngày thường</option>
                    <option value="WEEKEND">Cuối tuần</option>
                    <option value="HOLIDAY">Lễ/Tết</option>
                  </select>
                </label>

                <p
                  v-if="dayGroupLocked"
                  id="pricing-day-group-lock"
                  class="price-notice price-notice--info price-full"
                >
                  Bảng giá đã có cấu hình được lưu nên loại ngày được giữ nguyên. Bạn vẫn có thể
                  chỉnh sửa tên, mô tả, phạm vi cụm rạp và giá vé. Nếu cần bảng giá cho loại ngày
                  khác, hãy tạo bảng giá mới.
                </p>

                <div class="price-notice price-notice--info price-full">
                  Chọn trực tiếp bảng giá này cho suất chiếu. Mẫu lễ/Tết không tự suy luận ngày lễ
                  theo lịch. Các mẫu chỉ xác định loại ngày; giá cần được nhập riêng.
                </div>

                <div class="price-time-card">
                  <h3>Trước 17:00</h3>
                  <p>00:00 ≤ giờ bắt đầu &lt; 17:00</p>
                </div>
                <div class="price-time-card">
                  <h3>Từ 17:00</h3>
                  <p>17:00 ≤ giờ bắt đầu ≤ 23:59</p>
                </div>

                <p class="price-note price-full">
                  Ví dụ: 16:59 thuộc nhóm đầu, 17:00 thuộc nhóm sau. Bảng giá là giá bán trọn gói,
                  không cộng phụ thu.
                </p>
              </div>
            </template>

            <template v-else-if="step === 3">
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">Nhập giá vé</h3>

              <div class="price-context">
                <select
                  v-model="activeScopeKey"
                  class="price-control"
                  aria-label="Loại phòng và định dạng nhập giá"
                  :disabled="busy"
                >
                  <option
                    v-for="scope in scopes"
                    :key="pricingScopeKey(scope)"
                    :value="pricingScopeKey(scope)"
                  >
                    {{ pricingLabel(scope.experienceType) }} · {{ scope.contentFormat }}
                  </option>
                </select>
                <select
                  v-model="activeTime"
                  class="price-control"
                  aria-label="Khung giờ nhập giá"
                  :disabled="busy"
                >
                  <option v-for="time in options?.timeBands ?? []" :key="time" :value="time">
                    {{ pricingLabel(time) }}
                  </option>
                </select>
                <span class="price-chip">VNĐ · {{ pricingLabel(metadata.dayGroup) }}</span>
                <span class="price-chip">{{ missingCount }} ô chưa nhập</span>
              </div>

              <div class="price-table-wrap" tabindex="0" aria-label="Ma trận nhập giá">
                <table class="price-table price-matrix">
                  <thead>
                    <tr>
                      <th scope="col">Hạng ghế / đơn vị</th>
                      <th v-for="category in categories" :key="category" scope="col">
                        {{ pricingLabel(category) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in grid" :key="row.seatType">
                      <th scope="row">
                        <b>{{ pricingSeatLabel(row.seatType) }}</b>
                        <span v-if="row.option" class="price-cell-sub">
                          /{{ pricingLabel(row.option.unit) }} · {{ row.option.capacity }} chỗ
                        </span>
                      </th>
                      <td v-for="cell in row.cells" :key="cell.key">
                        <select
                          class="price-control price-cell-mode"
                          :value="
                            cell.value.state === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'PRICED'
                          "
                          :disabled="!editable"
                          :aria-label="`Trạng thái ${pricingSeatLabel(row.seatType)}, ${pricingLabel(cell.ticketCategory)}`"
                          @change="changeMode(cell.value, $event)"
                        >
                          <option value="PRICED">Nhập giá</option>
                          <option value="NOT_APPLICABLE">Không áp dụng</option>
                        </select>
                        <input
                          class="price-control price-cell-input"
                          type="text"
                          inputmode="decimal"
                          autocomplete="off"
                          maxlength="24"
                          placeholder="Chưa nhập"
                          :value="cell.value.amount"
                          :disabled="!editable || cell.value.state === 'NOT_APPLICABLE'"
                          :aria-label="`Giá ${activeScope?.contentFormat ?? ''}, ${pricingLabel(activeTime)}, ${pricingSeatLabel(row.seatType)}, ${pricingLabel(cell.ticketCategory)}`"
                          :aria-invalid="
                            cell.value.state === 'PRICED' && parseAmount(cell.value.amount) === null
                          "
                          @input="changeAmount(cell.value, $event)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="price-notice price-notice--info price-space-top">
                Ô trống = chưa nhập. Giá 0 = miễn phí. “Không áp dụng” = không bán tổ hợp này. Ghế
                đôi tính /cặp; mỗi định dạng nhập độc lập.
              </div>
              <p class="price-note">
                Ghế đôi ngoài Lễ/Tết: 200.000đ/cặp cả ngày. Giá ghế đôi đồng nhất giữa các đối tượng
                vé. Rạp cao cấp dùng cùng giá giữa các đối tượng cho cùng định dạng, khung giờ và
                hạng ghế.
              </p>
            </template>

            <template v-else>
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">
                Kiểm tra và xem trước
              </h3>

              <div
                class="price-notice"
                :class="{ 'price-notice--success': entries.length > 0 && missingCount === 0 }"
              >
                {{
                  missingCount
                    ? `Còn ${missingCount} ô chưa nhập. Chỉ có thể lưu bản nháp.`
                    : 'Tất cả tổ hợp đã có giá hoặc được đánh dấu không áp dụng.'
                }}
              </div>

              <dl class="price-detail-grid">
                <div>
                  <dt>Tên bảng giá</dt>
                  <dd>{{ metadata.name }}</dd>
                </div>
                <div>
                  <dt>Loại ngày</dt>
                  <dd>{{ pricingLabel(metadata.dayGroup) }}</dd>
                </div>
                <div class="price-full">
                  <dt>Cụm rạp</dt>
                  <dd>
                    {{
                      metadata.cinemaIds
                        .map((id) => cinemas.find((item) => item.id === id)?.name ?? id)
                        .join(', ')
                    }}
                  </dd>
                </div>
                <div class="price-full">
                  <dt>Loại phòng</dt>
                  <dd>{{ experiences.map(pricingLabel).join(', ') }}</dd>
                </div>
                <div>
                  <dt>Định dạng</dt>
                  <dd>{{ formats.join(' / ') }}</dd>
                </div>
                <div>
                  <dt>Trạng thái khi lưu</dt>
                  <dd>
                    {{
                      targetStatus === 'PUBLISHED' ? 'Công bố sau khi kiểm tra hợp lệ' : 'Bản nháp'
                    }}
                  </dd>
                </div>
              </dl>
              <h3 class="price-section-title">Thử tra giá một tổ hợp</h3>
            </template>

            <template v-if="readOnly || step === 4">
              <div class="price-form-grid">
                <label class="price-field">
                  <span>Cụm rạp</span>
                  <select v-model="quoteCinema" class="price-control" :disabled="busy">
                    <option v-for="id in metadata.cinemaIds" :key="id" :value="id">
                      {{ cinemas.find((item) => item.id === id)?.name ?? id }}
                    </option>
                  </select>
                </label>
                <label class="price-field">
                  <span>Loại phòng</span>
                  <select v-model="quoteExperience" class="price-control" :disabled="busy">
                    <option v-for="item in quoteExperiences" :key="item" :value="item">
                      {{ pricingLabel(item) }}
                    </option>
                  </select>
                </label>
                <label class="price-field">
                  <span>Định dạng</span>
                  <select v-model="quoteFormat" class="price-control" :disabled="busy">
                    <option v-for="item in quoteFormats" :key="item" :value="item">
                      {{ item }}
                    </option>
                  </select>
                </label>
                <label class="price-field">
                  <span>Giờ bắt đầu</span>
                  <input v-model="quoteTime" class="price-control" type="time" :disabled="busy" />
                </label>
                <label class="price-field">
                  <span>Hạng ghế</span>
                  <select v-model="quoteSeat" class="price-control" :disabled="busy">
                    <option v-for="item in seats" :key="item" :value="item">
                      {{ pricingSeatLabel(item) }}
                    </option>
                  </select>
                </label>
                <label class="price-field">
                  <span>Đối tượng vé</span>
                  <select v-model="quoteCategory" class="price-control" :disabled="busy">
                    <option v-for="item in categories" :key="item" :value="item">
                      {{ pricingLabel(item) }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="price-explain" aria-live="polite">
                <p class="price-note">
                  {{ metadata.name }} · {{ pricingLabel(metadata.dayGroup) }} · {{ quote.time }}
                </p>
                <p class="price-explain-value">
                  <strong>{{ quote.label }}</strong>
                  <span v-if="quote.unit" class="price-unit">/{{ quote.unit }}</span>
                </p>
                <p class="price-note">
                  {{ quoteFormat }} · Giá bán cuối cùng theo bảng, không cộng phụ thu. Khả năng áp
                  dụng cho phòng thực tế cần được kiểm tra khi lập suất chiếu.
                </p>
              </div>
            </template>
          </div>

          <footer class="price-dialog-foot">
            <button
              v-if="!readOnly && step > 1"
              class="price-button"
              type="button"
              :disabled="busy || requiresReload || waitingForCreation"
              @click="previousStep"
            >
              Quay lại
            </button>

            <button class="price-button" type="button" :disabled="busy" @click="close">
              {{ readOnly ? 'Đóng' : 'Hủy' }}
            </button>

            <button
              v-if="requiresReload && policy"
              class="price-button"
              type="button"
              :disabled="busy"
              @click="reload"
            >
              Tải lại
            </button>

            <button
              v-if="!readOnly && step < 4"
              class="price-button price-button--primary"
              type="submit"
              :disabled="busy || requiresReload || !canManage"
            >
              {{ busy ? 'Đang xử lý…' : 'Tiếp tục' }}
              <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16 M14 6l6 6-6 6" />
              </svg>
            </button>

            <button
              v-else-if="!readOnly"
              class="price-button price-button--primary"
              type="submit"
              :disabled="!editable || (!dirty && targetStatus !== 'PUBLISHED')"
            >
              {{ busy ? 'Đang lưu…' : 'Lưu bảng giá' }}
              <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </button>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
