<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import AuthSignInAction from '../components/AuthSignInAction.vue'
import { useEmailVerification } from '../composables/use-registration'
import { consumeEmailVerificationToken } from '../services/email-verification-token'
import '@/styles/registration-auth.css'

const token = ref(consumeEmailVerificationToken())
const password = ref('')
const confirmation = ref('')
const validationError = ref('')
const verification = useEmailVerification()

async function submit() {
  if (!token.value || verification.pending.value || verification.verified.value) return
  validationError.value = ''
  let invalidField = 'verify-password'
  if (!password.value.trim() || [...password.value].length < 12) validationError.value = 'Mật khẩu cần ít nhất 12 ký tự.'
  else if (new TextEncoder().encode(password.value).byteLength > 72) validationError.value = 'Mật khẩu không được vượt quá 72 byte UTF-8. Ký tự có dấu hoặc emoji có thể chiếm nhiều byte.'
  else if (password.value !== confirmation.value) {
    validationError.value = 'Mật khẩu xác nhận chưa khớp.'
    invalidField = 'verify-confirmation'
  }
  if (validationError.value) {
    await nextTick()
    document.getElementById(invalidField)?.focus()
    return
  }
  const success = await verification.submit({ token: token.value, password: password.value })
  password.value = ''
  confirmation.value = ''
  if (success) token.value = null
}
onBeforeUnmount(() => {
  token.value = null
  password.value = ''
  confirmation.value = ''
})
</script>

<template>
  <AppContainer class="registration-auth" width="narrow">
    <section class="registration-auth__card" aria-labelledby="verify-title">
      <p class="lumiere-eyebrow">XÁC MINH EMAIL</p>
      <h1 id="verify-title">Hoàn tất tài khoản của bạn</h1>
      <div v-if="verification.verified.value" class="registration-auth__success" role="status">
        <h2>Xác minh email thành công</h2>
        <p>Mật khẩu đã được thiết lập. Bạn có thể đăng nhập để tiếp tục.</p>
      </div>
      <div v-else-if="!token" class="registration-auth__error" role="alert">
        <p>Liên kết xác minh không hợp lệ hoặc thiếu token. Hãy mở đầy đủ liên kết từ email.</p>
        <p>Nếu vừa tải lại trang, hãy mở lại liên kết email. Token chỉ được giữ trong bộ nhớ khi trang đang mở.</p>
      </div>
      <form v-else novalidate @submit.prevent="submit">
        <p class="registration-auth__intro">Đặt mật khẩu để hoàn tất xác minh email.</p>
        <fieldset :disabled="verification.pending.value" :aria-busy="verification.pending.value">
          <label class="registration-auth__field" for="verify-password">Mật khẩu mới
            <input id="verify-password" v-model="password" type="password" autocomplete="new-password" required minlength="12" aria-describedby="verify-password-help verify-validation" :aria-invalid="!!validationError" />
          </label>
          <p id="verify-password-help" class="registration-auth__hint">Ít nhất 12 ký tự, tối đa 72 byte UTF-8.</p>
          <label class="registration-auth__field" for="verify-confirmation">Xác nhận mật khẩu
            <input id="verify-confirmation" v-model="confirmation" type="password" autocomplete="new-password" required aria-describedby="verify-validation" :aria-invalid="!!validationError" />
          </label>
          <p id="verify-validation" class="registration-auth__error" :role="validationError ? 'alert' : undefined">{{ validationError }}</p>
          <p v-if="verification.error.value" class="registration-auth__error" role="alert">{{ verification.error.value }}</p>
          <AppButton type="submit" :loading="verification.pending.value">Xác minh và đặt mật khẩu</AppButton>
        </fieldset>
      </form>
      <AuthSignInAction />
      <AppLink :to="{ name: ROUTE_NAMES.REGISTER }" variant="muted">Về trang đăng ký</AppLink>
    </section>
  </AppContainer>
</template>
