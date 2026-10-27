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
  ReplaceFareMatrixRequest,
  ReplacePricingConfigurationRequest,
  ScopeInput,
} from '@/services/api/generated/inventory-service/model'
import {
  pricingCellKey,
  pricingContainsMinute,
  pricingErrorMessage,
  pricingErrorStatus,
  pricingLabel,
  pricingMetadataSchema,
  pricingMinuteLabel,
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
import AdminPricingConfigurationEditor from './AdminPricingConfigurationEditor.vue'

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
type Value = { state: OptionsCellStatesItem; amount: string }

const actions = useAdminPricingActions(() => props.canManage)
const policy = ref<PricingPolicy | null>(null)
const persistedMatrix = ref<PricingMatrix | null>(null)
const options = ref<PricingMatrix['options'] | undefined>(props.configurationOptions)
const anchorId = ref(props.initial ? props.anchorCinemaId : '')
const pendingCreate = ref<CreateCinemaPricingPolicyRequest | null>(null)
const busy = ref(false)
const requiresReload = ref(false)
const configurationDirty = ref(false)
const error = ref('')
const notice = ref('')
const step = ref(1)
const targetStatus = ref<'DRAFT' | 'PUBLISHED'>('DRAFT')
const baselineMetadata = ref('')
const baselineMatrix = ref('')
const formElement = ref<HTMLFormElement | null>(null)
const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const metadata = reactive<PricingMetadata>({
  name: '',
  description: '',
  dayGroup: 'WEEKDAY',
  cinemaIds: [...props.initialCinemaIds],
})
const formats = ref<OptionsContentFormatsItem[]>([])
const experiences = ref<OptionsExperienceTypesItem[]>([])
const scopes = ref<ScopeInput[]>([])
const seats = ref<ReplaceFareMatrixRequest['seatTypes']>([])
const values = ref<Record<string, Value>>({})
const activeScopeKey = ref('')
const activeTimeId = ref('')

const quoteCinema = ref('')
const quoteExperience = ref('')
const quoteFormat = ref('')
const quoteTime = ref('17:00')
const quoteSeat = ref('')
const quoteGroup = ref('')

const steps = [
  'Thông tin & phạm vi',
  'Loại ngày & khung giờ',
  'Nhập giá vé',
  'Kiểm tra & xem trước',
]

const timeBands = computed(() => persistedMatrix.value?.timeBands ?? [])
const ticketGroups = computed(() => persistedMatrix.value?.ticketGroups ?? [])
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
const dayGroupLocked = computed(() => (persistedMatrix.value?.scopes.length ?? 0) > 0)

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
    name: value.name.trim(),
    description: value.description.trim(),
    dayGroup: value.dayGroup,
    cinemaIds: [...value.cinemaIds].sort(),
  })
}

function matrixKey(
  selectedScopes: ScopeInput[],
  selectedSeats: ReplaceFareMatrixRequest['seatTypes'],
  cells: { key: string; state: OptionsCellStatesItem; amount: string }[],
): string {
  return JSON.stringify({
    scopes: selectedScopes.map(pricingScopeKey).sort(),
    seats: [...selectedSeats].sort(),
    cells: [...cells].sort((first, second) => first.key.localeCompare(second.key)),
  })
}

const entries = computed(() =>
  scopes.value.flatMap((scope) =>
    timeBands.value.flatMap((band) =>
      seats.value.flatMap((seatType) =>
        ticketGroups.value.map((group) => {
          const identity: Identity = {
            ...scope,
            timeBandId: band.id,
            ticketGroupId: group.id,
            seatType,
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
      if (!values.value[item.key]) values.value[item.key] = { state: 'UNCONFIGURED', amount: '' }
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
  timeBands,
  (items) => {
    if (!items.some((item) => item.id === activeTimeId.value))
      activeTimeId.value = items[0]?.id ?? ''
  },
  { immediate: true, flush: 'sync' },
)

const localMatrixKey = computed(() =>
  matrixKey(
    scopes.value,
    seats.value,
    entries.value.map((item) => ({
      key: item.key,
      state: values.value[item.key]?.state ?? 'UNCONFIGURED',
      amount: values.value[item.key]?.amount ?? '',
    })),
  ),
)
const matrixDirty = computed(() => localMatrixKey.value !== baselineMatrix.value)
const dirty = computed(
  () =>
    configurationDirty.value ||
    metadataKey(metadataValue()) !== baselineMetadata.value ||
    matrixDirty.value ||
    (targetStatus.value === 'PUBLISHED' && policy.value?.status !== 'PUBLISHED'),
)
const missingCount = computed(
  () => entries.value.filter((item) => values.value[item.key]?.state === 'UNCONFIGURED').length,
)
const activeScope = computed(() =>
  scopes.value.find((item) => pricingScopeKey(item) === activeScopeKey.value),
)
const activeBand = computed(() => timeBands.value.find((item) => item.id === activeTimeId.value))
const grid = computed(() =>
  seats.value.map((seatType) => ({
    seatType,
    option: options.value?.seatTypes.find((item) => item.seatType === seatType),
    cells: ticketGroups.value.flatMap((group) => {
      if (!activeScope.value || !activeBand.value) return []
      const key = pricingCellKey({
        ...activeScope.value,
        timeBandId: activeBand.value.id,
        ticketGroupId: group.id,
        seatType,
      })
      const value = values.value[key]
      return value ? [{ key, group, value }] : []
    }),
  })),
)

const currentContext = computed<PricingContext | null>(() => {
  const current = policy.value
  return current
    ? {
        cinemaId: anchorId.value,
        policyId: current.policyId,
        versionId: current.id,
      }
    : null
})
const versions = useAdminPricingVersions(
  currentContext,
  () => props.canManage && readOnly.value && currentContext.value !== null,
)

function context(): PricingContext {
  const current = currentContext.value
  if (!current) throw new Error('Chưa có bản nháp.')
  return { ...current }
}

function rebuildScopes(): void {
  scopes.value = experiences.value.flatMap((experienceType) =>
    formats.value.map((contentFormat) => ({ experienceType, contentFormat })),
  )
}

function configureNew(value: PricingMatrix['options']): void {
  formats.value = value.contentFormats.filter((item) => item === '2D')
  if (!formats.value.length && value.contentFormats[0]) formats.value = [value.contentFormats[0]]
  experiences.value = [...value.experienceTypes]
  seats.value = value.seatTypes.map((item) => item.seatType)
  rebuildScopes()
}

function applyMatrix(matrix: PricingMatrix, retainSelection = false): void {
  const previousScopes = scopes.value.map((item) => ({ ...item }))
  const previousSeats = [...seats.value]

  persistedMatrix.value = matrix
  options.value = matrix.options
  values.value = Object.fromEntries(
    matrix.cells.map((cell) => [
      pricingCellKey(cell),
      {
        state: cell.state,
        amount: cell.amount == null ? '' : String(cell.amount).replace('.', ','),
      },
    ]),
  )
  scopes.value = matrix.scopes.map((item) => ({ ...item }))
  seats.value = [...matrix.seatTypes]
  formats.value = [...new Set(scopes.value.map((item) => item.contentFormat))]
  experiences.value = [...new Set(scopes.value.map((item) => item.experienceType))]

  baselineMatrix.value = matrixKey(
    matrix.scopes,
    matrix.seatTypes,
    matrix.cells.map((cell) => ({
      key: pricingCellKey(cell),
      state: cell.state,
      amount: cell.amount == null ? '' : String(cell.amount).replace('.', ','),
    })),
  )

  if (retainSelection && previousScopes.length && previousSeats.length) {
    scopes.value = previousScopes
    seats.value = previousSeats
    formats.value = [...new Set(previousScopes.map((item) => item.contentFormat))]
    experiences.value = [...new Set(previousScopes.map((item) => item.experienceType))]
  } else if (matrix.status === 'DRAFT' && matrix.scopes.length === 0) {
    configureNew(matrix.options)
  }

  const current = policy.value
  if (current) {
    policy.value = {
      ...current,
      version: matrix.version,
      status: matrix.status,
      dayGroup: matrix.dayGroup,
    }
  }
}

function hydrate(detail: PricingDetail): void {
  policy.value = detail.policy
  Object.assign(metadata, {
    name: detail.policy.name,
    description: detail.policy.description,
    dayGroup: detail.policy.dayGroup,
    cinemaIds: [...detail.policy.cinemaIds],
  })
  baselineMetadata.value = metadataKey(metadataValue())
  applyMatrix(detail.matrix)
  configurationDirty.value = false
  targetStatus.value = detail.policy.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
}

if (props.initial) {
  hydrate(props.initial)
} else {
  if (options.value) configureNew(options.value)
  baselineMetadata.value = metadataKey(metadataValue())
  baselineMatrix.value = localMatrixKey.value
}

function parseAmount(text: string): number | null {
  const value = text.trim()
  if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?$/.test(value)) return null
  const amount = Number(value.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(amount) && amount <= 9_999_999_999.99 ? amount : null
}

function money(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}đ`
}

function changeMode(value: Value, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  value.state =
    target.value === 'NOT_APPLICABLE'
      ? 'NOT_APPLICABLE'
      : value.amount.trim()
        ? 'PRICED'
        : 'UNCONFIGURED'
}

function changeAmount(value: Value, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  value.amount = target.value
  value.state = value.amount.trim() ? 'PRICED' : 'UNCONFIGURED'
}

function validateMetadata(): PricingMetadata {
  const result = pricingMetadataSchema.safeParse(metadataValue())
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? 'Kiểm tra thông tin bảng giá.')
  if (policy.value && !result.data.cinemaIds.includes(anchorId.value)) {
    throw new Error('Cần giữ cụm rạp đang mở trong phạm vi của phiên bản này.')
  }
  if (dayGroupLocked.value && result.data.dayGroup !== persistedMatrix.value?.dayGroup) {
    throw new Error('Bảng giá đã có ma trận được lưu nên không thể đổi loại ngày.')
  }
  return result.data
}

function validateDefinition(): void {
  const available = options.value
  if (!available || !scopes.value.length || !seats.value.length) {
    throw new Error('Chọn ít nhất một định dạng, loại phòng và hạng ghế.')
  }
  if (
    scopes.value.some(
      (scope) =>
        !available.experienceTypes.some((item) => item === scope.experienceType) ||
        !available.contentFormats.some((item) => item === scope.contentFormat),
    ) ||
    seats.value.some((seat) => !available.seatTypes.some((item) => item.seatType === seat))
  ) {
    throw new Error('Lựa chọn cấu hình đã thay đổi. Hãy tải lại bảng giá.')
  }
  if (!timeBands.value.length || !ticketGroups.value.length) {
    throw new Error('Chưa tải được khung giờ và nhóm vé của phiên bản.')
  }
  if (configurationDirty.value) {
    throw new Error('Lưu hoặc bỏ thay đổi khung giờ và nhóm vé trước khi tiếp tục.')
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
      timeBandId: item.timeBandId,
      ticketGroupId: item.ticketGroupId,
      seatType: item.seatType,
    }
    if (!value || value.state !== 'PRICED') {
      return { ...identity, state: value?.state ?? 'UNCONFIGURED' }
    }

    const amount = parseAmount(value.amount)
    if (amount === null) {
      const group = ticketGroups.value.find((entry) => entry.id === item.ticketGroupId)
      const band = timeBands.value.find((entry) => entry.id === item.timeBandId)
      throw new Error(
        `Giá chưa hợp lệ: ${pricingSeatLabel(item.seatType)}, ${group?.name ?? ''}, ` +
          `${item.contentFormat}, ${band?.name ?? ''}.`,
      )
    }
    if (item.experienceType === 'PREMIUM_CINEMA') {
      sameFare(
        JSON.stringify(['premium', item.contentFormat, item.timeBandId, item.seatType]),
        amount,
        'Rạp cao cấp cần cùng giá giữa các nhóm vé cho cùng định dạng, khung giờ và ghế.',
      )
    }
    if (item.seatType === 'COUPLE') {
      sameFare(
        JSON.stringify([
          'couple',
          item.experienceType,
          item.contentFormat,
          metadata.dayGroup === 'HOLIDAY' ? item.timeBandId : 'ALL_DAY',
        ]),
        amount,
        metadata.dayGroup === 'HOLIDAY'
          ? 'Ghế đôi cần cùng giá giữa các nhóm vé trong cùng khung giờ và phạm vi.'
          : 'Ghế đôi ngoài Lễ/Tết cần cùng giá giữa các nhóm vé và khung giờ trong cùng phạm vi.',
      )
    }
    return { ...identity, state: 'PRICED', amount }
  })

  return {
    expectedVersion,
    scopes: scopes.value.map((item) => ({ ...item })),
    seatTypes: [...seats.value],
    cells,
  }
}

async function ensureDraft(): Promise<void> {
  if (!policy.value) {
    if (!pendingCreate.value) {
      pendingCreate.value = { ...validateMetadata(), clientRequestId: crypto.randomUUID() }
      anchorId.value = pendingCreate.value.cinemaIds[0] ?? ''
    }
    try {
      const created = await actions.create.mutateAsync({
        cinemaId: anchorId.value,
        request: pendingCreate.value,
      })
      policy.value = created
      baselineMetadata.value = metadataKey({
        name: created.name,
        description: created.description,
        dayGroup: created.dayGroup,
        cinemaIds: created.cinemaIds,
      })
    } catch (cause: unknown) {
      const status = pricingErrorStatus(cause)
      if (status === 400 || status === 422) pendingCreate.value = null
      throw cause
    }
  }

  if (!persistedMatrix.value) {
    const detail = await actions.loadDetail(context())
    if (detail.matrix.requiredCellCount > 0 || detail.policy.status !== 'DRAFT') {
      requiresReload.value = true
      throw new Error(
        'Phiên bản đã có dữ liệu hoặc thay đổi trạng thái. Hãy tải lại trước khi tiếp tục.',
      )
    }
    policy.value = detail.policy
    applyMatrix(detail.matrix, true)
  }
  pendingCreate.value = null
}

function handleFailure(cause: unknown, mutation = false): void {
  error.value = pricingErrorMessage(cause)
  const status = pricingErrorStatus(cause)
  if (status === 409 || (mutation && status !== 400 && status !== 422)) {
    requiresReload.value = true
  }
}

async function saveConfiguration(request: ReplacePricingConfigurationRequest): Promise<void> {
  const current = policy.value
  if (!editable.value || !current || current.status !== 'DRAFT') return
  if (request.expectedVersion !== current.version) {
    requiresReload.value = true
    error.value = 'Phiên bản cấu hình đã thay đổi. Hãy tải lại trước khi lưu.'
    return
  }

  if (
    matrixDirty.value &&
    !window.confirm(
      'Sau khi lưu cấu hình, các ô giá sẽ được thay bằng phản hồi mới từ máy chủ. ' +
        'Phần giá chưa lưu sẽ bị bỏ; lựa chọn định dạng và hạng ghế đang nhập được giữ. Tiếp tục?',
    )
  )
    return

  busy.value = true
  error.value = ''
  try {
    const matrix = await actions.configuration.mutateAsync({ context: context(), request })
    applyMatrix(matrix, true)
    configurationDirty.value = false
    notice.value = 'Đã lưu cấu hình. Ma trận và phiên bản đã được cập nhật từ hệ thống.'
  } catch (cause: unknown) {
    handleFailure(cause, true)
  } finally {
    busy.value = false
  }
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
      const hadOptions = Boolean(options.value)
      busy.value = true
      await ensureDraft()
      if (!hadOptions) {
        notice.value = 'Đã lưu thông tin nháp. Chọn định dạng và loại phòng để tiếp tục.'
        return
      }
      validateDefinition()
    }
    if (step.value === 2) {
      validateMetadata()
      validateDefinition()
    }
    if (step.value === 3) matrixRequest(policy.value?.version ?? 0)
    step.value = Math.min(4, step.value + 1)
    await focusStep()
  } catch (cause: unknown) {
    handleFailure(cause)
  } finally {
    busy.value = false
  }
}

async function previousStep(): Promise<void> {
  if (busy.value || requiresReload.value || waitingForCreation.value) return
  if (configurationDirty.value) {
    error.value = 'Lưu hoặc bỏ thay đổi khung giờ và nhóm vé trước khi chuyển bước.'
    return
  }
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
    handleFailure(cause)
    return
  }

  busy.value = true
  let mutationStarted = false

  try {
    await ensureDraft()
    let current = policy.value
    if (!current) throw new Error('Chưa xác nhận được bản nháp.')

    const selectedContext = context()
    const nextMetadata = validateMetadata()

    if (metadataKey(nextMetadata) !== baselineMetadata.value) {
      mutationStarted = true
      current = await actions.metadata.mutateAsync({
        context: selectedContext,
        request: { ...nextMetadata, expectedVersion: current.version },
      })
      policy.value = current
      baselineMetadata.value = metadataKey({
        name: current.name,
        description: current.description,
        dayGroup: current.dayGroup,
        cinemaIds: current.cinemaIds,
      })
    }

    mutationStarted = true
    const matrix = await actions.matrix.mutateAsync({
      context: selectedContext,
      request: matrixRequest(current.version),
    })
    applyMatrix(matrix)
    current = {
      ...current,
      version: matrix.version,
      status: matrix.status,
      dayGroup: matrix.dayGroup,
    }
    policy.value = current
    mutationStarted = false

    if (targetStatus.value === 'PUBLISHED') {
      const result = await actions.validation.mutateAsync(selectedContext)
      if (result.version !== current.version) {
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

      mutationStarted = true
      policy.value = await actions.publication.mutateAsync({
        context: selectedContext,
        request: { expectedVersion: current.version },
      })
    }

    emit('close')
  } catch (cause: unknown) {
    handleFailure(cause, mutationStarted)
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
    notice.value = 'Đã tải dữ liệu mới nhất. Kiểm tra lại trước khi lưu.'
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function changeVersion(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || busy.value || !readOnly.value) return
  const selectedId = target.value
  const selected = versions.data.value?.find((item) => item.id === selectedId)
  if (!selected) return

  busy.value = true
  error.value = ''
  try {
    hydrate(
      await actions.loadDetail({
        cinemaId: anchorId.value,
        policyId: selected.policyId,
        versionId: selected.id,
      }),
    )
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
    if (!items.some((item) => item === quoteExperience.value))
      quoteExperience.value = items[0] ?? ''
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
  ticketGroups,
  (items) => {
    if (quoteGroup.value && !items.some((item) => item.id === quoteGroup.value))
      quoteGroup.value = ''
  },
  { immediate: true },
)

const quote = computed(() => {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(quoteTime.value)) {
    return { label: 'Nhập giờ hợp lệ', unit: '', time: '' }
  }
  const [hour, minute] = quoteTime.value.split(':').map(Number)
  if (hour === undefined || minute === undefined)
    return { label: 'Nhập giờ hợp lệ', unit: '', time: '' }
  const matching = timeBands.value.filter((band) => pricingContainsMinute(band, hour * 60 + minute))
  const band = matching[0]
  if (matching.length !== 1 || !band) {
    return { label: 'Không có khung giờ áp dụng', unit: '', time: quoteTime.value }
  }

  const groupId = quoteGroup.value || persistedMatrix.value?.defaultTicketGroupId
  const item = entries.value.find(
    (entry) =>
      entry.experienceType === quoteExperience.value &&
      entry.contentFormat === quoteFormat.value &&
      entry.timeBandId === band.id &&
      entry.ticketGroupId === groupId &&
      entry.seatType === quoteSeat.value,
  )
  if (!item || !metadata.cinemaIds.includes(quoteCinema.value)) {
    return { label: 'Chưa có tổ hợp phù hợp', unit: '', time: band.name }
  }
  const value = values.value[item.key]
  if (!value || value.state === 'UNCONFIGURED')
    return { label: 'Chưa nhập giá', unit: '', time: band.name }
  if (value.state === 'NOT_APPLICABLE') return { label: 'Không áp dụng', unit: '', time: band.name }

  const amount = parseAmount(value.amount)
  const unit = options.value?.seatTypes.find((seat) => seat.seatType === item.seatType)?.unit
  return {
    label: amount === null ? 'Giá chưa hợp lệ' : money(amount),
    unit: unit ? pricingLabel(unit) : '',
    time: band.name,
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
          <DialogTitle>{{
            readOnly ? 'Tra cứu giá vé' : initial ? 'Chỉnh sửa bảng giá' : 'Tạo bảng giá vé'
          }}</DialogTitle>
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
          Thiết lập thông tin, loại ngày, khung giờ, nhóm vé và giá bán.
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
              <p class="price-notice price-notice--info">
                {{ metadata.description || 'Bảng giá được chọn trực tiếp theo suất chiếu.' }}
                Đây là phần xem trước dữ liệu của phiên bản.
              </p>
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
              <p v-if="versions.isError.value" class="price-note">
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
                <p class="price-notice price-notice--info price-full">
                  {{
                    options
                      ? 'Mỗi định dạng có giá riêng. Khi tiếp tục, hệ thống tạo hoặc mở bản nháp để tải khung giờ và nhóm vé của phiên bản.'
                      : 'Nhập thông tin và chọn “Tiếp tục” để lưu bản nháp, tải lựa chọn từ hệ thống rồi hoàn tất phạm vi.'
                  }}
                </p>
              </div>
            </template>

            <template v-else-if="step === 2">
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">
                Loại ngày, khung giờ và nhóm vé
              </h3>
              <div class="price-form-grid">
                <label class="price-field price-full">
                  <span>Mẫu loại ngày</span>
                  <select
                    v-model="metadata.dayGroup"
                    class="price-control"
                    :disabled="!editable || dayGroupLocked"
                  >
                    <option value="WEEKDAY">Ngày thường</option>
                    <option value="WEEKEND">Cuối tuần</option>
                    <option value="HOLIDAY">Lễ/Tết</option>
                  </select>
                </label>
                <p v-if="dayGroupLocked" class="price-notice price-notice--info price-full">
                  Loại ngày được giữ nguyên vì bảng giá đã có ma trận được lưu. Nếu cần loại ngày
                  khác, hãy tạo bảng giá mới.
                </p>
                <p class="price-notice price-notice--info price-full">
                  Bảng giá Lễ/Tết được chọn trực tiếp cho suất chiếu; không tự suy luận lịch lễ. Lưu
                  cấu hình khung giờ và nhóm vé riêng trước khi nhập giá.
                </p>
              </div>
              <AdminPricingConfigurationEditor
                v-if="persistedMatrix"
                :matrix="persistedMatrix"
                :editable="editable"
                @dirty="configurationDirty = $event"
                @save="saveConfiguration"
              />
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
                  v-model="activeTimeId"
                  class="price-control"
                  aria-label="Khung giờ nhập giá"
                  :disabled="busy"
                >
                  <option v-for="band in timeBands" :key="band.id" :value="band.id">
                    {{ band.name }} · {{ pricingMinuteLabel(band.startMinute) }}–{{
                      pricingMinuteLabel(band.endMinute)
                    }}
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
                      <th v-for="group in ticketGroups" :key="group.id" scope="col">
                        {{ group.name }}
                        <span v-if="group.defaultGroup" class="price-cell-sub">Mặc định</span>
                        <span v-if="group.eligibilityDescription" class="price-cell-sub">{{
                          group.eligibilityDescription
                        }}</span>
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
                          :aria-label="`Trạng thái ${pricingSeatLabel(row.seatType)}, ${cell.group.name}`"
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
                          :aria-label="`Giá ${activeScope?.contentFormat ?? ''}, ${activeBand?.name ?? ''}, ${pricingSeatLabel(row.seatType)}, ${cell.group.name}`"
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
              <p class="price-notice price-notice--info price-space-top">
                Ô trống = chưa nhập. Giá 0 = miễn phí. “Không áp dụng” = không bán tổ hợp này. Ghế
                đôi tính cho cả cặp. 2D và 3D nhập độc lập, không cộng phụ thu.
              </p>
              <p class="price-note">
                Rạp cao cấp dùng cùng giá giữa các nhóm vé cho cùng định dạng, khung giờ và hạng
                ghế. Ghế đôi đồng nhất giữa các nhóm vé; ngoài Lễ/Tết còn đồng nhất giữa các khung
                giờ.
              </p>
            </template>

            <template v-else>
              <h3 class="price-visually-hidden" data-step-focus tabindex="-1">
                Kiểm tra và xem trước
              </h3>
              <p
                class="price-notice"
                :class="{ 'price-notice--success': entries.length > 0 && missingCount === 0 }"
              >
                {{
                  missingCount
                    ? `Còn ${missingCount} ô chưa nhập. Chỉ có thể lưu bản nháp.`
                    : 'Tất cả tổ hợp đã có giá hoặc được đánh dấu không áp dụng.'
                }}
              </p>
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
                  <dt>Nhóm vé</dt>
                  <dd>{{ ticketGroups.map((item) => item.name).join(', ') }}</dd>
                </div>
                <div>
                  <dt>Khung giờ</dt>
                  <dd>{{ timeBands.map((item) => item.name).join(', ') }}</dd>
                </div>
                <div>
                  <dt>Trạng thái khi lưu</dt>
                  <dd>{{ targetStatus === 'PUBLISHED' ? 'Công bố sau kiểm tra' : 'Bản nháp' }}</dd>
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
                  <input
                    v-model="quoteTime"
                    class="price-control"
                    type="time"
                    step="60"
                    :disabled="busy"
                  />
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
                  <span>Nhóm vé</span>
                  <select v-model="quoteGroup" class="price-control" :disabled="busy">
                    <option value="">Dùng nhóm mặc định</option>
                    <option v-for="group in ticketGroups" :key="group.id" :value="group.id">
                      {{ group.name }}
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
                  Xem trước các ô đang hiển thị. Giá cuối cùng theo bảng, không cộng phụ thu. Phòng
                  và ghế thực tế cần được kiểm tra khi lập suất chiếu.
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
