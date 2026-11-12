<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { beginSignIn } from '../services/auth.service'
import AppLink from '@/components/ui/AppLink.vue'
import AuthPageLayout from '../components/AuthPageLayout.vue'
import { ROUTE_NAMES } from '@/router/route-constants'

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
  <AuthPageLayout>
    <section class="login-page">
      <div class="login-page__card">
        <p class="login-page__eyebrow">Tài khoản Cinematic</p>
        <h1>Chào bạn trở lại</h1>
        <p class="login-page__description">
          Đăng nhập để quản lý vé và tiếp tục đặt chỗ.
        </p>

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
          {{ loading ? 'Đang chuyển tới đăng nhập…' : 'Tiếp tục đăng nhập' }}
        </button>

        <div class="login-page__links">
          <AppLink :to="{ name: ROUTE_NAMES.REGISTER }">
            Chưa có tài khoản? Đăng ký
          </AppLink>
        </div>
      </div>
    </section>
  </AuthPageLayout>
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
.login-page__links {
  display: flex;
  justify-content: center;
  margin-top: var(--space-5);
}

.login-page__links :deep(a) {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.login-page__card {
  display: grid;
  gap: var(--space-4);
}

.login-page__card h1,
.login-page__description {
  margin: 0;
}
</style>
