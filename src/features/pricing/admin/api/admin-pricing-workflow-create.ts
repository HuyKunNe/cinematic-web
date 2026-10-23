import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  createCinemaPricingPolicyDraft,
  replaceCinemaPricingTicketCategories,
  replaceCinemaPricingSeatTypes,
  replaceCinemaFareSurcharges,
  replaceCinemaPricingPolicyFareMatrix,
  replaceCinemaPricingSaleScopes,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { FareRuleInputContentFormat } from '@/services/api/generated/inventory-service/model/fareRuleInputContentFormat'
import type { FareRuleInput } from '@/services/api/generated/inventory-service/model/fareRuleInput'
import type { ReplaceCinemaFareMatrixRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaFareMatrixRequest'
import type { ReplaceCinemaPricingSaleScopesRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaPricingSaleScopesRequest'
import { normalizeFareAmount } from './admin-pricing-fare-edit'

export const NEW_PRICE_FORMATS = Object.values(FareRuleInputContentFormat)

export type NewPriceFormat = FareRuleInputContentFormat

export const NEW_PRICE_ROWS = [
  {
    code: 'WEEKDAY_BEFORE_17',
    dayGroupCode: 'WEEKDAYS',
    timeBandCode: 'BEFORE_17',
    day: 'Thứ Hai–Thứ Năm',
    time: 'Trước 17:00',
  },
  {
    code: 'WEEKDAY_FROM_17',
    dayGroupCode: 'WEEKDAYS',
    timeBandCode: 'FROM_17',
    day: 'Thứ Hai–Thứ Năm',
    time: 'Từ 17:00',
  },
  {
    code: 'WEEKEND',
    dayGroupCode: 'WEEKEND',
    timeBandCode: 'ALL_DAY',
    day: 'Thứ Sáu–Chủ Nhật',
    time: 'Cả ngày',
  },
  {
    code: 'HOLIDAYS',
    dayGroupCode: 'HOLIDAYS',
    timeBandCode: 'ALL_DAY',
    day: 'Lễ, Tết',
    time: 'Cả ngày',
  },
] as const

export const NEW_PRICE_SEATS = [
  {
    code: 'STANDARD',
    name: 'Ghế thường',
    physicalSeatType: 'STANDARD',
    fareUnit: 'PER_TICKET',
    unit: 'mỗi vé',
  },
  {
    code: 'VIP',
    name: 'Ghế VIP',
    physicalSeatType: 'VIP',
    fareUnit: 'PER_TICKET',
    unit: 'mỗi vé',
  },
  {
    code: 'COUPLE',
    name: 'Ghế đôi',
    physicalSeatType: 'COUPLE',
    fareUnit: 'PER_PAIR',
    unit: 'cả cặp',
  },
] as const

const amountSchema = z
  .string()
  .refine(
    (value) => normalizeFareAmount(value) !== null,
    'Nhập số tiền hợp lệ, ví dụ 55.000 hoặc 55000.',
  )
  .transform((value) => normalizeFareAmount(value) ?? '')

export const pricingWorkflowCreateSchema = z.object({
  cinemaId: z.string().uuid('Chọn rạp áp dụng.'),
  effectiveFrom: z.string().date('Nhập ngày bắt đầu hợp lệ.'),
  tables: z
    .array(
      z.object({
        contentFormat: z.nativeEnum(FareRuleInputContentFormat),
        prices: z.array(z.array(amountSchema).length(3)).length(4),
      }),
    )
    .min(1, 'Nhập ít nhất một bảng giá 2D hoặc 3D.')
    .max(2)
    .refine(
      (items) => new Set(items.map((item) => item.contentFormat)).size === items.length,
      'Mỗi hình thức chiếu chỉ được có một bảng giá.',
    ),
})

type CreateInput = z.input<typeof pricingWorkflowCreateSchema>
type PreparedInput = z.output<typeof pricingWorkflowCreateSchema>

const policySchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  policyVersion: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  status: z.literal('DRAFT'),
  pricingModel: z.literal('FARE_MATRIX_V2'),
  currency: z.literal('VND'),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
})

const envelopeSchema = z.object({ policy: policySchema })

export type CreatedWorkflowPolicy = z.infer<typeof policySchema>

type Checkpoint = {
  input: PreparedInput
  policy: CreatedWorkflowPolicy
  step: number
}

export class PricingWorkflowCreateError extends Error {
  constructor(
    message: string,
    public readonly requiresCheck = false,
  ) {
    super(message)
    this.name = 'PricingWorkflowCreateError'
  }
}

export function workflowCreateErrorMessage(error: unknown): string {
  return error instanceof PricingWorkflowCreateError
    ? error.message
    : 'Chưa hoàn tất việc tạo bảng giá.'
}

function buildMatrix(
  input: PreparedInput,
): Omit<ReplaceCinemaFareMatrixRequest, 'expectedVersion'> {
  const fareRules: FareRuleInput[] = input.tables.flatMap((table) =>
    NEW_PRICE_ROWS.flatMap((row, rowIndex) =>
      NEW_PRICE_SEATS.map((seat, seatIndex) => {
        const amountVnd = table.prices[rowIndex]?.[seatIndex]

        if (amountVnd === undefined) {
          throw new PricingWorkflowCreateError('Cần nhập đủ giá cho từng loại ghế.')
        }

        return {
          code: `FARE_${table.contentFormat}_${row.code}_${seat.code}`,
          experienceType: 'STANDARD',
          contentFormat: table.contentFormat,
          dayGroupCode: row.dayGroupCode,
          timeBandCode: row.timeBandCode,
          ticketCategoryCode: 'REGULAR',
          seatTypeCode: seat.code,
          advanceScreeningCondition: 'REGULAR_SCREENING',
          amountVnd,
          fareUnit: seat.fareUnit,
          priority: 0,
          effectiveFrom: input.effectiveFrom,
        }
      }),
    ),
  )

  return {
    dayGroups: [
      {
        code: 'WEEKDAYS',
        name: 'Thứ Hai–Thứ Năm',
        daysOfWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'],
        includesHolidays: false,
      },
      {
        code: 'WEEKEND',
        name: 'Thứ Sáu–Chủ Nhật',
        daysOfWeek: ['FRIDAY', 'SATURDAY', 'SUNDAY'],
        includesHolidays: false,
      },
      {
        code: 'HOLIDAYS',
        name: 'Lễ, Tết',
        daysOfWeek: [],
        includesHolidays: true,
      },
    ],
    timeBands: [
      {
        code: 'BEFORE_17',
        name: 'Trước 17:00',
        fromMinute: 0,
        toMinute: 1020,
      },
      {
        code: 'FROM_17',
        name: 'Từ 17:00',
        fromMinute: 1020,
        toMinute: 1440,
      },
      {
        code: 'ALL_DAY',
        name: 'Cả ngày',
        fromMinute: 0,
        toMinute: 1440,
      },
    ],
    fareRules,
  }
}

export function useCreatePricingWorkflow(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()
  const checkpoint = ref<Checkpoint | null>(null)
  const requiresCheck = ref(false)
  const completed = ref(false)
  let running = false

  const labels = [
    'Lưu loại vé',
    'Lưu loại ghế',
    'Xác nhận giá trọn gói',
    'Lưu giá vé',
    'Hoàn tất thông tin áp dụng',
  ]

  const stageLabel = computed(() =>
    checkpoint.value ? (labels[checkpoint.value.step] ?? 'Đã lưu đầy đủ') : 'Tạo bản nháp',
  )

  function refreshList(cinemaId: string) {
    void queryClient
      .invalidateQueries({
        queryKey: ['pricing', 'admin', 'policies', cinemaId],
      })
      .catch(() => undefined)
  }

  const save = useMutation({
    retry: false,
    mutationFn: async (input: CreateInput) => {
      if (running || completed.value || requiresCheck.value || !toValue(enabled)) {
        throw new PricingWorkflowCreateError('Không thể gửi yêu cầu tạo lúc này.')
      }

      const parsed = pricingWorkflowCreateSchema.safeParse(input)

      if (!parsed.success) {
        throw new PricingWorkflowCreateError(
          parsed.error.issues[0]?.message ?? 'Kiểm tra thông tin bảng giá.',
        )
      }

      if (
        checkpoint.value &&
        JSON.stringify(checkpoint.value.input) !== JSON.stringify(parsed.data)
      ) {
        throw new PricingWorkflowCreateError(
          'Thông tin đã lưu một phần không khớp với dữ liệu đang gửi.',
          true,
        )
      }

      running = true

      try {
        if (!checkpoint.value) {
          const response = await createCinemaPricingPolicyDraft(parsed.data.cinemaId, {
            currency: 'VND',
            pricingModel: 'FARE_MATRIX_V2',
            effectiveFrom: parsed.data.effectiveFrom,
          })

          const result = policySchema.safeParse(response)

          if (
            !result.success ||
            result.data.cinemaId !== parsed.data.cinemaId ||
            result.data.effectiveFrom !== parsed.data.effectiveFrom ||
            result.data.effectiveTo !== null
          ) {
            throw new PricingWorkflowCreateError(
              'Chưa xác nhận được kết quả tạo. Hãy kiểm tra danh sách bản giá trước khi tạo thêm.',
              true,
            )
          }

          checkpoint.value = {
            input: parsed.data,
            policy: result.data,
            step: 0,
          }
        }

        const state = checkpoint.value
        const matrix = buildMatrix(state.input)

        const saleScopes: ReplaceCinemaPricingSaleScopesRequest['saleScopes'] =
          matrix.fareRules.map((fare) => ({
            code: `SCOPE_${fare.code}`,
            experienceType: fare.experienceType,
            contentFormat: fare.contentFormat,
            dayGroupCode: fare.dayGroupCode,
            timeBandCode: fare.timeBandCode,
            ticketCategoryCode: fare.ticketCategoryCode,
            seatTypeCode: fare.seatTypeCode,
            advanceScreeningCondition: fare.advanceScreeningCondition,
          }))

        const operations: Array<() => Promise<unknown>> = [
          () =>
            replaceCinemaPricingTicketCategories(state.policy.cinemaId, state.policy.id, {
              expectedVersion: state.policy.version,
              ticketCategories: [
                {
                  code: 'REGULAR',
                  name: 'Vé thông thường',
                  pricingRole: 'REGULAR',
                  eligibilityMode: 'UNRESTRICTED',
                },
              ],
            }),
          () =>
            replaceCinemaPricingSeatTypes(state.policy.cinemaId, state.policy.id, {
              expectedVersion: state.policy.version,
              seatTypes: NEW_PRICE_SEATS.map((seat) => ({
                code: seat.code,
                name: seat.name,
                mappingStatus: 'CONFIRMED',
                physicalSeatType: seat.physicalSeatType,
              })),
            }),
          () =>
            replaceCinemaFareSurcharges(state.policy.cinemaId, state.policy.id, {
              expectedVersion: state.policy.version,
              mode: 'NONE',
              surcharges: [],
            }),
          () =>
            replaceCinemaPricingPolicyFareMatrix(state.policy.cinemaId, state.policy.id, {
              ...matrix,
              expectedVersion: state.policy.version,
            }),
          () =>
            replaceCinemaPricingSaleScopes(state.policy.cinemaId, state.policy.id, {
              expectedVersion: state.policy.version,
              saleScopes,
            }),
        ]

        while (state.step < operations.length) {
          if (!toValue(enabled)) {
            throw new PricingWorkflowCreateError(
              'Bạn không còn quyền tiếp tục lưu. Hãy kiểm tra lại bản nháp.',
              true,
            )
          }

          const operation = operations[state.step]
          if (!operation) {
            throw new PricingWorkflowCreateError('Chưa xác định được bước lưu tiếp theo.', true)
          }

          const previous = state.policy
          const response = await operation()

          const result =
            state.step === 3 ? policySchema.safeParse(response) : envelopeSchema.safeParse(response)

          if (!result.success) {
            throw new PricingWorkflowCreateError(
              'Chưa xác nhận được dữ liệu vừa lưu. Hãy kiểm tra bản nháp trước khi gửi tiếp.',
              true,
            )
          }

          const next = 'policy' in result.data ? result.data.policy : result.data

          if (
            next.id !== previous.id ||
            next.cinemaId !== previous.cinemaId ||
            next.policyVersion !== previous.policyVersion ||
            next.version <= previous.version ||
            next.effectiveFrom !== state.input.effectiveFrom ||
            next.effectiveTo !== null
          ) {
            throw new PricingWorkflowCreateError(
              'Thông tin bản nháp đã thay đổi. Hãy kiểm tra lại trước khi tiếp tục.',
              true,
            )
          }

          state.policy = next
          state.step++
        }

        completed.value = true
        refreshList(state.policy.cinemaId)
        return state.policy
      } catch (error: unknown) {
        if (checkpoint.value) {
          refreshList(checkpoint.value.policy.cinemaId)
        }

        if (error instanceof PricingWorkflowCreateError) {
          requiresCheck.value ||= error.requiresCheck
          throw error
        }

        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof error.status === 'number'
            ? error.status
            : null

        const definitelyRejected =
          status === 400 || status === 422 || (status === 409 && checkpoint.value === null)

        requiresCheck.value = !definitelyRejected

        throw new PricingWorkflowCreateError(
          definitelyRejected
            ? checkpoint.value
              ? 'Đã tạo bản nháp nhưng chưa lưu đầy đủ. Bạn có thể tiếp tục lưu bản nháp này.'
              : 'Chưa tạo được bản giá. Kiểm tra thông tin và cấu hình của rạp.'
            : 'Chưa xác định được kết quả lưu. Hãy quay lại danh sách để kiểm tra trước khi tạo hoặc lưu tiếp.',
          !definitelyRejected,
        )
      } finally {
        running = false
      }
    },
  })

  return { save, checkpoint, requiresCheck, completed, stageLabel }
}
