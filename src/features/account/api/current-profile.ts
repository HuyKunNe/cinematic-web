import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import {
  getCurrentProfile,
  updateCurrentProfile,
} from '@/services/api/generated/user-service/current-user-controller/current-user-controller'
import type { UpdateCurrentUserProfileRequest } from '@/services/api/generated/user-service/model/updateCurrentUserProfileRequest'
import { CurrentUserProfileResponseStatus } from '@/services/api/generated/user-service/model/currentUserProfileResponseStatus'

const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(1),
  status: z.nativeEnum(CurrentUserProfileResponseStatus),
  firstName: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  lastName: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  phoneNumber: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  emailVerifiedAt: z.string().nullish(),
})
export type CurrentProfile = z.infer<typeof profileSchema>
const profileKey = (owner: string | null) => ['account', 'profile', owner] as const

function readProfile(response: unknown, owner: string): CurrentProfile {
  const profile = profileSchema.parse(response)
  if (profile.id !== owner) throw new Error('Profile identity mismatch')
  return profile
}
export function profileErrorMessage(cause: unknown): string {
  const status = (cause as { status?: number } | null)?.status
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn chưa có quyền truy cập hồ sơ này.'
  if (status === 400 || status === 422)
    return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.'
  if (status === 409) return 'Thông tin đã thay đổi. Vui lòng tải lại hồ sơ trước khi lưu.'
  return 'Chưa thể xử lý hồ sơ. Vui lòng thử lại.'
}
export function useCurrentProfileQuery() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => profileKey(auth.subject)),
    enabled: computed(() => auth.isAuthenticated && !!auth.subject),
    queryFn: async ({ queryKey }) => {
      const owner = queryKey[2]
      if (!owner || !auth.isAuthenticated || auth.subject !== owner)
        throw new Error('Session changed')
      const profile = readProfile(await getCurrentProfile(), owner)
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      return profile
    },
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
export function useUpdateCurrentProfile() {
  const auth = useAuthStore()
  const queries = useQueryClient()
  return useMutation({
    mutationFn: async ({
      request,
      owner,
    }: {
      request: UpdateCurrentUserProfileRequest
      owner: string
    }) => {
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      const profile = readProfile(await updateCurrentProfile(request), owner)
      if (!auth.isAuthenticated || auth.subject !== owner) throw new Error('Session changed')
      return profile
    },
    onSuccess: (profile) => {
      if (auth.isAuthenticated && auth.subject === profile.id)
        queries.setQueryData(profileKey(profile.id), profile)
    },
    retry: false,
  })
}
