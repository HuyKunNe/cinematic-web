<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { completeSignIn } from '../services/auth.service'

const router = useRouter()
const errorMessage = ref('')

onMounted(async () => {
  try {
    const returnTo = await completeSignIn()
    await router.replace(returnTo)
  } catch {
    errorMessage.value = 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.'
  }
})
</script>

<template>
  <section class="auth-callback" aria-live="polite">
    <p v-if="!errorMessage">Đang hoàn tất đăng nhập…</p>
    <p v-else role="alert">{{ errorMessage }}</p>
  </section>
</template>
