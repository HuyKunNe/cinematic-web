<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import CustomerAccountNav from '@/components/navigation/CustomerAccountNav.vue'
import { useAuthStore } from '@/stores/auth.store'
import { restoreAuthSession, signOut } from '@/features/auth'
import CurrentProfileForm from '../components/CurrentProfileForm.vue'
import { profileErrorMessage, useCurrentProfileQuery } from '../api/current-profile'
const auth = useAuthStore()
const queries = useQueryClient()
const profileQuery = useCurrentProfileQuery()
const profile = computed(() =>
  auth.isAuthenticated && profileQuery.data.value?.id === auth.subject
    ? profileQuery.data.value
    : null,
)
const displayName = computed(
  () =>
    [profile.value?.lastName, profile.value?.firstName].filter(Boolean).join(' ') ||
    auth.username ||
    'bạn',
)
const dirty = ref(false)
const saving = ref(false)
const pending = ref(false)
const error = ref('')
watch(
  () => auth.subject,
  () => {
    dirty.value = false
    saving.value = false
    error.value = ''
  },
)
async function logout() {
  if (pending.value || saving.value) return
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
        <h1>Xin chào, {{ displayName }}</h1>
        <p>Thông tin của bạn và những cuộc hẹn điện ảnh đã lưu.</p>
      </header>
      <div class="lumiere-account-layout">
        <CustomerAccountNav />
        <section class="booking-panel" aria-labelledby="customer-profile-title">
          <h2 id="customer-profile-title">Hồ sơ của tôi</h2>
          <p v-if="profileQuery.isPending.value" class="booking-note" role="status">
            Đang tải hồ sơ…
          </p>
          <div v-if="profileQuery.isError.value">
            <p class="booking-error" role="alert">
              {{ profileErrorMessage(profileQuery.error.value) }}
            </p>
            <AppButton
              variant="ghost"
              :loading="profileQuery.isFetching.value"
              :disabled="saving || pending"
              @click="profileQuery.refetch()"
              >Thử tải lại</AppButton
            >
          </div>
          <CurrentProfileForm
            v-if="profile"
            :key="profile.id"
            :profile="profile"
            :disabled="pending || profileQuery.isFetching.value || profileQuery.isError.value"
            @dirty-change="dirty = $event"
            @saving-change="saving = $event"
          />
          <dl class="customer-profile__facts">
            <div>
              <dt>Tên đăng nhập</dt>
              <dd>{{ profile?.username || auth.username || 'Chưa có thông tin' }}</dd>
            </div>
          </dl>

          <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
          <div class="account-profile__actions">
            <AppButton
              variant="ghost"
              :loading="profileQuery.isFetching.value"
              :disabled="dirty || saving || pending"
              @click="profileQuery.refetch()"
              >Tải lại hồ sơ</AppButton
            >
            <AppButton variant="secondary" :loading="pending" :disabled="saving" @click="logout"
              >Đăng xuất</AppButton
            >
          </div>
        </section>
      </div></AppContainer
    >
  </div>
</template>

<style scoped>
.account-profile__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
