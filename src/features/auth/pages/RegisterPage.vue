<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { z } from 'zod'
import AuthPageLayout from '../components/AuthPageLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import AuthSignInAction from '../components/AuthSignInAction.vue'
import { useRegistration } from '../composables/use-registration'
import '@/styles/registration-auth.css'

const form = reactive({ email: '', firstName: '', lastName: '', phoneNumber: '' })
const errors = ref<Record<string, string>>({})
const registration = useRegistration()
const optionalText = (max: number) => z.string().trim().max(max, `Nhập tối đa ${max} ký tự.`)
  .transform((value) => value || undefined)
const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email.').email('Email chưa đúng định dạng.').max(320, 'Email tối đa 320 ký tự.'),
  firstName: optionalText(100), lastName: optionalText(100), phoneNumber: optionalText(32),
})
async function submit() {
  if (registration.pending.value || registration.accepted.value) return
  errors.value = {}
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0])
      errors.value[field] ??= issue.message
    }
    await nextTick()
    document.getElementById(`register-${Object.keys(errors.value)[0]}`)?.focus()
    return
  }
  await registration.submit(parsed.data)
}
</script>

<template>
  <AuthPageLayout>
    <section class="registration-auth registration-auth__card" aria-labelledby="register-title">
      <p class="lumiere-eyebrow">TÀI KHOẢN LUMIÈRE</p>
      <h1 id="register-title">Bắt đầu cuộc hẹn điện ảnh</h1>
      <template v-if="registration.accepted.value">
        <div class="registration-auth__success" role="status">
          <h2>Kiểm tra hộp thư của bạn</h2>
          <p>{{ registration.message.value }}</p>
          <p>Mở liên kết trong email để xác minh và đặt mật khẩu. Kiểm tra cả thư mục thư rác.</p>
        </div>
      </template>
      <form v-else novalidate @submit.prevent="submit">
        <p class="registration-auth__intro">Nhập email để đăng ký. Bạn sẽ đặt mật khẩu sau khi xác minh email.</p>
        <fieldset :disabled="registration.pending.value" :aria-busy="registration.pending.value">
          <label class="registration-auth__field" for="register-email">
            Email <span class="registration-auth__required">(bắt buộc)</span>
            <input id="register-email" v-model="form.email" type="email" autocomplete="email" required maxlength="320" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'register-email-error' : undefined" />
          </label>
          <p v-if="errors.email" id="register-email-error" class="registration-auth__error">{{ errors.email }}</p>
          <div class="registration-auth__names">
            <div>
              <label class="registration-auth__field" for="register-lastName">Họ (tùy chọn)
                <input id="register-lastName" v-model="form.lastName" autocomplete="family-name" maxlength="100" :aria-invalid="!!errors.lastName" :aria-describedby="errors.lastName ? 'register-lastName-error' : undefined" />
              </label>
              <p v-if="errors.lastName" id="register-lastName-error" class="registration-auth__error">{{ errors.lastName }}</p>
            </div>
            <div>
              <label class="registration-auth__field" for="register-firstName">Tên (tùy chọn)
                <input id="register-firstName" v-model="form.firstName" autocomplete="given-name" maxlength="100" :aria-invalid="!!errors.firstName" :aria-describedby="errors.firstName ? 'register-firstName-error' : undefined" />
              </label>
              <p v-if="errors.firstName" id="register-firstName-error" class="registration-auth__error">{{ errors.firstName }}</p>
            </div>
          </div>
          <label class="registration-auth__field" for="register-phoneNumber">Số điện thoại (tùy chọn)
            <input id="register-phoneNumber" v-model="form.phoneNumber" type="tel" autocomplete="tel" maxlength="32" :aria-invalid="!!errors.phoneNumber" :aria-describedby="errors.phoneNumber ? 'register-phoneNumber-error' : undefined" />
          </label>
          <p v-if="errors.phoneNumber" id="register-phoneNumber-error" class="registration-auth__error">{{ errors.phoneNumber }}</p>
          <p v-if="registration.error.value" class="registration-auth__error" role="alert">{{ registration.error.value }}</p>
          <AppButton type="submit" :loading="registration.pending.value">Đăng ký tài khoản</AppButton>
        </fieldset>
      </form>
      <AuthSignInAction />
      <AppLink :to="{ name: ROUTE_NAMES.HOME }" variant="muted">Về trang chủ</AppLink>
    </section>
  </AuthPageLayout>
</template>
