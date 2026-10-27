import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { quote } from '@/services/api/generated/inventory-service/pricing-fare-quote-controller/pricing-fare-quote-controller'
import {
  CellResponseTimeBand,
  CellResponseUnit,
  PricingFareQuoteResponseDayGroup,
  QuotePricingFareRequestContentFormat,
  QuotePricingFareRequestExperienceType,
  QuotePricingFareRequestSeatType,
  QuotePricingFareRequestTicketCategory,
  type QuotePricingFareRequest,
} from '@/services/api/generated/inventory-service/model'
import {
  pricingErrorMessage,
  type PricingContext,
  type PricingPolicy,
} from './admin-pricing-queries'

const uuid = z.string().uuid()

export const publishedQuoteFormSchema = z.object({
  cinemaId: uuid,
  date: z.string().date(),
  time: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  experienceType: z.nativeEnum(QuotePricingFareRequestExperienceType),
  contentFormat: z.nativeEnum(QuotePricingFareRequestContentFormat),
  seatType: z.nativeEnum(QuotePricingFareRequestSeatType),
  ticketCategory: z.nativeEnum(QuotePricingFareRequestTicketCategory),
})

const quoteRequestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  experienceType: z.nativeEnum(QuotePricingFareRequestExperienceType),
  contentFormat: z.nativeEnum(QuotePricingFareRequestContentFormat),
  seatType: z.nativeEnum(QuotePricingFareRequestSeatType),
  ticketCategory: z.nativeEnum(QuotePricingFareRequestTicketCategory),
})

const quoteResponseSchema = z.object({
  policyId: uuid,
  policyVersionId: uuid,
  revision: z.number().int().positive(),
  cinemaId: uuid,
  cinemaTimeZone: z.string().min(1),
  localStartsAt: z.string().datetime({ offset: true }),
  dayGroup: z.nativeEnum(PricingFareQuoteResponseDayGroup),
  capacityPerUnit: z.number().int().positive(),
  fare: z.object({
    experienceType: z.nativeEnum(QuotePricingFareRequestExperienceType),
    contentFormat: z.nativeEnum(QuotePricingFareRequestContentFormat),
    timeBand: z.nativeEnum(CellResponseTimeBand),
    ticketCategory: z.nativeEnum(QuotePricingFareRequestTicketCategory),
    seatType: z.nativeEnum(QuotePricingFareRequestSeatType),
    state: z.literal('PRICED'),
    amount: z.number().finite().nonnegative(),
    unit: z.nativeEnum(CellResponseUnit),
  }),
})

export type PublishedPricingQuoteInput = {
  context: PricingContext
  request: QuotePricingFareRequest
  revision: number
  dayGroup: PricingPolicy['dayGroup']
  unit: CellResponseUnit
  capacityPerUnit: number
}

export function pricingQuoteErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }

  return null
}

export function pricingQuoteErrorMessage(error: unknown): string {
  const code = pricingQuoteErrorCode(error)

  if (code === 'INVENTORY_PRICING_FARE_NOT_APPLICABLE') {
    return 'Bảng giá này không bán tổ hợp loại phòng, định dạng, ghế và đối tượng đã chọn.'
  }

  if (code === 'INVENTORY_PRICING_POLICY_VERSION_NOT_PUBLISHED') {
    return 'Phiên bản này chưa được công bố. Hãy tải lại danh sách bảng giá.'
  }

  if (code === 'INVENTORY_PRICING_POLICY_DATA_INCONSISTENT') {
    return 'Dữ liệu bảng giá chưa nhất quán. Hãy tải lại và kiểm tra phiên bản.'
  }

  if (code === 'INVENTORY_CINEMA_TIME_ZONE_INVALID') {
    return 'Múi giờ của cụm rạp không hợp lệ. Cần cập nhật cấu hình cụm rạp.'
  }

  if (code === 'INVENTORY_INVALID_PRICING_FARE_QUOTE') {
    return 'Thông tin tra giá chưa hợp lệ. Kiểm tra ngày, giờ và tổ hợp đã chọn.'
  }

  if (error instanceof z.ZodError) {
    return 'Phản hồi tra giá không đúng contract hiện tại. Hãy thử tải lại.'
  }

  return pricingErrorMessage(error)
}

function localTimeBand(
  startsAt: string,
  timeZone: string,
): CellResponseTimeBand {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(startsAt))

  const hour = Number(parts.find((item) => item.type === 'hour')?.value)
  const minute = Number(parts.find((item) => item.type === 'minute')?.value)

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error('Không xác nhận được giờ địa phương trong phản hồi tra giá.')
  }

  return hour * 60 + minute < 17 * 60
    ? CellResponseTimeBand.BEFORE_17
    : CellResponseTimeBand.FROM_17
}

export function useAdminPublishedPricingQuote(
  input: MaybeRefOrGetter<PublishedPricingQuoteInput | null>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(
      () => ['pricing', 'admin', 'published-quote', toValue(input)] as const,
    ),
    enabled: computed(() => toValue(enabled) && toValue(input) !== null),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) {
        throw new Error('Bạn không có quyền tra giá.')
      }

      const selected = queryKey[3]

      if (!selected) {
        throw new Error('Chưa chọn đủ thông tin tra giá.')
      }

      const context: PricingContext = {
        cinemaId: uuid.parse(selected.context.cinemaId),
        policyId: uuid.parse(selected.context.policyId),
        versionId: uuid.parse(selected.context.versionId),
      }

      const request = quoteRequestSchema.parse({
        ...selected.request,
      }) satisfies QuotePricingFareRequest

      const response = quoteResponseSchema.parse(
        await quote(
          context.cinemaId,
          context.policyId,
          context.versionId,
          request,
        ),
      )

      if (
        response.cinemaId !== context.cinemaId ||
        response.policyId !== context.policyId ||
        response.policyVersionId !== context.versionId ||
        response.revision !== selected.revision ||
        response.dayGroup !== selected.dayGroup
      ) {
        throw new Error('Kết quả tra giá không thuộc phiên bản hoặc cụm rạp đang xem.')
      }

      if (
        response.fare.experienceType !== request.experienceType ||
        response.fare.contentFormat !== request.contentFormat ||
        response.fare.ticketCategory !== request.ticketCategory ||
        response.fare.seatType !== request.seatType ||
        response.fare.unit !== selected.unit ||
        response.capacityPerUnit !== selected.capacityPerUnit
      ) {
        throw new Error('Kết quả tra giá không khớp tổ hợp đã chọn.')
      }

      if (
        Date.parse(response.localStartsAt) !== Date.parse(request.startsAt) ||
        response.fare.timeBand !==
          localTimeBand(request.startsAt, response.cinemaTimeZone)
      ) {
        throw new Error('Giờ địa phương hoặc khung giá trong phản hồi chưa nhất quán.')
      }

      return response
    },
    placeholderData: () => undefined,
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}