import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { createDraft } from '@/services/api/generated/inventory-service/pricing-policy-draft-controller/pricing-policy-draft-controller'
import type { CreatePricingPolicyDraftRequest } from '@/services/api/generated/inventory-service/model/createPricingPolicyDraftRequest'
import {
  pricingErrorMessage,
  pricingErrorStatus,
  pricingPolicySchema,
  type PricingPolicy,
} from './admin-pricing-queries'

const uuid = z.string().uuid()

export type PricingDraftCheckpoint = {
  cinemaId: string
  source: PricingPolicy
  clientRequestId: string
  created: PricingPolicy | null
}

function errorCode(error: unknown): string | null {
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

export function pricingDraftCreationErrorMessage(error: unknown): string {
  const code = errorCode(error)

  if (code === 'INVENTORY_PRICING_POLICY_SOURCE_NOT_PUBLISHED') {
    return 'Phiên bản nguồn không còn ở trạng thái đã công bố. Hãy tải lại danh sách.'
  }

  if (code === 'INVENTORY_PRICING_POLICY_DRAFT_CREATE_CONFLICT') {
    return 'Mã yêu cầu đã được dùng với phiên bản nguồn khác. Hãy kiểm tra lại danh sách phiên bản.'
  }

  if (code === 'INVENTORY_PRICING_POLICY_REVISION_EXHAUSTED') {
    return 'Bảng giá đã đạt giới hạn số phiên bản và không thể tạo thêm bản nháp.'
  }

  if (code === 'INVENTORY_PRICING_POLICY_DATA_INCONSISTENT') {
    return 'Dữ liệu phiên bản nguồn chưa nhất quán. Chưa thể sao chép thành bản nháp.'
  }

  if (error instanceof z.ZodError) {
    return 'Chưa xác nhận được dữ liệu bản nháp trả về. Hãy tiếp tục bằng cùng yêu cầu hoặc tải lại danh sách.'
  }

  return pricingErrorMessage(error)
}

function definitelyRejected(error: unknown): boolean {
  const status = pricingErrorStatus(error)

  return status !== null && [400, 401, 403, 404, 409, 422].includes(status)
}

export function useCreatePricingDraftFromPublished(enabled: MaybeRefOrGetter<boolean>) {
  const queryClient = useQueryClient()

  const checkpoint = shallowRef<PricingDraftCheckpoint | null>(null)
  const needsRecovery = ref(false)
  const running = ref(false)

  const attempts = new Map<string, PricingDraftCheckpoint>()

  function requireAccess(): void {
    if (!toValue(enabled)) {
      throw new Error('Bạn không có quyền tạo bản nháp bảng giá.')
    }
  }

  const mutation = useMutation({
    retry: false,
    mutationFn: async (attempt: PricingDraftCheckpoint) => {
      requireAccess()

      const cinemaId = uuid.parse(attempt.cinemaId)
      const policyId = uuid.parse(attempt.source.policyId)
      const sourceVersionId = uuid.parse(attempt.source.id)

      const request = {
        clientRequestId: uuid.parse(attempt.clientRequestId),
      } satisfies CreatePricingPolicyDraftRequest

      const response = await createDraft(cinemaId, policyId, sourceVersionId, request)

      const created = pricingPolicySchema.parse(response)

      if (
        created.policyId !== attempt.source.policyId ||
        created.id === attempt.source.id ||
        created.revision <= attempt.source.revision
      ) {
        throw new Error(
          'Chưa xác nhận được phiên bản mới thuộc bảng giá nguồn. Hãy kiểm tra kết quả bằng cùng yêu cầu.',
        )
      }

      return created
    },
    onSuccess: () => {
      void queryClient
        .invalidateQueries({
          queryKey: ['pricing', 'admin'],
          refetchType: 'none',
        })
        .catch(() => undefined)
    },
  })

  async function execute(attempt: PricingDraftCheckpoint): Promise<PricingPolicy> {
    requireAccess()

    if (running.value) {
      throw new Error('Yêu cầu tạo bản nháp đang được xử lý.')
    }

    running.value = true
    checkpoint.value = attempt
    needsRecovery.value = true

    try {
      if (attempt.created) {
        return attempt.created
      }

      const created = await mutation.mutateAsync(attempt)
      const completed: PricingDraftCheckpoint = {
        ...attempt,
        created,
      }

      attempts.set(attempt.source.id, completed)
      checkpoint.value = completed

      return created
    } catch (error: unknown) {
      if (definitelyRejected(error)) {
        needsRecovery.value = false
      }

      throw error
    } finally {
      running.value = false
    }
  }

  async function start(cinemaId: string, source: PricingPolicy): Promise<PricingPolicy> {
    requireAccess()
    uuid.parse(cinemaId)

    if (source.status !== 'PUBLISHED') {
      throw new Error('Chỉ có thể tạo bản nháp kế tiếp từ phiên bản đã công bố.')
    }

    if (!source.cinemaIds.includes(cinemaId)) {
      throw new Error('Phiên bản nguồn không thuộc cụm rạp đang mở.')
    }

    const current = checkpoint.value

    if (needsRecovery.value && current && current.source.id !== source.id) {
      throw new Error('Cần kiểm tra kết quả tạo bản nháp đang chờ trước khi bắt đầu yêu cầu khác.')
    }

    let attempt = attempts.get(source.id)

    if (!attempt) {
      attempt = {
        cinemaId,
        source: {
          ...source,
          cinemaIds: [...source.cinemaIds],
        },
        clientRequestId: crypto.randomUUID(),
        created: null,
      }

      attempts.set(source.id, attempt)
    }

    return execute(attempt)
  }

  async function resume(): Promise<PricingPolicy> {
    const current = checkpoint.value

    if (!current) {
      throw new Error('Không có yêu cầu tạo bản nháp để tiếp tục.')
    }

    return execute(current)
  }

  function markOpened(versionId: string): void {
    if (checkpoint.value?.created?.id === versionId) {
      needsRecovery.value = false
    }
  }

  return {
    checkpoint: computed(() => checkpoint.value),
    needsRecovery: computed(() => needsRecovery.value),
    pending: computed(() => running.value || mutation.isPending.value),
    start,
    resume,
    markOpened,
  }
}
