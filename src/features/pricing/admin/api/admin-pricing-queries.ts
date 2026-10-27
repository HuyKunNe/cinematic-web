import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { getManagedCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import {
  create4,
  get1,
  listLatest,
  listVersions,
  replaceDraft,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import {
  get2,
  replace1,
} from '@/services/api/generated/inventory-service/fare-matrix-controller/fare-matrix-controller'
import {
  publish,
  validate,
} from '@/services/api/generated/inventory-service/pricing-policy-publication-controller/pricing-policy-publication-controller'
import {
  CinemaPricingPolicyVersionResponseDayGroup,
  CinemaPricingPolicyVersionResponseStatus,
  OptionsCellStatesItem,
  OptionsContentFormatsItem,
  OptionsExperienceTypesItem,
  OptionsTicketCategoriesItem,
  OptionsTimeBandsItem,
  SeatTypeOptionSeatType,
  SeatTypeOptionUnit,
  type CellInput,
  type CreateCinemaPricingPolicyRequest,
  type PublishPricingPolicyRequest,
  type ReplaceFareMatrixRequest,
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
  timeBand: z.nativeEnum(OptionsTimeBandsItem),
  ticketCategory: z.nativeEnum(OptionsTicketCategoriesItem),
  seatType: z.nativeEnum(SeatTypeOptionSeatType),
})

const cellSchema = cellReferenceSchema.extend({
  state: z.nativeEnum(OptionsCellStatesItem),
  amount: z.number().finite().nonnegative().nullish(),
  unit: z.nativeEnum(SeatTypeOptionUnit),
})

const matrixSchema = z.object({
  policyId: uuid,
  policyVersionId: uuid,
  revision: z.number().int().positive(),
  version: counter,
  dayGroup: z.nativeEnum(CinemaPricingPolicyVersionResponseDayGroup),
  status: z.nativeEnum(CinemaPricingPolicyVersionResponseStatus),
  scopes: z.array(scopeSchema),
  ticketCategories: z.array(z.nativeEnum(OptionsTicketCategoriesItem)),
  seatTypes: z.array(z.nativeEnum(SeatTypeOptionSeatType)),
  requiredCellCount: counter,
  configuredCellCount: counter,
  missingCellCount: counter,
  coverageComplete: z.boolean(),
  cells: z.array(cellSchema),
  options: z.object({
    experienceTypes: z.array(z.nativeEnum(OptionsExperienceTypesItem)).min(1),
    contentFormats: z.array(z.nativeEnum(OptionsContentFormatsItem)).min(1),
    timeBands: z.array(z.nativeEnum(OptionsTimeBandsItem)).min(1),
    ticketCategories: z.array(z.nativeEnum(OptionsTicketCategoriesItem)).min(1),
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
export type PricingMatrix = z.infer<typeof matrixSchema>
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
  'experienceType' | 'contentFormat' | 'timeBand' | 'ticketCategory' | 'seatType'
>

export function pricingCellKey(value: CellIdentity): string {
  return JSON.stringify([
    value.experienceType,
    value.contentFormat,
    value.timeBand,
    value.ticketCategory,
    value.seatType,
  ])
}

export function pricingScopeKey(value: {
  experienceType: OptionsExperienceTypesItem
  contentFormat: OptionsContentFormatsItem
}): string {
  return JSON.stringify([value.experienceType, value.contentFormat])
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
  BEFORE_17: 'Trước 17:00',
  FROM_17: 'Từ 17:00',
  ADULT: 'Người lớn',
  SENIOR_55_PLUS: 'Người cao tuổi từ 55 tuổi',
  STUDENT_U22: 'Học sinh, sinh viên dưới 22 tuổi',
  CHILD: 'Trẻ em',
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
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }

  return null
}

export function pricingErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu phản hồi không đúng contract hiện tại. Hãy tải lại trước khi tiếp tục.'
  }

  const status = pricingErrorStatus(error)

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền quản lý bảng giá.'
  if (status === 404) return 'Không tìm thấy cụm rạp, bảng giá hoặc phiên bản được yêu cầu.'
  if (status === 409) {
    return 'Bảng giá đã thay đổi hoặc chưa đủ điều kiện công bố. Hãy tải lại và kiểm tra.'
  }
  if (status === 400 || status === 422) {
    return 'Backend từ chối dữ liệu. Kiểm tra phạm vi, ô giá và quy tắc giá dùng chung.'
  }

  if (error instanceof Error) return error.message

  return 'Chưa xác định được kết quả yêu cầu. Hãy tải lại dữ liệu trước khi gửi tiếp.'
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

function requireMatrixContext(matrix: PricingMatrix, context: PricingContext): void {
  if (matrix.policyId !== context.policyId || matrix.policyVersionId !== context.versionId) {
    throw new Error('Ma trận phản hồi không thuộc phiên bản đang mở.')
  }

  unique(matrix.scopes, pricingScopeKey)
  unique(matrix.ticketCategories, (item) => item)
  unique(matrix.seatTypes, (item) => item)
  unique(matrix.cells, pricingCellKey)

  if (
    matrix.requiredCellCount !== matrix.cells.length ||
    matrix.configuredCellCount + matrix.missingCellCount !== matrix.requiredCellCount
  ) {
    throw new Error('Số lượng ô giá phản hồi không nhất quán.')
  }

  for (const cell of matrix.cells) {
    if (
      (cell.state === 'PRICED' && cell.amount == null) ||
      (cell.state !== 'PRICED' && cell.amount != null)
    ) {
      throw new Error('Trạng thái và số tiền của ô giá không nhất quán.')
    }
  }
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
    get1(context.cinemaId, context.policyId, context.versionId),
    get2(context.cinemaId, context.policyId, context.versionId),
  ])

  const policy = pricingPolicySchema.parse(policyResponse)
  const matrix = matrixSchema.parse(matrixResponse)

  requirePolicyContext(policy, context)
  requireMatrixContext(matrix, context)

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
      const requestedCinemaId = uuid.parse(queryKey[3])
      return parsePolicies(await listLatest(requestedCinemaId), requestedCinemaId)
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
      const requestedCinemaId = uuid.parse(queryKey[3])
      const requestedPolicyId = uuid.parse(queryKey[4])

      return parsePolicies(
        await listVersions(requestedCinemaId, requestedPolicyId),
        requestedCinemaId,
        requestedPolicyId,
      )
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

  const create = useMutation({
    retry: false,
    mutationFn: async (input: { cinemaId: string; request: CreateCinemaPricingPolicyRequest }) => {
      requireAccess()
      uuid.parse(input.cinemaId)
      const result = pricingPolicySchema.parse(await create4(input.cinemaId, input.request))

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
        await replaceDraft(
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

  const matrix = useMutation({
    retry: false,
    mutationFn: async (input: { context: PricingContext; request: ReplaceFareMatrixRequest }) => {
      requireAccess()
      requireContext(input.context)

      const result = matrixSchema.parse(
        await replace1(
          input.context.cinemaId,
          input.context.policyId,
          input.context.versionId,
          input.request,
        ),
      )

      requireMatrixContext(result, input.context)

      if (result.status !== 'DRAFT' || result.version < input.request.expectedVersion) {
        throw new Error('Chưa xác nhận được ma trận bản nháp vừa lưu.')
      }

      return result
    },
    onSuccess: invalidate,
  })

  const validation = useMutation({
    retry: false,
    mutationFn: async (context: PricingContext) => {
      requireAccess()
      requireContext(context)

      const result = validationSchema.parse(
        await validate(context.cinemaId, context.policyId, context.versionId),
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
        await publish(
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

  return { create, metadata, matrix, validation, publication, loadDetail }
}
