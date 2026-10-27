import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { getManagedCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  createCinemaPricingPolicy,
  getCinemaPricingPolicyVersion,
  listLatestCinemaPricingPolicies,
  listCinemaPricingPolicyVersions,
  replaceCinemaPricingPolicyDraft,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import {
  getPricingFareMatrix,
  replacePricingFareMatrix,
} from '@/services/api/generated/inventory-service/fare-matrix-controller/fare-matrix-controller'
import { replacePricingPolicyConfiguration } from '@/services/api/generated/inventory-service/pricing-policy-configuration-controller/pricing-policy-configuration-controller'
import {
  publishPricingPolicyVersion,
  validatePricingPolicyFareMatrix,
} from '@/services/api/generated/inventory-service/pricing-policy-publication-controller/pricing-policy-publication-controller'
import {
  CinemaPricingPolicyVersionResponseDayGroup,
  CinemaPricingPolicyVersionResponseStatus,
  OptionsCellStatesItem,
  OptionsContentFormatsItem,
  OptionsExperienceTypesItem,
  SeatTypeOptionSeatType,
  SeatTypeOptionUnit,
  type CellInput,
  type CreateCinemaPricingPolicyRequest,
  type FareMatrixResponse,
  type PublishPricingPolicyRequest,
  type ReplaceFareMatrixRequest,
  type ReplacePricingConfigurationRequest,
  type ReplacePricingPolicyDraftRequest,
} from '@/services/api/generated/inventory-service/model'

const uuid = z.string().uuid()
const counter = z.number().int().nonnegative()

const cinemaSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1),
  active: z.boolean(),
})

export const pricingMetadataSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên bảng giá.').max(120),
  description: z.string().trim().max(1000).default(''),
  dayGroup: z.nativeEnum(CinemaPricingPolicyVersionResponseDayGroup),
  cinemaIds: z
    .array(uuid)
    .min(1, 'Chọn ít nhất một cụm rạp.')
    .refine((items) => new Set(items).size === items.length, 'Cụm rạp bị trùng.'),
})

export const pricingPolicySchema = z.object({
  id: uuid,
  policyId: uuid,
  cinemaIds: z.array(uuid).min(1),
  revision: z.number().int().positive(),
  name: z.string().trim().min(1),
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  dayGroup: z.nativeEnum(CinemaPricingPolicyVersionResponseDayGroup),
  status: z.nativeEnum(CinemaPricingPolicyVersionResponseStatus),
  version: counter,
  publishedAt: z.string().nullish(),
  publishedBy: z.string().nullish(),
})

const scopeSchema = z.object({
  experienceType: z.nativeEnum(OptionsExperienceTypesItem),
  contentFormat: z.nativeEnum(OptionsContentFormatsItem),
})

const cellReferenceSchema = scopeSchema.extend({
  timeBandId: uuid,
  ticketGroupId: uuid,
  seatType: z.nativeEnum(SeatTypeOptionSeatType),
})

export const pricingCellSchema = cellReferenceSchema.extend({
  state: z.nativeEnum(OptionsCellStatesItem),
  amount: z
    .number()
    .finite()
    .nonnegative()
    .nullish()
    .transform((value) => value ?? undefined),
  unit: z.nativeEnum(SeatTypeOptionUnit),
})

const timeBandSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(120),
  startMinute: counter.max(1439),
  endMinute: counter.max(1440),
  sortOrder: counter,
})

const ticketGroupSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(120),
  eligibilityDescription: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  defaultGroup: z.boolean(),
  sortOrder: counter,
})

function definitionOrder(
  first: { sortOrder: number; id: string },
  second: { sortOrder: number; id: string },
): number {
  return first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
}

export const pricingMatrixSchema = z.object({
  policyId: uuid,
  policyVersionId: uuid,
  revision: z.number().int().positive(),
  version: counter,
  dayGroup: z.nativeEnum(CinemaPricingPolicyVersionResponseDayGroup),
  status: z.nativeEnum(CinemaPricingPolicyVersionResponseStatus),
  scopes: z.array(scopeSchema),
  timeBands: z
    .array(timeBandSchema)
    .min(1)
    .transform((items) => [...items].sort(definitionOrder)),
  ticketGroups: z
    .array(ticketGroupSchema)
    .min(1)
    .transform((items) => [...items].sort(definitionOrder)),
  defaultTicketGroupId: uuid,
  seatTypes: z.array(z.nativeEnum(SeatTypeOptionSeatType)),
  requiredCellCount: counter,
  configuredCellCount: counter,
  missingCellCount: counter,
  coverageComplete: z.boolean(),
  cells: z.array(pricingCellSchema),
  options: z.object({
    experienceTypes: z.array(z.nativeEnum(OptionsExperienceTypesItem)).min(1),
    contentFormats: z.array(z.nativeEnum(OptionsContentFormatsItem)).min(1),
    seatTypes: z
      .array(
        z.object({
          seatType: z.nativeEnum(SeatTypeOptionSeatType),
          unit: z.nativeEnum(SeatTypeOptionUnit),
          capacity: z.number().int().positive(),
        }),
      )
      .min(1),
    cellStates: z.array(z.nativeEnum(OptionsCellStatesItem)).min(1),
  }),
})

const validationSchema = z.object({
  policyId: uuid,
  policyVersionId: uuid,
  revision: z.number().int().positive(),
  version: counter,
  status: z.nativeEnum(CinemaPricingPolicyVersionResponseStatus),
  valid: z.boolean(),
  canPublish: z.boolean(),
  requiredCellCount: counter,
  configuredCellCount: counter,
  missingCellCount: counter,
  issues: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      scope: scopeSchema.nullish(),
      cell: cellReferenceSchema.nullish(),
    }),
  ),
})

export type PricingCinema = z.infer<typeof cinemaSchema>
export type PricingMetadata = z.infer<typeof pricingMetadataSchema>
export type PricingPolicy = z.infer<typeof pricingPolicySchema>
export type PricingMatrix = z.infer<typeof pricingMatrixSchema>
export type PricingValidation = z.infer<typeof validationSchema>

export type PricingContext = {
  cinemaId: string
  policyId: string
  versionId: string
}

export type PricingDetail = {
  policy: PricingPolicy
  matrix: PricingMatrix
}

type CellIdentity = Pick<
  CellInput,
  'experienceType' | 'contentFormat' | 'timeBandId' | 'ticketGroupId' | 'seatType'
>

export function pricingCellKey(value: CellIdentity): string {
  return JSON.stringify([
    value.experienceType,
    value.contentFormat,
    value.timeBandId,
    value.ticketGroupId,
    value.seatType,
  ])
}

export function pricingScopeKey(value: {
  experienceType: OptionsExperienceTypesItem
  contentFormat: OptionsContentFormatsItem
}): string {
  return JSON.stringify([value.experienceType, value.contentFormat])
}

export function pricingMinuteLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

export function pricingContainsMinute(
  band: { startMinute: number; endMinute: number },
  minute: number,
): boolean {
  return band.endMinute > band.startMinute
    ? minute >= band.startMinute && minute < band.endMinute
    : minute >= band.startMinute || minute < band.endMinute
}

const labels: Record<string, string> = {
  WEEKDAY: 'Ngày thường',
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Lễ, Tết',
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã công bố',
  RETIRED: 'Ngừng áp dụng',
  STANDARD: 'Tiêu chuẩn',
  PREMIUM_CINEMA: 'Rạp cao cấp',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  SCREEN_X: 'ScreenX',
  VIP: 'Ghế VIP',
  COUPLE: 'Ghế đôi',
  ACCESSIBLE: 'Ghế hỗ trợ tiếp cận',
  UNCONFIGURED: 'Chưa nhập',
  PRICED: 'Có giá bán',
  NOT_APPLICABLE: 'Không áp dụng',
  SEAT: 'mỗi ghế',
  PAIR: 'cả cặp',
}

export function pricingLabel(code: string): string {
  return labels[code] ?? code
}

export function pricingSeatLabel(code: SeatTypeOptionSeatType): string {
  return code === 'STANDARD' ? 'Ghế thường' : pricingLabel(code)
}

export function pricingErrorStatus(error: unknown): number | null {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : null
}

export function pricingErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu phản hồi không đúng contract hiện tại. Hãy tải lại trước khi tiếp tục.'
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'INVENTORY_PRICING_MATRIX_DAY_GROUP_LOCKED'
  ) {
    return 'Loại ngày đã bị khóa vì bảng giá có ma trận được lưu. Hãy tải lại dữ liệu.'
  }

  const status = pricingErrorStatus(error)

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền quản lý bảng giá.'
  if (status === 404) return 'Không tìm thấy cụm rạp, bảng giá hoặc phiên bản được yêu cầu.'
  if (status === 409) {
    return 'Bảng giá đã thay đổi hoặc không còn cho phép thao tác này. Hãy tải lại để kiểm tra; thay đổi chưa lưu chưa được ghi đè lên máy chủ.'
  }
  if (status === 400 || status === 422) {
    return 'Backend từ chối dữ liệu. Kiểm tra cấu hình, ô giá và quy tắc giá dùng chung.'
  }
  if (error instanceof Error) return error.message

  return 'Chưa xác định được kết quả yêu cầu. Hãy tải lại trước khi gửi tiếp.'
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  if (new Set(items.map(key)).size !== items.length) {
    throw new Error('Dữ liệu phản hồi chứa mã trùng.')
  }

  return items
}

function requireContext(context: PricingContext): void {
  uuid.parse(context.cinemaId)
  uuid.parse(context.policyId)
  uuid.parse(context.versionId)
}

function requirePolicyContext(policy: PricingPolicy, context: PricingContext): void {
  if (
    policy.id !== context.versionId ||
    policy.policyId !== context.policyId ||
    !policy.cinemaIds.includes(context.cinemaId)
  ) {
    throw new Error('Phiên bản phản hồi không thuộc bảng giá hoặc cụm rạp đang mở.')
  }
}

function parseMatrix(response: unknown, context: PricingContext): PricingMatrix {
  const matrix = pricingMatrixSchema.parse(response) satisfies FareMatrixResponse

  if (matrix.policyId !== context.policyId || matrix.policyVersionId !== context.versionId) {
    throw new Error('Ma trận phản hồi không thuộc phiên bản đang mở.')
  }

  unique(matrix.scopes, pricingScopeKey)
  unique(matrix.timeBands, (item) => item.id)
  unique(matrix.ticketGroups, (item) => item.id)
  unique(matrix.seatTypes, (item) => item)
  unique(matrix.cells, pricingCellKey)

  const defaults = matrix.ticketGroups.filter((item) => item.defaultGroup)
  const defaultGroup = defaults[0]

  if (
    defaults.length !== 1 ||
    !defaultGroup ||
    defaultGroup.id !== matrix.defaultTicketGroupId ||
    defaultGroup.eligibilityDescription.trim() !== ''
  ) {
    throw new Error('Nhóm vé mặc định trong phản hồi chưa nhất quán.')
  }

  const occupied = new Set<number>()

  for (const band of matrix.timeBands) {
    if (band.startMinute === band.endMinute) {
      throw new Error('Khung giờ phản hồi có điểm bắt đầu và kết thúc trùng nhau.')
    }

    for (let minute = 0; minute < 1440; minute++) {
      if (!pricingContainsMinute(band, minute)) continue
      if (occupied.has(minute)) throw new Error('Khung giờ phản hồi bị chồng lấn.')
      occupied.add(minute)
    }
  }

  const expectedCount =
    matrix.scopes.length *
    matrix.timeBands.length *
    matrix.ticketGroups.length *
    matrix.seatTypes.length

  const configured = matrix.cells.filter((cell) => cell.state !== 'UNCONFIGURED').length

  if (
    matrix.requiredCellCount !== expectedCount ||
    matrix.cells.length !== expectedCount ||
    matrix.configuredCellCount !== configured ||
    matrix.missingCellCount !== expectedCount - configured ||
    matrix.coverageComplete !== (expectedCount > 0 && configured === expectedCount)
  ) {
    throw new Error('Số lượng và mức độ hoàn chỉnh của ma trận chưa nhất quán.')
  }

  for (const cell of matrix.cells) {
    const seat = matrix.options.seatTypes.find((item) => item.seatType === cell.seatType)

    if (
      !matrix.scopes.some((item) => pricingScopeKey(item) === pricingScopeKey(cell)) ||
      !matrix.timeBands.some((item) => item.id === cell.timeBandId) ||
      !matrix.ticketGroups.some((item) => item.id === cell.ticketGroupId) ||
      !matrix.seatTypes.some((item) => item === cell.seatType) ||
      !seat ||
      seat.unit !== cell.unit ||
      (cell.state === 'PRICED' && cell.amount == null) ||
      (cell.state !== 'PRICED' && cell.amount != null)
    ) {
      throw new Error('Ô giá phản hồi không khớp cấu hình hoặc trạng thái.')
    }
  }

  return matrix
}

function parsePolicies(response: unknown, cinemaId: string, policyId?: string): PricingPolicy[] {
  const items = unique(z.array(pricingPolicySchema).parse(response), (item) => item.id)

  if (
    items.some(
      (item) =>
        !item.cinemaIds.includes(cinemaId) ||
        (policyId !== undefined && item.policyId !== policyId),
    )
  ) {
    throw new Error('Danh sách bảng giá không thuộc phạm vi đang chọn.')
  }

  unique(items, (item) => (policyId === undefined ? item.policyId : String(item.revision)))
  return [...items].sort((first, second) => second.revision - first.revision)
}

async function readDetail(context: PricingContext): Promise<PricingDetail> {
  requireContext(context)

  const [policyResponse, matrixResponse] = await Promise.all([
    getCinemaPricingPolicyVersion(context.cinemaId, context.policyId, context.versionId),
    getPricingFareMatrix(context.cinemaId, context.policyId, context.versionId),
  ])

  const policy = pricingPolicySchema.parse(policyResponse)
  const matrix = parseMatrix(matrixResponse, context)

  requirePolicyContext(policy, context)

  if (
    policy.version !== matrix.version ||
    policy.revision !== matrix.revision ||
    policy.status !== matrix.status ||
    policy.dayGroup !== matrix.dayGroup
  ) {
    throw new Error('Bảng giá thay đổi trong lúc tải. Hãy tải lại để lấy cùng một phiên bản.')
  }

  return { policy, matrix }
}

const queryOptions = {
  retry: false,
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const

function detailKey(context: PricingContext) {
  return [
    'pricing',
    'admin',
    'detail',
    context.cinemaId,
    context.policyId,
    context.versionId,
  ] as const
}

export function useAdminPricingQueries(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
  policyId: MaybeRefOrGetter<string>,
  versionId: MaybeRefOrGetter<string>,
) {
  function requireAccess(): void {
    if (!toValue(enabled)) throw new Error('Không có quyền tải bảng giá.')
  }

  const cinemas = useQuery({
    ...queryOptions,
    queryKey: ['pricing', 'admin', 'cinemas'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () => {
      requireAccess()
      return unique(z.array(cinemaSchema).parse(await getManagedCinemas()), (item) => item.id)
    },
  })

  const policies = useQuery({
    ...queryOptions,
    queryKey: computed(() => ['pricing', 'admin', 'policies', toValue(cinemaId)] as const),
    enabled: computed(() => toValue(enabled) && uuid.safeParse(toValue(cinemaId)).success),
    queryFn: async ({ queryKey }) => {
      requireAccess()
      const id = uuid.parse(queryKey[3])
      return parsePolicies(await listLatestCinemaPricingPolicies(id), id)
    },
  })

  const versions = useQuery({
    ...queryOptions,
    queryKey: computed(
      () => ['pricing', 'admin', 'versions', toValue(cinemaId), toValue(policyId)] as const,
    ),
    enabled: computed(
      () =>
        toValue(enabled) &&
        uuid.safeParse(toValue(cinemaId)).success &&
        uuid.safeParse(toValue(policyId)).success,
    ),
    queryFn: async ({ queryKey }) => {
      requireAccess()
      const cinema = uuid.parse(queryKey[3])
      const policy = uuid.parse(queryKey[4])
      return parsePolicies(await listCinemaPricingPolicyVersions(cinema, policy), cinema, policy)
    },
  })

  const detail = useQuery({
    ...queryOptions,
    queryKey: computed(() =>
      detailKey({
        cinemaId: toValue(cinemaId),
        policyId: toValue(policyId),
        versionId: toValue(versionId),
      }),
    ),
    enabled: computed(
      () =>
        toValue(enabled) &&
        [toValue(cinemaId), toValue(policyId), toValue(versionId)].every(
          (value) => uuid.safeParse(value).success,
        ),
    ),
    queryFn: ({ queryKey }) => {
      requireAccess()
      return readDetail({
        cinemaId: queryKey[3],
        policyId: queryKey[4],
        versionId: queryKey[5],
      })
    },
  })

  return { cinemas, policies, versions, detail }
}

export function useAdminPricingActions(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()

  function requireAccess(): void {
    if (!toValue(enabled)) throw new Error('Không có quyền thực hiện thao tác này.')
  }

  function invalidate(): void {
    void queryClient
      .invalidateQueries({
        queryKey: ['pricing', 'admin'],
        refetchType: 'none',
      })
      .catch(() => undefined)
  }

  function draftMatrix(
    response: unknown,
    context: PricingContext,
    expectedVersion: number,
  ): PricingMatrix {
    const result = parseMatrix(response, context)

    if (result.status !== 'DRAFT' || result.version < expectedVersion) {
      throw new Error('Chưa xác nhận được dữ liệu bản nháp vừa lưu.')
    }

    return result
  }

  const create = useMutation({
    retry: false,
    mutationFn: async (input: { cinemaId: string; request: CreateCinemaPricingPolicyRequest }) => {
      requireAccess()
      uuid.parse(input.cinemaId)

      const result = pricingPolicySchema.parse(
        await createCinemaPricingPolicy(input.cinemaId, input.request),
      )

      if (!result.cinemaIds.includes(input.cinemaId)) {
        throw new Error('Bản nháp phản hồi không thuộc cụm rạp đã chọn.')
      }

      return result
    },
    onSuccess: invalidate,
  })

  const metadata = useMutation({
    retry: false,
    mutationFn: async (input: {
      context: PricingContext
      request: ReplacePricingPolicyDraftRequest
    }) => {
      requireAccess()
      requireContext(input.context)

      const result = pricingPolicySchema.parse(
        await replaceCinemaPricingPolicyDraft(
          input.context.cinemaId,
          input.context.policyId,
          input.context.versionId,
          input.request,
        ),
      )

      requirePolicyContext(result, input.context)

      if (result.status !== 'DRAFT' || result.version < input.request.expectedVersion) {
        throw new Error('Chưa xác nhận được metadata bản nháp vừa lưu.')
      }

      return result
    },
    onSuccess: invalidate,
  })

  const configuration = useMutation({
    retry: false,
    mutationFn: async (input: {
      context: PricingContext
      request: ReplacePricingConfigurationRequest
    }) => {
      requireAccess()
      requireContext(input.context)

      return draftMatrix(
        await replacePricingPolicyConfiguration(
          input.context.cinemaId,
          input.context.policyId,
          input.context.versionId,
          input.request,
        ),
        input.context,
        input.request.expectedVersion,
      )
    },
    onSuccess: invalidate,
  })

  const matrix = useMutation({
    retry: false,
    mutationFn: async (input: { context: PricingContext; request: ReplaceFareMatrixRequest }) => {
      requireAccess()
      requireContext(input.context)

      return draftMatrix(
        await replacePricingFareMatrix(
          input.context.cinemaId,
          input.context.policyId,
          input.context.versionId,
          input.request,
        ),
        input.context,
        input.request.expectedVersion,
      )
    },
    onSuccess: invalidate,
  })

  const validation = useMutation({
    retry: false,
    mutationFn: async (context: PricingContext) => {
      requireAccess()
      requireContext(context)

      const result = validationSchema.parse(
        await validatePricingPolicyFareMatrix(
          context.cinemaId,
          context.policyId,
          context.versionId,
        ),
      )

      if (result.policyId !== context.policyId || result.policyVersionId !== context.versionId) {
        throw new Error('Kết quả kiểm tra không thuộc phiên bản đang mở.')
      }

      return result
    },
  })

  const publication = useMutation({
    retry: false,
    mutationFn: async (input: {
      context: PricingContext
      request: PublishPricingPolicyRequest
    }) => {
      requireAccess()
      requireContext(input.context)

      const result = pricingPolicySchema.parse(
        await publishPricingPolicyVersion(
          input.context.cinemaId,
          input.context.policyId,
          input.context.versionId,
          input.request,
        ),
      )

      requirePolicyContext(result, input.context)

      if (result.status !== 'PUBLISHED') {
        throw new Error('Chưa xác nhận được trạng thái công bố của bảng giá.')
      }

      return result
    },
    onSuccess: invalidate,
  })

  async function loadDetail(context: PricingContext): Promise<PricingDetail> {
    requireAccess()

    return queryClient.fetchQuery({
      queryKey: detailKey(context),
      queryFn: () => {
        requireAccess()
        return readDetail(context)
      },
      staleTime: 0,
      retry: false,
    })
  }

  return {
    create,
    metadata,
    configuration,
    matrix,
    validation,
    publication,
    loadDetail,
  }
}
