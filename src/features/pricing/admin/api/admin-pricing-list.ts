import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  listLatestCinemaPricingPolicies,
  listCinemaPricingPolicyVersions,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import {
  pricingPolicySchema,
  useAdminPricingActions,
  useAdminPricingQueries,
  type PricingCinema,
  type PricingContext,
  type PricingPolicy,
} from './admin-pricing-queries'

const uuid = z.string().uuid()

function parseList(response: unknown, cinemaId: string, policyId?: string): PricingPolicy[] {
  const items = z.array(pricingPolicySchema).parse(response)

  if (
    items.some(
      (item) =>
        !item.cinemaIds.includes(cinemaId) ||
        (policyId !== undefined && item.policyId !== policyId),
    )
  ) {
    throw new Error('Danh sách bảng giá không thuộc phạm vi đang xem.')
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Danh sách phiên bản chứa mã trùng.')
  }

  if (policyId === undefined && new Set(items.map((item) => item.policyId)).size !== items.length) {
    throw new Error('Danh sách bảng giá chứa chính sách trùng.')
  }

  return items
}

export function useAdminPricingList(
  enabled: MaybeRefOrGetter<boolean>,
  cinemaId: MaybeRefOrGetter<string>,
) {
  const { cinemas } = useAdminPricingQueries(
    enabled,
    () => '',
    () => '',
    () => '',
  )

  const scopeIds = computed(() => {
    const selected = toValue(cinemaId)

    return (cinemas.data.value ?? [])
      .filter((item) => !selected || item.id === selected)
      .map((item) => item.id)
  })

  const lists = useQueries({
    queries: computed(() =>
      scopeIds.value.map((id) => ({
        queryKey: ['pricing', 'admin', 'policies', id] as const,
        enabled: toValue(enabled),
        queryFn: async () => {
          if (!toValue(enabled)) throw new Error('Không có quyền xem bảng giá.')
          return parseList(await listLatestCinemaPricingPolicies(id), id)
        },
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })),
    ),
  })

  const policies = computed(() => {
    const merged = new Map<string, PricingPolicy>()

    for (const query of lists.value) {
      for (const item of query.data ?? []) {
        const previous = merged.get(item.policyId)

        if (
          !previous ||
          item.revision > previous.revision ||
          (item.revision === previous.revision && item.version > previous.version)
        ) {
          merged.set(item.policyId, item)
        }
      }
    }

    return [...merged.values()].sort((first, second) =>
      first.name.localeCompare(second.name, 'vi-VN'),
    )
  })

  const loading = computed(
    () => cinemas.isFetching.value || lists.value.some((query) => query.isFetching),
  )

  const errors = computed(() => lists.value.flatMap((query) => (query.error ? [query.error] : [])))

  return { cinemas, policies, loading, errors }
}

export function useAdminPricingRowDetails(
  enabled: MaybeRefOrGetter<boolean>,
  policies: MaybeRefOrGetter<PricingPolicy[]>,
  cinemas: MaybeRefOrGetter<PricingCinema[]>,
  selectedCinemaId: MaybeRefOrGetter<string>,
) {
  const actions = useAdminPricingActions(enabled)

  const contexts = computed(() =>
    toValue(policies).map((policy) => {
      const selected = toValue(selectedCinemaId)
      const availableIds = new Set(toValue(cinemas).map((item) => item.id))

      const cinemaId =
        selected && policy.cinemaIds.includes(selected)
          ? selected
          : (policy.cinemaIds.find((id) => availableIds.has(id)) ?? '')

      return {
        cinemaId,
        policyId: policy.policyId,
        versionId: policy.id,
      }
    }),
  )

  const queries = useQueries({
    queries: computed(() =>
      contexts.value.map((context) => ({
        queryKey: [
          'pricing',
          'admin',
          'table-row',
          context.cinemaId,
          context.policyId,
          context.versionId,
        ] as const,
        enabled: toValue(enabled) && uuid.safeParse(context.cinemaId).success,
        queryFn: () => actions.loadDetail(context),
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })),
    ),
  })

  return computed(
    () =>
      new Map(
        toValue(policies).map((policy, index) => {
          const query = queries.value[index]

          return [
            policy.id,
            {
              context: contexts.value[index],
              data: query?.data,
              loading: query?.isFetching ?? false,
              error: query?.error ?? null,
            },
          ] as const
        }),
      ),
  )
}

export function useAdminPricingVersions(
  context: MaybeRefOrGetter<PricingContext | null>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => {
      const current = toValue(context)

      return [
        'pricing',
        'admin',
        'versions',
        current?.cinemaId ?? '',
        current?.policyId ?? '',
      ] as const
    }),
    enabled: computed(() => toValue(enabled) && toValue(context) !== null),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) throw new Error('Không có quyền xem phiên bản.')

      const cinemaId = uuid.parse(queryKey[3])
      const policyId = uuid.parse(queryKey[4])

      return parseList(
        await listCinemaPricingPolicyVersions(cinemaId, policyId),
        cinemaId,
        policyId,
      ).sort((first, second) => second.revision - first.revision)
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
