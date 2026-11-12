import { ref } from 'vue'
import {
  register,
  confirmEmail,
} from '@/services/api/generated/user-service/authentication-registration-controller/authentication-registration-controller'
import type { RegisterUserRequest } from '@/services/api/generated/user-service/model/registerUserRequest'
import type { ConfirmEmailVerificationRequest } from '@/services/api/generated/user-service/model/confirmEmailVerificationRequest'

function apiMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error &&
    typeof error.message === 'string' && 'status' in error && error.status !== null) {
    return error.message
  }
  return fallback
}

export function useRegistration() {
  const pending = ref(false)
  const accepted = ref(false)
  const message = ref('')
  const error = ref('')
  async function submit(request: RegisterUserRequest) {
    if (pending.value || accepted.value) return
    pending.value = true
    error.value = ''
    try {
      const response = await register(request)
      message.value = response.message || 'Yêu cầu đã được tiếp nhận. Vui lòng kiểm tra hộp thư để xác minh email.'
      accepted.value = true
    } catch (cause) {
      error.value = apiMessage(cause, 'Chưa thể gửi yêu cầu đăng ký. Vui lòng thử lại.')
    } finally {
      pending.value = false
    }
  }
  return { pending, accepted, message, error, submit }
}

// Do not use mutation caching here: the token and password belong only to this page request.
export function useEmailVerification() {
  const pending = ref(false)
  const verified = ref(false)
  const error = ref('')
  async function submit(request: ConfirmEmailVerificationRequest): Promise<boolean> {
    if (pending.value || verified.value) return false
    pending.value = true
    error.value = ''
    try {
      await confirmEmail(request)
      verified.value = true
      return true
    } catch (cause) {
      error.value = apiMessage(cause, 'Không thể xác minh email. Liên kết có thể không hợp lệ hoặc đã hết hạn.')
      return false
    } finally {
      pending.value = false
    }
  }
  return { pending, verified, error, submit }
}
