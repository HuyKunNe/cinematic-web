import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { getManagedCinemas } from '@/services/api/generated/inventory-service/cinema-controller/cinema-controller'
import { getCinemaPricingPolicies } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { CinemaPricingPolicyResponseStatus } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyResponseStatus'
import { CinemaPricingPolicyResponsePricingModel } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyResponsePricingModel'

const uuid = z.string().uuid()

const cinemaSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1),
  active: z.boolean(),
})

const policySchema = z.object({
  id: uuid,
  cinemaId: uuid,
  policyVersion: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  status: z.nativeEnum(CinemaPricingPolicyResponseStatus),
  pricingModel: z.nativeEnum(CinemaPricingPolicyResponsePricingModel),
  currency: z.string().trim().min(1),
  timeZone: z.string().trim().min(1),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
})

function requireUniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách trả về chứa mã trùng.')
  }

  return items
}

export function pricingErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu chính sách trả về không hợp lệ. Vui lòng tải lại.'
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }

    if (error.status === 403) {
      return 'Bạn không có quyền xem chính sách giá của rạp.'
    }

    if (error.status === 404) {
      return 'Không tìm thấy rạp hoặc dữ liệu được yêu cầu. Vui lòng tải lại.'
    }

    if (error.status === null) {
      return 'Không thể kết nối dịch vụ. Vui lòng thử lại.'
    }
  }

  return 'Không thể tải dữ liệu chính sách giá. Vui lòng thử lại.'
}

export function useAdminPricingQueries(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
) {
  const cinemas = useQuery({
    queryKey: ['pricing', 'admin', 'cinemas'],
    enabled: computed(() => toValue(enabled)),
    queryFn: async () => {
      if (!toValue(enabled)) {
        throw new Error('Không có quyền tải danh mục rạp.')
      }

      return requireUniqueIds(z.array(cinemaSchema).parse(await getManagedCinemas()))
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  })

  const policies = useQuery({
    queryKey: computed(() => ['pricing', 'admin', 'policies', toValue(cinemaId)] as const),
    enabled: computed(() => toValue(enabled) && uuid.safeParse(toValue(cinemaId)).success),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) {
        throw new Error('Không có quyền tải chính sách giá.')
      }

      const requestedCinemaId = uuid.parse(queryKey[3])

      const items = requireUniqueIds(
        z.array(policySchema).parse(await getCinemaPricingPolicies(requestedCinemaId)),
      )

      if (items.some((item) => item.cinemaId !== requestedCinemaId)) {
        throw new Error('Chính sách không thuộc rạp đang chọn.')
      }

      if (new Set(items.map((item) => item.policyVersion)).size !== items.length) {
        throw new Error('Danh sách có phiên bản chính sách trùng.')
      }

      return [...items].sort((first, second) => second.policyVersion - first.policyVersion)
    },
    placeholderData: () => undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  })

  return { cinemas, policies }
}
