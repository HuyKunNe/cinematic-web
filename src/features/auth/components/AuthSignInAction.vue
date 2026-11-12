<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { beginSignIn } from '../services/auth.service'

const pending = ref(false)
const error = ref('')
async function signIn() {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    await beginSignIn('/')
  } catch {
    pending.value = false
    error.value = 'Không thể mở trang đăng nhập. Vui lòng thử lại.'
  }
}
</script>

<template>
  <div class="registration-auth__sign-in">
    <AppButton variant="secondary" :loading="pending" @click="signIn">Đăng nhập</AppButton>
    <p>Đăng nhập bằng email hoặc chọn Google trên trang đăng nhập nếu được hỗ trợ.</p>
    <p v-if="error" class="registration-auth__error" role="alert">{{ error }}</p>
  </div>
</template>
