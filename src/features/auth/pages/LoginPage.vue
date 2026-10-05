<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { beginSignIn } from '../services/auth.service'

const route = useRoute()
const loading = ref(false)
const errorMessage = ref('Không thể mở trang đăng nhập. Vui lòng thử lại.')

async function handleSignIn() {
  if (loading.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    await beginSignIn(route.query.returnTo)
  } catch {
    loading.value = false
    errorMessage.value = 'Không thể mở trang đăng nhập. Vui lòng thử lại.'
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-page__card">
      <p class="login-page__eyebrow">Tài khoản Cinematic</p>
      <h1>Chưa thể đăng nhập</h1>

      <p class="login-page__description">Vui lòng thử lại để tiếp tục đến trang bạn đang mở.</p>

      <p v-if="errorMessage" class="login-page__error" role="alert">
        {{ errorMessage }}
      </p>

      <button
        class="login-page__submit"
        type="button"
        :disabled="loading"
        :aria-busy="loading"
        @click="handleSignIn"
      >
        {{ loading ? 'Đang chuyển tới đăng nhập…' : 'Thử lại đăng nhập' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  display: grid;
  padding-block: var(--space-12);
}

.login-page__card {
  width: min(100%, 28rem);
  margin-inline: auto;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.login-page__eyebrow {
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-wide);
  text-align: center;
  text-transform: uppercase;
}

.login-page h1 {
  color: var(--color-text-primary);
  text-align: center;
}

.login-page__description {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  text-align: center;
}

.login-page__error {
  color: var(--color-error);
}

.login-page__submit {
  width: 100%;
  min-height: var(--control-height-md);
  margin-top: var(--space-4);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.login-page__submit:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.login-page__submit:disabled {
  cursor: wait;
  opacity: 0.7;
}
</style>
