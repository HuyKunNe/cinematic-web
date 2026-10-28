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

const props = defineProps<{
  cinemas: PricingCinema[]
  anchorCinemaId: string
  initialCinemaIds: string[]
  canManage: boolean
  configurationOptions?: PricingMatrix['options']
  initial?: PricingDetail
  readOnly?: boolean
  lookup?: boolean
  createDraft?: () => Promise<PricingDetail>
}>()

const emit = defineEmits<{ close: []; draftReady: [versionId: string] }>()

type TimeRow = {
  key: string
  id?: string
  name: string
  start: string
  end: string
}

type GroupRow = {
  key: string
  id?: string
  name: string
  description: string
  defaultGroup: boolean
}

type CellValue = {
  state: OptionsCellStatesItem
  amount: string
}

type Issue = {
  key: string
  message: string
}

const actions = useAdminPricingActions(() => props.canManage)
const policy = ref<PricingPolicy | null>(null)
const savedMatrix = ref<PricingMatrix | null>(null)
const options = ref<PricingMatrix['options'] | undefined>(props.configurationOptions)
const anchorId = ref(props.initial ? props.anchorCinemaId : '')
const pendingCreate = ref<CreateCinemaPricingPolicyRequest | null>(null)
const pendingRevision = ref(
  Boolean(props.createDraft && props.initial?.policy.status === 'PUBLISHED'),
)

const busy = ref(false)
const publishing = ref(false)
const requiresReload = ref(false)
const showErrors = ref(false)
const removalAccepted = ref(false)
const error = ref('')
const notice = ref('')

const formElement = ref<HTMLFormElement | null>(null)
const statusElement = ref<HTMLElement | null>(null)
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
const bands = ref<TimeRow[]>([])
const groups = ref<GroupRow[]>([])
const values = ref<Record<string, CellValue>>({})
const activeScopeKey = ref('')

const baselineMetadata = ref('')
const baselineDefinitions = ref('')
const baselineMatrix = ref('')

const readOnly = computed(
  () =>
    Boolean(props.readOnly || props.lookup) ||
    (policy.value !== null &&
      policy.value.status !== 'DRAFT' &&
      !(pendingRevision.value && policy.value.status === 'PUBLISHED')),
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
const dayGroupLocked = computed(() => (savedMatrix.value?.scopes.length ?? 0) > 0)
const lookupCinemaNames = computed(() =>
  metadata.cinemaIds
    .map(
      (id) => props.cinemas.find((cinema) => cinema.id === id)?.name ?? 'Chưa tải được tên cụm rạp',
    )
    .join(' · '),
)

function canonical(value: string): string {
  return value.trim().normalize('NFC')
}

function metadataValue(): PricingMetadata {
  return {
    name: canonical(metadata.name),
    description: canonical(metadata.description),
    dayGroup: metadata.dayGroup,
    cinemaIds: [...metadata.cinemaIds].sort(),
  }
}

function metadataKey(value: PricingMetadata): string {
  return JSON.stringify({
    name: canonical(value.name),
    description: canonical(value.description),
    dayGroup: value.dayGroup,
    cinemaIds: [...value.cinemaIds].sort(),
  })
}

const definitionsKey = computed(() =>
  JSON.stringify({
    bands: bands.value.map((row) => ({
      key: row.key,
      id: row.id,
      name: canonical(row.name),
      start: row.start,
      end: row.end,
    })),
    groups: groups.value.map((row) => ({
      key: row.key,
      id: row.id,
      name: canonical(row.name),
      description: canonical(row.description),
      defaultGroup: row.defaultGroup,
    })),
  }),
)

function cellKey(
  scope: ScopeInput,
  bandKey: string,
  groupKey: string,
  seatType: ReplaceFareMatrixRequest['seatTypes'][number],
): string {
  return pricingCellKey({
    ...scope,
    timeBandId: bandKey,
    ticketGroupId: groupKey,
    seatType,
  })
}

const entries = computed(() =>
  scopes.value.flatMap((scope) =>
    bands.value.flatMap((band) =>
      seats.value.flatMap((seatType) =>
        groups.value.map((group) => ({
          scope,
          band,
          group,
          seatType,
          key: cellKey(scope, band.key, group.key, seatType),
        })),
      ),
    ),
  ),
)

function ensureValues(): void {
  for (const entry of entries.value) {
    if (!values.value[entry.key]) {
      values.value[entry.key] = { state: 'UNCONFIGURED', amount: '' }
    }
  }
}

watch(entries, ensureValues, { immediate: true, flush: 'sync' })

watch(
  scopes,
  (items) => {
    if (!items.some((item) => pricingScopeKey(item) === activeScopeKey.value)) {
      activeScopeKey.value = items[0] ? pricingScopeKey(items[0]) : ''
    }
  },
  { immediate: true, flush: 'sync' },
)

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

const localMatrixKey = computed(() =>
  matrixKey(
    scopes.value,
    seats.value,
    entries.value.map((entry) => ({
      key: entry.key,
      state: values.value[entry.key]?.state ?? 'UNCONFIGURED',
      amount: values.value[entry.key]?.amount ?? '',
    })),
  ),
)

const definitionsDirty = computed(() => definitionsKey.value !== baselineDefinitions.value)
const dirty = computed(
  () =>
    metadataKey(metadataValue()) !== baselineMetadata.value ||
    definitionsDirty.value ||
    localMatrixKey.value !== baselineMatrix.value,
)

const activeScope = computed(() =>
  scopes.value.find((scope) => pricingScopeKey(scope) === activeScopeKey.value),
)

const tables = computed(() =>
  bands.value.map((band) => ({
    band,
    rows: seats.value.map((seatType) => ({
      seatType,
      option: options.value?.seatTypes.find((item) => item.seatType === seatType),
      cells: groups.value.flatMap((group) => {
        const scope = activeScope.value
        if (!scope) return []

        const key = cellKey(scope, band.key, group.key, seatType)
        const value = values.value[key]
        return value ? [{ key, group, value }] : []
      }),
    })),
  })),
)

const currentContext = computed<PricingContext | null>(() => {
  const current = policy.value
  return current
    ? { cinemaId: anchorId.value, policyId: current.policyId, versionId: current.id }
    : null
})

const versions = useAdminPricingVersions(
  currentContext,
  () => props.canManage && readOnly.value && currentContext.value !== null,
)
const visibleVersions = computed(() => {
  const items = versions.data.value ?? []
  return props.lookup ? items.filter((item) => item.status === 'PUBLISHED') : items
})

function context(): PricingContext {
  const current = currentContext.value
  if (!current) throw new Error('Chưa xác nhận được bản nháp.')
  return { ...current }
}

function rebuildScopes(): void {
  scopes.value = experiences.value.flatMap((experienceType) =>
    formats.value.map((contentFormat) => ({ experienceType, contentFormat })),
  )
}

function configureDefaults(value: PricingMatrix['options']): void {
  formats.value = value.contentFormats.filter((item) => item === '2D')
  if (!formats.value.length && value.contentFormats[0]) {
    formats.value = [value.contentFormats[0]]
  }
  experiences.value = [...value.experienceTypes]
  seats.value = value.seatTypes.map((item) => item.seatType)
  rebuildScopes()
}

function restoreSelection(
  selectedScopes: ScopeInput[],
  selectedSeats: ReplaceFareMatrixRequest['seatTypes'],
): void {
  scopes.value = selectedScopes.map((scope) => ({ ...scope }))
  seats.value = [...selectedSeats]
  formats.value = [...new Set(selectedScopes.map((scope) => scope.contentFormat))]
  experiences.value = [...new Set(selectedScopes.map((scope) => scope.experienceType))]
  ensureValues()
}

function applyMatrix(matrix: PricingMatrix, retainSelection = false): void {
  const previousScopes = scopes.value.map((scope) => ({ ...scope }))
  const previousSeats = [...seats.value]

  savedMatrix.value = matrix
  options.value = matrix.options

  bands.value = matrix.timeBands.map((band) => ({
    key: band.id,
    id: band.id,
    name: band.name,
    start: pricingMinuteLabel(band.startMinute),
    end: pricingMinuteLabel(band.endMinute),
  }))
  groups.value = matrix.ticketGroups.map((group) => ({
    key: group.id,
    id: group.id,
    name: group.name,
    description: group.eligibilityDescription,
    defaultGroup: group.defaultGroup,
  }))

  values.value = Object.fromEntries(
    matrix.cells.map((cell) => [
      pricingCellKey(cell),
      {
        state: cell.state,
        amount: cell.amount == null ? '' : String(cell.amount).replace('.', ','),
      },
    ]),
  )

  restoreSelection(matrix.scopes, matrix.seatTypes)
  baselineDefinitions.value = definitionsKey.value
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
    restoreSelection(previousScopes, previousSeats)
  } else if (!readOnly.value && matrix.status === 'DRAFT' && !matrix.scopes.length) {
    configureDefaults(matrix.options)
    ensureValues()
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
  showErrors.value = false
  removalAccepted.value = false
}

if (props.initial) {
  hydrate(props.initial)
} else {
  if (options.value) configureDefaults(options.value)
  baselineMetadata.value = metadataKey(metadataValue())
  baselineDefinitions.value = definitionsKey.value
  baselineMatrix.value = localMatrixKey.value
}

function minute(text: string, allow24 = false): number | null {
  if (allow24 && text === '24:00') return 1440
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(text)) return null
  const [hour, remainder] = text.split(':').map(Number)
  return hour === undefined || remainder === undefined ? null : hour * 60 + remainder
}

function bandRange(band: TimeRow): { startMinute: number; endMinute: number } | null {
  const start = minute(band.start)
  const end = minute(band.end, true)
  if (start === null || end === null || start === end) return null
  return { startMinute: start, endMinute: end === 0 ? 1440 : end }
}

function parseAmount(text: string): number | null {
  const value = text.trim()
  if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?$/.test(value)) {
    return null
  }
  const amount = Number(value.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(amount) && amount <= 9_999_999_999.99 ? amount : null
}

const issues = computed<Issue[]>(() => {
  const result: Issue[] = []
  const parsed = pricingMetadataSchema.safeParse(metadataValue())

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      const message =
        field === 'name'
          ? 'Tên bảng giá cần từ 1 đến 120 ký tự.'
          : field === 'description'
            ? 'Mô tả bảng giá tối đa 1.000 ký tự.'
            : field === 'cinemaIds'
              ? 'Chọn ít nhất một cụm rạp hợp lệ.'
              : 'Kiểm tra loại ngày của bảng giá.'
      result.push({ key: `meta:${field}`, message })
    }
  }

  if (policy.value && !metadata.cinemaIds.includes(anchorId.value)) {
    result.push({
      key: 'meta:cinemaIds',
      message: 'Cần giữ cụm rạp đang mở trong phạm vi áp dụng.',
    })
  }
  if (dayGroupLocked.value && metadata.dayGroup !== savedMatrix.value?.dayGroup) {
    result.push({
      key: 'meta:dayGroup',
      message: 'Không thể đổi loại ngày khi đã có ma trận được lưu.',
    })
  }

  if (!savedMatrix.value) return result

  const available = options.value
  if (!available || !scopes.value.length || !seats.value.length) {
    result.push({ key: 'scope', message: 'Chọn ít nhất một định dạng, loại phòng và hạng ghế.' })
  } else if (
    scopes.value.some(
      (scope) =>
        !available.experienceTypes.some((item) => item === scope.experienceType) ||
        !available.contentFormats.some((item) => item === scope.contentFormat),
    ) ||
    seats.value.some((seat) => !available.seatTypes.some((item) => item.seatType === seat))
  ) {
    result.push({ key: 'scope', message: 'Lựa chọn phạm vi không khớp cấu hình hiện tại.' })
  }

  if (!bands.value.length) {
    result.push({ key: 'bands', message: 'Cần ít nhất một khung giờ.' })
  }
  if (!groups.value.length) {
    result.push({ key: 'groups', message: 'Cần ít nhất một nhóm vé.' })
  }

  function checkNames(rows: { key: string; name: string }[], prefix: string, label: string): void {
    const seen = new Set<string>()
    for (const row of rows) {
      const name = canonical(row.name)
      const normalized = name.toLocaleLowerCase('vi-VN')
      if (!name || name.length > 120) {
        result.push({
          key: `${prefix}:${row.key}:name`,
          message: `${label} cần từ 1 đến 120 ký tự.`,
        })
      } else if (seen.has(normalized)) {
        result.push({ key: `${prefix}:${row.key}:name`, message: `${label} không được trùng.` })
      }
      seen.add(normalized)
    }
  }

  checkNames(bands.value, 'band', 'Tên khung giờ')
  checkNames(groups.value, 'group', 'Tên nhóm vé')

  const occupied = new Set<number>()
  for (const band of bands.value) {
    const range = bandRange(band)
    if (!range) {
      result.push({
        key: `band:${band.key}:time`,
        message: 'Nhập giờ hợp lệ; giờ bắt đầu và kết thúc phải khác nhau.',
      })
      continue
    }
    let overlap = false
    for (let value = 0; value < 1440; value++) {
      if (!pricingContainsMinute(range, value)) continue
      if (occupied.has(value)) overlap = true
      occupied.add(value)
    }
    if (overlap) {
      result.push({
        key: `band:${band.key}:time`,
        message: 'Khung giờ bị chồng lấn với khung khác.',
      })
    }
  }

  if (groups.value.filter((group) => group.defaultGroup).length !== 1) {
    result.push({ key: 'groups', message: 'Cần đúng một nhóm vé mặc định.' })
  }
  for (const group of groups.value) {
    if (canonical(group.description).length > 1000) {
      result.push({
        key: `group:${group.key}:description`,
        message: 'Điều kiện tối đa 1.000 ký tự.',
      })
    }
    if (group.defaultGroup && canonical(group.description)) {
      result.push({
        key: `group:${group.key}:description`,
        message: 'Nhóm mặc định phải để trống mô tả điều kiện.',
      })
    }
  }

  const uniform = new Map<string, number>()
  function checkUniform(key: string, amount: number, cell: string, message: string): void {
    const previous = uniform.get(key)
    if (previous !== undefined && previous !== amount) result.push({ key: cell, message })
    uniform.set(key, amount)
  }

  for (const entry of entries.value) {
    const value = values.value[entry.key]
    if (!value || value.state !== 'PRICED') continue
    const amount = parseAmount(value.amount)
    if (amount === null) {
      result.push({ key: entry.key, message: 'Nhập giá không âm, tối đa hai chữ số thập phân.' })
      continue
    }

    if (entry.scope.experienceType === 'PREMIUM_CINEMA' && entry.seatType !== 'COUPLE') {
      checkUniform(
        JSON.stringify(['premium', entry.scope.contentFormat, entry.band.key, entry.seatType]),
        amount,
        entry.key,
        'Rạp cao cấp cần cùng giá giữa các nhóm vé cho cùng định dạng, khung giờ và hạng ghế.',
      )
    }
  }

  return result
})

function fieldError(key: string): string {
  return showErrors.value ? (issues.value.find((issue) => issue.key === key)?.message ?? '') : ''
}

const removedBands = computed(
  () =>
    savedMatrix.value?.timeBands.filter((item) => !bands.value.some((row) => row.id === item.id)) ??
    [],
)
const removedGroups = computed(
  () =>
    savedMatrix.value?.ticketGroups.filter(
      (item) => !groups.value.some((row) => row.id === item.id),
    ) ?? [],
)
const removedScopes = computed(
  () =>
    savedMatrix.value?.scopes.filter(
      (item) => !scopes.value.some((scope) => pricingScopeKey(scope) === pricingScopeKey(item)),
    ) ?? [],
)
const removedSeats = computed(
  () =>
    savedMatrix.value?.seatTypes.filter((item) => !seats.value.some((seat) => seat === item)) ?? [],
)
const affectedCells = computed(
  () =>
    savedMatrix.value?.cells.filter(
      (cell) =>
        removedBands.value.some((band) => band.id === cell.timeBandId) ||
        removedGroups.value.some((group) => group.id === cell.ticketGroupId) ||
        removedScopes.value.some((scope) => pricingScopeKey(scope) === pricingScopeKey(cell)) ||
        removedSeats.value.some((seat) => seat === cell.seatType),
    ) ?? [],
)
const needsRemovalReview = computed(
  () =>
    removedBands.value.length +
      removedGroups.value.length +
      removedScopes.value.length +
      removedSeats.value.length >
    0,
)
const removalKey = computed(() =>
  JSON.stringify({
    version: savedMatrix.value?.version,
    bands: removedBands.value.map((item) => item.id).sort(),
    groups: removedGroups.value.map((item) => item.id).sort(),
    scopes: removedScopes.value.map(pricingScopeKey).sort(),
    seats: [...removedSeats.value].sort(),
  }),
)
watch(removalKey, () => {
  removalAccepted.value = false
})

function addBand(): void {
  if (!editable.value) return
  bands.value.push({ key: crypto.randomUUID(), name: '', start: '', end: '' })
}
function addGroup(): void {
  if (!editable.value) return
  groups.value.push({
    key: crypto.randomUUID(),
    name: '',
    description: '',
    defaultGroup: false,
  })
}
function setDefault(key: string): void {
  if (!editable.value) return
  for (const group of groups.value) group.defaultGroup = group.key === key
}
function removeBand(key: string): void {
  if (editable.value) bands.value = bands.value.filter((row) => row.key !== key)
}
function removeGroup(key: string): void {
  if (!editable.value) return
  if (groups.value.find((row) => row.key === key)?.defaultGroup) {
    notice.value = 'Chọn nhóm mặc định khác trước khi xóa nhóm này.'
    return
  }
  groups.value = groups.value.filter((row) => row.key !== key)
}
function moveBand(index: number, direction: number): void {
  if (!editable.value) return
  const target = index + direction
  const current = bands.value[index]
  const other = bands.value[target]
  if (!current || !other) return
  const next = [...bands.value]
  next[index] = other
  next[target] = current
  bands.value = next
}
function moveGroup(index: number, direction: number): void {
  if (!editable.value) return
  const target = index + direction
  const current = groups.value[index]
  const other = groups.value[target]
  if (!current || !other) return
  const next = [...groups.value]
  next[index] = other
  next[target] = current
  groups.value = next
}

function toggleApplicability(value: CellValue): void {
  if (!editable.value) return
  const nextState: OptionsCellStatesItem =
    value.state === 'NOT_APPLICABLE' ? 'UNCONFIGURED' : 'NOT_APPLICABLE'
  if (!options.value?.cellStates.includes(nextState)) return

  value.state = nextState
  value.amount = ''
}
function changeAmount(value: CellValue, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !editable.value || value.state === 'NOT_APPLICABLE')
    return
  value.amount = target.value
  value.state = value.amount.trim() ? 'PRICED' : 'UNCONFIGURED'
}

function configurationRequest(expectedVersion: number): ReplacePricingConfigurationRequest {
  return {
    expectedVersion,
    timeBands: bands.value.map((band, index) => {
      const range = bandRange(band)
      if (!range) throw new Error('Khung giờ chưa hợp lệ.')
      return {
        ...(band.id ? { id: band.id } : {}),
        name: canonical(band.name),
        ...range,
        sortOrder: index,
      }
    }),
    ticketGroups: groups.value.map((group, index) => ({
      ...(group.id ? { id: group.id } : {}),
      name: canonical(group.name),
      ...(canonical(group.description)
        ? { eligibilityDescription: canonical(group.description) }
        : {}),
      defaultGroup: group.defaultGroup,
      sortOrder: index,
    })),
  }
}

function matrixRequest(expectedVersion: number): ReplaceFareMatrixRequest {
  const cells: CellInput[] = entries.value.map((entry) => {
    const bandId = entry.band.id
    const groupId = entry.group.id
    if (!bandId || !groupId) throw new Error('Chưa xác nhận được ID cấu hình mới.')

    const value = values.value[entry.key] ?? { state: 'UNCONFIGURED', amount: '' }
    const identity = {
      ...entry.scope,
      timeBandId: bandId,
      ticketGroupId: groupId,
      seatType: entry.seatType,
    }

    if (value.state !== 'PRICED') return { ...identity, state: value.state }

    const amount = parseAmount(value.amount)
    if (amount === null) throw new Error('Giá bán chưa hợp lệ.')
    return { ...identity, state: 'PRICED', amount }
  })

  return {
    expectedVersion,
    scopes: scopes.value.map((scope) => ({ ...scope })),
    seatTypes: [...seats.value],
    cells,
  }
}

function resolveDefinitionIds(
  sent: { id?: string; name: string; sortOrder: number }[],
  received: { id: string; name: string; sortOrder: number }[],
): string[] {
  if (sent.length !== received.length) {
    throw new Error('Số lượng cấu hình trả về chưa khớp yêu cầu vừa lưu.')
  }

  return sent.map((item) => {
    const matches = received.filter((row) => row.sortOrder === item.sortOrder)
    const match = matches[0]
    if (
      matches.length !== 1 ||
      !match ||
      canonical(match.name) !== canonical(item.name) ||
      (item.id !== undefined && match.id !== item.id)
    ) {
      throw new Error('Chưa đối chiếu được ID cấu hình vừa lưu. Hãy tải lại.')
    }
    return match.id
  })
}

async function focusError(): Promise<void> {
  await nextTick()
  const target = formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (target) target.focus()
  else statusElement.value?.focus()
}

async function prepareDraft(): Promise<void> {
  if (!policy.value) {
    if (!pendingCreate.value) {
      pendingCreate.value = {
        ...pricingMetadataSchema.parse(metadataValue()),
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
      baselineMetadata.value = metadataKey({
        name: created.name,
        description: created.description,
        dayGroup: created.dayGroup,
        cinemaIds: created.cinemaIds,
      })
      pendingCreate.value = null
    } catch (cause: unknown) {
      const status = pricingErrorStatus(cause)
      if (status !== null && [400, 401, 403, 404, 409, 422].includes(status)) {
        pendingCreate.value = null
      }
      throw cause
    }
  }

  const detail = await actions.loadDetail(context())
  policy.value = detail.policy
  baselineMetadata.value = metadataKey({
    name: detail.policy.name,
    description: detail.policy.description,
    dayGroup: detail.policy.dayGroup,
    cinemaIds: detail.policy.cinemaIds,
  })
  applyMatrix(detail.matrix, detail.matrix.scopes.length === 0)
}

function copiedDefinitionIds<T extends { id: string }>(
  source: T[],
  copied: T[],
  fingerprint: (item: T) => string,
): Map<string, string> {
  const copiedIds = new Map(copied.map((item) => [fingerprint(item), item.id] as const))
  if (source.length !== copied.length || copiedIds.size !== copied.length) {
    throw new Error('Cấu hình bản nháp không khớp phiên bản nguồn. Hãy tải lại danh sách.')
  }
  return new Map(
    source.map((item) => {
      const id = copiedIds.get(fingerprint(item))
      if (!id) throw new Error('Không đối chiếu được cấu hình bản nháp với phiên bản nguồn.')
      return [item.id, id] as const
    }),
  )
}

async function materializeRevision(): Promise<void> {
  const source = savedMatrix.value
  if (!pendingRevision.value || !source || !props.createDraft) {
    throw new Error('Chưa xác định được phiên bản nguồn để tạo bản nháp.')
  }

  const snapshot = {
    metadata: metadataValue(),
    bands: bands.value.map((row) => ({ ...row })),
    groups: groups.value.map((row) => ({ ...row })),
    scopes: scopes.value.map((scope) => ({ ...scope })),
    seats: [...seats.value],
    cells: entries.value.map((entry) => ({
      scope: { ...entry.scope },
      bandKey: entry.band.key,
      groupKey: entry.group.key,
      seatType: entry.seatType,
      value: { ...values.value[entry.key]! },
    })),
    removalAccepted: removalAccepted.value,
  }

  const draft = await props.createDraft()
  if (
    draft.policy.status !== 'DRAFT' ||
    draft.matrix.status !== 'DRAFT' ||
    draft.policy.policyId !== source.policyId ||
    draft.policy.id === source.policyVersionId
  ) {
    throw new Error('Chưa xác nhận được bản nháp mới. Hãy kiểm tra lại danh sách phiên bản.')
  }

  const bandIds = copiedDefinitionIds(source.timeBands, draft.matrix.timeBands, (band) =>
    JSON.stringify([band.name, band.startMinute, band.endMinute, band.sortOrder]),
  )
  const groupIds = copiedDefinitionIds(source.ticketGroups, draft.matrix.ticketGroups, (group) =>
    JSON.stringify([group.name, group.eligibilityDescription, group.defaultGroup, group.sortOrder]),
  )

  const nextBands = snapshot.bands.map((row) => {
    if (!row.id) return row
    const id = bandIds.get(row.id)
    if (!id) throw new Error('Không đối chiếu được ID khung giờ.')
    return { ...row, key: id, id }
  })
  const nextGroups = snapshot.groups.map((row) => {
    if (!row.id) return row
    const id = groupIds.get(row.id)
    if (!id) throw new Error('Không đối chiếu được ID nhóm vé.')
    return { ...row, key: id, id }
  })
  const nextValues = Object.fromEntries(
    snapshot.cells.map((cell) => [
      cellKey(
        cell.scope,
        bandIds.get(cell.bandKey) ?? cell.bandKey,
        groupIds.get(cell.groupKey) ?? cell.groupKey,
        cell.seatType,
      ),
      cell.value,
    ]),
  )

  hydrate(draft)
  Object.assign(metadata, snapshot.metadata)
  bands.value = nextBands
  groups.value = nextGroups
  restoreSelection(snapshot.scopes, snapshot.seats)
  values.value = nextValues
  pendingRevision.value = false
  await nextTick()
  removalAccepted.value = snapshot.removalAccepted
  emit('draftReady', draft.policy.id)
}

async function save(): Promise<void> {
  if (busy.value || requiresReload.value || readOnly.value || !props.canManage) return
  showErrors.value = true
  error.value = ''
  notice.value = ''

  if (issues.value.length) {
    await focusError()
    return
  }

  if (!savedMatrix.value) {
    busy.value = true
    try {
      await prepareDraft()
      notice.value = 'Đã tải bản nháp. Hoàn tất khung giờ, nhóm vé và giá bán rồi lưu bảng giá.'
    } catch (cause: unknown) {
      error.value = pricingErrorMessage(cause)
      if (policy.value && pricingErrorStatus(cause) === 409) requiresReload.value = true
    } finally {
      busy.value = false
    }
    return
  }

  if (needsRemovalReview.value && !removalAccepted.value) {
    error.value = 'Kiểm tra danh sách bị xóa và xác nhận ảnh hưởng trước khi lưu.'
    await nextTick()
    formElement.value?.querySelector<HTMLInputElement>('#pm-removal-confirm')?.focus()
    return
  }

  busy.value = true
  let mutationInFlight = false
  let committed = false

  try {
    if (pendingRevision.value) {
      await materializeRevision()
      committed = true
    }
    let current = policy.value
    if (!current) throw new Error('Chưa xác nhận được bản nháp.')

    const currentContext = context()
    const nextMetadata = pricingMetadataSchema.parse(metadataValue())

    if (metadataKey(nextMetadata) !== baselineMetadata.value) {
      mutationInFlight = true
      current = await actions.metadata.mutateAsync({
        context: currentContext,
        request: { ...nextMetadata, expectedVersion: current.version },
      })
      policy.value = current
      Object.assign(metadata, {
        name: current.name,
        description: current.description,
        dayGroup: current.dayGroup,
        cinemaIds: [...current.cinemaIds],
      })
      baselineMetadata.value = metadataKey(metadataValue())

      const matrix = savedMatrix.value
      if (matrix) {
        savedMatrix.value = {
          ...matrix,
          version: current.version,
          dayGroup: current.dayGroup,
        }
      }

      mutationInFlight = false
      committed = true
    }

    if (definitionsDirty.value) {
      const request = configurationRequest(current.version)
      const oldBands = bands.value.map((band) => band.key)
      const oldGroups = groups.value.map((group) => group.key)
      const selectedScopes = scopes.value.map((scope) => ({ ...scope }))
      const selectedSeats = [...seats.value]
      const pendingCells = entries.value.map((entry) => ({
        scope: { ...entry.scope },
        bandKey: entry.band.key,
        groupKey: entry.group.key,
        seatType: entry.seatType,
        value: { ...(values.value[entry.key] ?? { state: 'UNCONFIGURED', amount: '' }) },
      }))

      mutationInFlight = true
      const response = await actions.configuration.mutateAsync({
        context: currentContext,
        request,
      })

      const bandIds = resolveDefinitionIds(request.timeBands, response.timeBands)
      const groupIds = resolveDefinitionIds(request.ticketGroups, response.ticketGroups)
      const bandMap = new Map<string, string>()
      const groupMap = new Map<string, string>()

      oldBands.forEach((key, index) => {
        const id = bandIds[index]
        if (!id) throw new Error('Thiếu ID khung giờ vừa lưu.')
        bandMap.set(key, id)
      })
      oldGroups.forEach((key, index) => {
        const id = groupIds[index]
        if (!id) throw new Error('Thiếu ID nhóm vé vừa lưu.')
        groupMap.set(key, id)
      })

      applyMatrix(response)
      restoreSelection(selectedScopes, selectedSeats)

      for (const cell of pendingCells) {
        const bandId = bandMap.get(cell.bandKey)
        const groupId = groupMap.get(cell.groupKey)
        if (!bandId || !groupId) throw new Error('Không đối chiếu được ô giá đang nhập.')
        values.value[cellKey(cell.scope, bandId, groupId, cell.seatType)] = cell.value
      }

      current = {
        ...current,
        version: response.version,
        status: response.status,
        dayGroup: response.dayGroup,
      }
      policy.value = current
      mutationInFlight = false
      committed = true
    }

    mutationInFlight = true
    const matrix = await actions.matrix.mutateAsync({
      context: currentContext,
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
    mutationInFlight = false
    committed = true

    notice.value = 'Đã lưu bảng giá.'

    showErrors.value = false
    await nextTick()
    statusElement.value?.focus()
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
    const status = pricingErrorStatus(cause)

    if (status === 409 || (mutationInFlight && status !== 400 && status !== 422)) {
      requiresReload.value = true
    }
    if (committed) {
      notice.value = 'Một phần thay đổi đã được lưu. Kiểm tra thông báo trước khi tiếp tục.'
    }
  } finally {
    busy.value = false
  }
}

const canPublish = computed(() => {
  const current = policy.value
  const matrix = savedMatrix.value
  return (
    editable.value &&
    current?.status === 'DRAFT' &&
    matrix?.status === 'DRAFT' &&
    current.version === matrix.version &&
    !dirty.value &&
    matrix.requiredCellCount > 0 &&
    matrix.coverageComplete
  )
})

const publishHint = computed(() => {
  if (requiresReload.value) return 'Tải lại bảng giá trước khi xuất bản.'
  if (!savedMatrix.value) return 'Khởi tạo và lưu bản nháp trước khi xuất bản.'
  if (dirty.value) return 'Lưu bản nháp trước khi xuất bản.'
  if (!savedMatrix.value.coverageComplete) return 'Hoàn tất và lưu các ô giá trước khi xuất bản.'
  return 'Xuất bản phiên bản đã lưu.'
})

async function publishDraft(): Promise<void> {
  if (!canPublish.value || !policy.value || !savedMatrix.value) return

  showErrors.value = true
  error.value = ''
  notice.value = ''
  if (issues.value.length) {
    await focusError()
    return
  }

  const current = policy.value
  const matrix = savedMatrix.value
  const currentContext = context()
  let publicationStarted = false
  busy.value = true
  publishing.value = true

  try {
    const validation = await actions.validation.mutateAsync(currentContext)
    if (validation.version !== current.version || validation.status !== 'DRAFT') {
      requiresReload.value = true
      throw new Error('Bảng giá đã thay đổi. Hãy tải lại trước khi xuất bản.')
    }

    if (!validation.valid || !validation.canPublish) {
      error.value = [
        'Bản nháp chưa đủ điều kiện xuất bản.',
        ...(validation.missingCellCount > 0
          ? [`Còn ${validation.missingCellCount} ô chưa nhập.`]
          : []),
        ...validation.issues.map((issue) => issue.message),
      ].join(' ')
      return
    }

    publicationStarted = true
    const published = await actions.publication.mutateAsync({
      context: currentContext,
      request: { expectedVersion: current.version },
    })
    policy.value = published
    savedMatrix.value = {
      ...matrix,
      version: published.version,
      status: published.status,
      dayGroup: published.dayGroup,
    }
    showErrors.value = false
    notice.value = 'Đã xuất bản bảng giá. Phiên bản này hiện chỉ xem.'
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
    const status = pricingErrorStatus(cause)
    if (status === 409 || (publicationStarted && status !== 400 && status !== 422)) {
      requiresReload.value = true
    }
    if (publicationStarted && status !== 409 && status !== 400 && status !== 422) {
      notice.value = 'Chưa xác nhận được kết quả xuất bản. Tải lại bảng giá trước khi thử tiếp.'
    }
  } finally {
    publishing.value = false
    busy.value = false
    await nextTick()
    statusElement.value?.focus()
  }
}

async function reload(): Promise<void> {
  if (busy.value || !policy.value || !props.canManage) return
  if (dirty.value && !window.confirm('Bỏ thay đổi chưa lưu và tải lại bảng giá?')) return

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
  if (!(target instanceof HTMLSelectElement) || busy.value || !readOnly.value) return
  const id = target.value
  const selected = visibleVersions.value.find((version) => version.id === id)
  if (!selected) return

  busy.value = true
  error.value = ''
  try {
    const loaded = await actions.loadDetail({
      cinemaId: anchorId.value,
      policyId: selected.policyId,
      versionId: selected.id,
    })
    if (
      props.lookup &&
      (loaded.policy.status !== 'PUBLISHED' || loaded.matrix.status !== 'PUBLISHED')
    ) {
      throw new Error('Phiên bản được chọn chưa được phát hành. Hãy tải lại danh sách.')
    }
    hydrate(loaded)
  } catch (cause: unknown) {
    error.value = pricingErrorMessage(cause)
  } finally {
    busy.value = false
  }
}

function confirmLeave(): boolean {
  if (busy.value) return false
  if (waitingForCreation.value) {
    return window.confirm(
      'Chưa xác định được kết quả tạo nháp. Đóng và kiểm tra danh sách trước khi tạo thêm?',
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
        class="price-dialog pricing-setup"
        @escape-key-down.prevent="close"
        @pointer-down-outside.prevent
        @close-auto-focus="restoreFocus"
      >
        <header class="pricing-dialog__head">
          <div>
            <p class="pricing-eyebrow">
              CHÍNH SÁCH VÉ
              <template v-if="policy"> · PHIÊN BẢN {{ policy.revision }}</template>
            </p>
            <DialogTitle>{{ lookup ? 'Tra cứu giá vé' : 'Thiết lập bảng giá' }}</DialogTitle>
            <p class="pricing-dialog__name">
              {{ metadata.name || 'Bảng giá mới' }}
              <span
                class="pricing-status"
                :class="{
                  'is-draft': pendingRevision || !policy || policy.status === 'DRAFT',
                  'is-published': !pendingRevision && policy?.status === 'PUBLISHED',
                }"
              >
                {{
                  pendingRevision
                    ? 'Chỉnh sửa chưa lưu'
                    : policy?.status === 'PUBLISHED'
                      ? 'Đã phát hành · Chỉ xem'
                      : policy?.status === 'RETIRED'
                        ? 'Ngừng áp dụng · Chỉ xem'
                        : 'Bản nháp'
                }}
              </span>
            </p>
          </div>
          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            :aria-label="lookup ? 'Đóng tra cứu giá vé' : 'Đóng thiết lập bảng giá'"
            :disabled="busy"
            @click="close"
          >
            ×
          </button>
        </header>

        <DialogDescription class="price-visually-hidden">
          {{
            lookup
              ? 'Xem toàn bộ bảng giá đã phát hành theo loại phòng, định dạng, khung giờ, nhóm vé và hạng ghế. Bảng giá chỉ xem.'
              : 'Thiết lập phạm vi, khung giờ, nhóm vé và giá bán theo từng hạng ghế.'
          }}
        </DialogDescription>

        <form
          ref="formElement"
          class="pricing-setup__form"
          novalidate
          :aria-busy="busy"
          @submit.prevent="save"
        >
          <div class="pricing-dialog__content">
            <div ref="statusElement" class="pm-status" tabindex="-1">
              <p v-if="notice" class="price-notice price-notice--info" role="status">
                {{ notice }}
              </p>
              <p v-if="error" class="price-notice price-notice--error" role="alert">{{ error }}</p>
            </div>

            <label v-if="readOnly && visibleVersions.length" class="price-history">
              <span>Phiên bản</span>
              <select
                class="price-control"
                :value="policy?.id"
                :disabled="busy"
                @change="changeVersion"
              >
                <option v-for="version in visibleVersions" :key="version.id" :value="version.id">
                  {{ version.revision }} · {{ pricingLabel(version.status) }}
                </option>
              </select>
            </label>

            <div class="pricing-columns">
              <section class="pricing-card">
                <div class="pricing-card__title">
                  <span class="pricing-step">01</span>
                  <div>
                    <h3>Phạm vi áp dụng</h3>
                    <p>
                      {{
                        lookup
                          ? 'Thông tin áp dụng của phiên bản đang tra cứu.'
                          : 'Thông tin và các tổ hợp cần nhập giá riêng.'
                      }}
                    </p>
                  </div>
                </div>

                <dl v-if="lookup" class="price-detail-grid">
                  <div>
                    <dt>Tên bảng giá</dt>
                    <dd>{{ metadata.name }}</dd>
                  </div>
                  <div>
                    <dt>Loại ngày</dt>
                    <dd>{{ pricingLabel(metadata.dayGroup) }}</dd>
                  </div>
                  <div class="pm-full">
                    <dt>Mô tả</dt>
                    <dd>{{ metadata.description || 'Chưa có mô tả' }}</dd>
                  </div>
                  <div class="pm-full">
                    <dt>Cụm rạp áp dụng</dt>
                    <dd>{{ lookupCinemaNames || 'Chưa cấu hình' }}</dd>
                  </div>
                  <div class="pm-full">
                    <dt>Loại phòng và định dạng</dt>
                    <dd>
                      {{
                        scopes
                          .map(
                            (scope) =>
                              pricingLabel(scope.experienceType) + ' · ' + scope.contentFormat,
                          )
                          .join('; ') || 'Chưa cấu hình'
                      }}
                    </dd>
                  </div>
                  <div class="pm-full">
                    <dt>Hạng ghế</dt>
                    <dd>{{ seats.map(pricingSeatLabel).join(' · ') || 'Chưa cấu hình' }}</dd>
                  </div>
                </dl>

                <div v-else class="pricing-form-grid">
                  <label class="pricing-field">
                    <span>Tên bảng giá *</span>
                    <input
                      v-model="metadata.name"
                      maxlength="120"
                      :disabled="!editable"
                      :aria-invalid="Boolean(fieldError('meta:name'))"
                    />
                    <small class="pricing-field-error">{{ fieldError('meta:name') }}</small>
                  </label>

                  <label class="pricing-field">
                    <span>Loại ngày</span>
                    <select v-model="metadata.dayGroup" :disabled="!editable || dayGroupLocked">
                      <option value="WEEKDAY">Ngày thường</option>
                      <option value="WEEKEND">Cuối tuần</option>
                      <option value="HOLIDAY">Lễ/Tết</option>
                    </select>
                    <small>{{
                      dayGroupLocked
                        ? 'Đã khóa vì có ma trận được lưu.'
                        : 'Chọn bảng giá trực tiếp cho suất chiếu.'
                    }}</small>
                  </label>

                  <label class="pricing-field pm-full">
                    <span>Mô tả</span>
                    <textarea
                      v-model="metadata.description"
                      maxlength="1000"
                      :disabled="!editable"
                      :aria-invalid="Boolean(fieldError('meta:description'))"
                    />
                    <small class="pricing-field-error">{{ fieldError('meta:description') }}</small>
                  </label>

                  <fieldset class="pm-checks pm-full" :disabled="!editable">
                    <legend>Cụm rạp *</legend>
                    <label v-for="cinema in cinemas" :key="cinema.id">
                      <input
                        v-model="metadata.cinemaIds"
                        type="checkbox"
                        :value="cinema.id"
                        :disabled="policy !== null && cinema.id === anchorId"
                      />
                      {{ cinema.name }}
                    </label>
                    <small class="pricing-field-error">{{ fieldError('meta:cinemaIds') }}</small>
                  </fieldset>

                  <fieldset class="pm-checks" :disabled="!editable || !options">
                    <legend>Định dạng *</legend>
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

                  <fieldset class="pm-checks" :disabled="!editable || !options">
                    <legend>Loại phòng *</legend>
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

                  <fieldset class="pm-checks pm-full" :disabled="!editable || !options">
                    <legend>Hạng ghế *</legend>
                    <label v-for="seat in options?.seatTypes ?? []" :key="seat.seatType">
                      <input v-model="seats" type="checkbox" :value="seat.seatType" />
                      {{ pricingSeatLabel(seat.seatType) }}
                    </label>
                    <small class="pricing-field-error">{{ fieldError('scope') }}</small>
                  </fieldset>
                </div>
              </section>

              <section class="pricing-card">
                <div class="pricing-card__title">
                  <span class="pricing-step">02</span>
                  <div>
                    <h3>Khung giờ</h3>
                    <p>Bắt đầu bao gồm, kết thúc loại trừ; 24:00 là cuối ngày.</p>
                  </div>
                </div>

                <dl v-if="lookup" class="price-detail-grid">
                  <div v-for="band in savedMatrix?.timeBands ?? []" :key="band.id" class="pm-full">
                    <dt>{{ band.name }}</dt>
                    <dd>
                      {{ pricingMinuteLabel(band.startMinute) }}–{{
                        pricingMinuteLabel(band.endMinute)
                      }}
                      <span v-if="band.endMinute < band.startMinute" class="price-note">
                        · Qua ngày hôm sau
                      </span>
                    </dd>
                  </div>
                </dl>

                <template v-else>
                  <p v-if="!savedMatrix" class="pm-note">
                    Khởi tạo bản nháp để tải các khung giờ và nhóm vé của phiên bản từ hệ thống.
                  </p>

                  <div class="pricing-config-list">
                    <div v-for="(band, index) in bands" :key="band.key" class="pricing-config-row">
                      <label class="pricing-field">
                        <span>Tên khung giờ</span>
                        <input
                          v-model="band.name"
                          maxlength="120"
                          :disabled="!editable"
                          :aria-invalid="Boolean(fieldError(`band:${band.key}:name`))"
                        />
                        <small class="pricing-field-error">{{
                          fieldError(`band:${band.key}:name`)
                        }}</small>
                      </label>
                      <label class="pricing-field">
                        <span>Bắt đầu</span>
                        <input
                          v-model="band.start"
                          type="time"
                          step="60"
                          :disabled="!editable"
                          :aria-invalid="Boolean(fieldError(`band:${band.key}:time`))"
                        />
                      </label>
                      <label class="pricing-field">
                        <span>Kết thúc</span>
                        <input
                          v-model="band.end"
                          type="text"
                          placeholder="24:00"
                          maxlength="5"
                          :disabled="!editable"
                          :aria-invalid="Boolean(fieldError(`band:${band.key}:time`))"
                        />
                      </label>
                      <div class="pricing-config-actions">
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable || index === 0"
                          :aria-label="`Chuyển ${band.name || 'khung giờ'} lên`"
                          @click="moveBand(index, -1)"
                        >
                          ↑
                        </button>
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable || index === bands.length - 1"
                          :aria-label="`Chuyển ${band.name || 'khung giờ'} xuống`"
                          @click="moveBand(index, 1)"
                        >
                          ↓
                        </button>
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable"
                          :aria-label="`Xóa khung ${band.name}`"
                          @click="removeBand(band.key)"
                        >
                          Xóa
                        </button>
                      </div>
                      <small
                        v-if="fieldError(`band:${band.key}:time`)"
                        class="pricing-field-error pm-full"
                      >
                        {{ fieldError(`band:${band.key}:time`) }}
                      </small>
                    </div>
                  </div>

                  <button
                    class="price-button"
                    type="button"
                    :disabled="!editable || !savedMatrix"
                    @click="addBand"
                  >
                    ＋ Thêm khung giờ
                  </button>
                  <p class="pm-note pm-space">
                    Khung qua nửa đêm được hỗ trợ. Các khung không được chồng lấn.
                  </p>
                  <p class="pricing-field-error">{{ fieldError('bands') }}</p>
                </template>
              </section>

              <section class="pricing-card pm-full">
                <template v-if="!lookup">
                  <div class="pricing-card__title">
                    <span class="pricing-step">03</span>
                    <div>
                      <h3>Nhóm vé và bảng giá</h3>
                      <p>
                        Tên và điều kiện nhóm vé được cấu hình trực tiếp, không suy luận từ tên.
                      </p>
                    </div>
                  </div>

                  <div class="pricing-config-list">
                    <div
                      v-for="(group, index) in groups"
                      :key="group.key"
                      class="pricing-config-row pricing-config-row--group"
                    >
                      <label class="pricing-field">
                        <span>Tên nhóm vé</span>
                        <input
                          v-model="group.name"
                          maxlength="120"
                          :disabled="!editable"
                          :aria-invalid="Boolean(fieldError(`group:${group.key}:name`))"
                        />
                        <small class="pricing-field-error">{{
                          fieldError(`group:${group.key}:name`)
                        }}</small>
                      </label>
                      <label class="pricing-field">
                        <span>Mô tả điều kiện</span>
                        <textarea
                          v-model="group.description"
                          maxlength="1000"
                          :disabled="!editable"
                          :aria-invalid="Boolean(fieldError(`group:${group.key}:description`))"
                        />
                        <small class="pricing-field-error">{{
                          fieldError(`group:${group.key}:description`)
                        }}</small>
                      </label>
                      <label class="pm-default">
                        <input
                          type="radio"
                          name="pm-default-group"
                          :checked="group.defaultGroup"
                          :disabled="!editable"
                          @change="setDefault(group.key)"
                        />
                        Nhóm mặc định
                      </label>
                      <div class="pricing-config-actions">
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable || index === 0"
                          :aria-label="`Chuyển ${group.name || 'nhóm vé'} lên`"
                          @click="moveGroup(index, -1)"
                        >
                          ↑
                        </button>
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable || index === groups.length - 1"
                          :aria-label="`Chuyển ${group.name || 'nhóm vé'} xuống`"
                          @click="moveGroup(index, 1)"
                        >
                          ↓
                        </button>
                        <button
                          class="price-button"
                          type="button"
                          :disabled="!editable"
                          :aria-label="`Xóa nhóm ${group.name}`"
                          @click="removeGroup(group.key)"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    class="price-button"
                    type="button"
                    :disabled="!editable || !savedMatrix"
                    @click="addGroup"
                  >
                    ＋ Thêm nhóm vé
                  </button>
                  <p class="pm-note pm-space">
                    Cần đúng một nhóm mặc định, không có mô tả điều kiện.
                  </p>
                  <p class="pricing-field-error">{{ fieldError('groups') }}</p>
                </template>
                <div v-if="savedMatrix" class="pm-context">
                  <label class="pricing-field">
                    <span>{{
                      readOnly ? 'Loại phòng và định dạng' : 'Loại phòng và định dạng đang nhập'
                    }}</span>
                    <select v-model="activeScopeKey" :disabled="busy">
                      <option
                        v-for="scope in scopes"
                        :key="pricingScopeKey(scope)"
                        :value="pricingScopeKey(scope)"
                      >
                        {{ pricingLabel(scope.experienceType) }} · {{ scope.contentFormat }}
                      </option>
                    </select>
                  </label>
                </div>

                <section
                  v-for="(table, index) in tables"
                  :key="table.band.key"
                  class="pricing-band"
                >
                  <header class="pricing-band__heading">
                    <div>
                      <h3>{{ table.band.name || 'Khung giờ chưa đặt tên' }}</h3>
                      <p>
                        {{ table.band.start || 'Chưa chọn' }}–{{ table.band.end || 'Chưa chọn' }}
                      </p>
                    </div>
                    <div v-if="!lookup" class="pricing-config-actions">
                      <button
                        class="price-button"
                        type="button"
                        :disabled="!editable || index === 0"
                        :aria-label="`Chuyển bảng ${table.band.name} lên`"
                        @click="moveBand(index, -1)"
                      >
                        ↑
                      </button>
                      <button
                        class="price-button"
                        type="button"
                        :disabled="!editable || index === bands.length - 1"
                        :aria-label="`Chuyển bảng ${table.band.name} xuống`"
                        @click="moveBand(index, 1)"
                      >
                        ↓
                      </button>
                      <button
                        class="price-button"
                        type="button"
                        :disabled="!editable"
                        :aria-label="`Xóa bảng ${table.band.name}`"
                        @click="removeBand(table.band.key)"
                      >
                        ×
                      </button>
                    </div>
                  </header>

                  <div
                    class="pricing-table-wrap"
                    role="region"
                    :aria-label="`Bảng giá ${table.band.name}`"
                    tabindex="0"
                  >
                    <table class="pricing-table">
                      <thead>
                        <tr>
                          <th scope="col">Hạng ghế / đơn vị</th>
                          <th v-for="group in groups" :key="group.key" scope="col">
                            {{ group.name || 'Nhóm vé chưa đặt tên' }}
                            <small v-if="group.defaultGroup">Mặc định</small>
                            <small v-if="group.description">{{ group.description }}</small>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in table.rows" :key="row.seatType">
                          <th scope="row">
                            {{ pricingSeatLabel(row.seatType) }}
                            <small v-if="row.option"
                              >/{{ pricingLabel(row.option.unit) }} ·
                              {{ row.option.capacity }} chỗ</small
                            >
                          </th>
                          <td v-for="cell in row.cells" :key="cell.key">
                            <div class="pricing-money-input">
                              <input
                                type="text"
                                inputmode="decimal"
                                maxlength="24"
                                :placeholder="
                                  cell.value.state === 'NOT_APPLICABLE'
                                    ? 'Không áp dụng'
                                    : 'Nhập giá'
                                "
                                :value="cell.value.amount"
                                :disabled="!editable || cell.value.state === 'NOT_APPLICABLE'"
                                :aria-invalid="Boolean(fieldError(cell.key))"
                                :aria-describedby="
                                  fieldError(cell.key) ? `pm-cell-error-${cell.key}` : undefined
                                "
                                :aria-label="`Giá ${pricingSeatLabel(row.seatType)}, ${cell.group.name}, ${table.band.name}`"
                                @input="changeAmount(cell.value, $event)"
                              />
                              <span>đ/{{ row.option?.unit === 'PAIR' ? 'cặp' : 'ghế' }}</span>
                            </div>
                            <button
                              v-if="!readOnly"
                              class="price-button price-button--small pm-space"
                              type="button"
                              :disabled="!editable"
                              :aria-label="`${cell.value.state === 'NOT_APPLICABLE' ? 'Cho phép nhập giá' : 'Không áp dụng giá'} ${pricingSeatLabel(row.seatType)}, ${cell.group.name}, ${table.band.name}`"
                              @click="toggleApplicability(cell.value)"
                            >
                              {{
                                cell.value.state === 'NOT_APPLICABLE' ? 'Nhập giá' : 'Không áp dụng'
                              }}
                            </button>
                            <p :id="`pm-cell-error-${cell.key}`" class="pricing-field-error">
                              {{ fieldError(cell.key) }}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <div class="pricing-legend">
                  <span><i />Chưa nhập giá</span>
                  <span><i class="is-na" />Không áp dụng</span>
                  <span><i class="is-zero" />0đ là giá hợp lệ</span>
                </div>

                <div
                  v-if="needsRemovalReview && !readOnly"
                  class="pm-removal"
                  role="region"
                  aria-label="Ảnh hưởng khi lưu"
                >
                  <strong>Kiểm tra trước khi lưu</strong>
                  <p>
                    Khung giờ bị xóa:
                    {{ removedBands.map((item) => item.name).join(', ') || 'Không có' }}.
                  </p>
                  <p>
                    Nhóm vé bị xóa:
                    {{ removedGroups.map((item) => item.name).join(', ') || 'Không có' }}.
                  </p>
                  <p v-if="removedScopes.length">
                    Bỏ phạm vi:
                    {{
                      removedScopes
                        .map(
                          (item) => `${pricingLabel(item.experienceType)} · ${item.contentFormat}`,
                        )
                        .join(', ')
                    }}.
                  </p>
                  <p v-if="removedSeats.length">
                    Bỏ hạng ghế: {{ removedSeats.map(pricingSeatLabel).join(', ') }}.
                  </p>
                  <p>
                    {{ affectedCells.length }} ô hiện có bị loại bỏ, gồm
                    {{ affectedCells.filter((cell) => cell.state === 'PRICED').length }} ô có giá.
                    Mỗi ô chỉ được tính một lần.
                  </p>
                  <label class="pm-confirm">
                    <input
                      id="pm-removal-confirm"
                      v-model="removalAccepted"
                      type="checkbox"
                      :disabled="!editable"
                    />
                    Tôi đã kiểm tra các mục bị xóa và ảnh hưởng tới ô giá.
                  </label>
                </div>

                <div v-if="showErrors && issues.length" class="pm-error-summary" role="alert">
                  <p
                    v-for="message in [...new Set(issues.map((issue) => issue.message))]"
                    :key="message"
                  >
                    {{ message }}
                  </p>
                </div>
              </section>
            </div>
          </div>

          <footer class="pricing-dialog__foot">
            <span v-if="readOnly">Phiên bản chỉ xem</span>
            <span v-else>{{ publishHint }}</span>
            <div>
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
                v-if="!readOnly"
                class="price-button"
                type="submit"
                :disabled="busy || requiresReload || !canManage || (savedMatrix !== null && !dirty)"
              >
                {{
                  busy && !publishing
                    ? 'Đang lưu…'
                    : waitingForCreation
                      ? 'Thử lại cùng yêu cầu'
                      : !savedMatrix
                        ? policy
                          ? 'Tải cấu hình nháp'
                          : 'Khởi tạo bản nháp'
                        : 'Lưu nháp'
                }}
              </button>
              <button
                v-if="!readOnly"
                class="price-button price-button--primary"
                type="button"
                :disabled="!canPublish"
                :title="publishHint"
                @click="publishDraft"
              >
                {{ publishing ? 'Đang xuất bản…' : 'Xuất bản' }}
              </button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
