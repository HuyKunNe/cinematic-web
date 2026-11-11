<script setup lang="ts">
import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import CustomerAccountNav from '@/components/navigation/CustomerAccountNav.vue'
import { useAuthStore } from '@/stores/auth.store'
import { restoreAuthSession, signOut } from '@/features/auth'
const auth = useAuthStore()
const queries = useQueryClient()
const pending = ref(false)
const error = ref('')
async function logout() {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    await signOut()
    queries.clear()
  } catch {
    await restoreAuthSession()
    error.value = 'Chưa thể đăng xuất. Vui lòng thử lại.'
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="booking-start-page">
    <AppContainer
      ><header class="lumiere-account-heading">
        <p class="lumiere-eyebrow">TÀI KHOẢN LUMIÈRE</p>
        <h1>Xin chào, {{ auth.username || 'bạn' }}</h1>
        <p>Thông tin của bạn và những cuộc hẹn điện ảnh đã lưu.</p>
      </header>
      <div class="lumiere-account-layout">
        <CustomerAccountNav />
        <section class="booking-panel" aria-labelledby="customer-profile-title">
          <h2 id="customer-profile-title">Hồ sơ của tôi</h2>
          <dl class="customer-profile__facts">
            <div>
              <dt>Tên hiển thị</dt>
              <dd>{{ auth.username || 'Chưa có thông tin' }}</dd>
            </div>
            <div>
              <dt>Mã tài khoản</dt>
              <dd>{{ auth.subject }}</dd>
            </div>
          </dl>
          <p class="booking-note">
            Thông tin đăng nhập được quản lý qua tài khoản xác thực của bạn.
          </p>
          <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
          <AppButton variant="secondary" :loading="pending" @click="logout">Đăng xuất</AppButton>
        </section>
      </div></AppContainer
    >
  </div>
</template>
