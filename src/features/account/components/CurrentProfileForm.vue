<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import {
  profileErrorMessage,
  useUpdateCurrentProfile,
  type CurrentProfile,
} from '../api/current-profile'

const props = defineProps<{ profile: CurrentProfile; disabled: boolean }>()
const emit = defineEmits<{ 'dirty-change': [dirty: boolean]; 'saving-change': [saving: boolean] }>()
const auth = useAuthStore()
const mutation = useUpdateCurrentProfile()
const fields = reactive({ firstName: '', lastName: '', phoneNumber: '' })
const errors = ref<Record<string, string>>({})
const feedback = ref('')
const failed = ref(false)
const schema = z.object({
  firstName: z.string().trim().max(100, 'Tên tối đa 100 ký tự.'),
  lastName: z.string().trim().max(100, 'Họ tối đa 100 ký tự.'),
  phoneNumber: z.string().trim().max(32, 'Số điện thoại tối đa 32 ký tự.'),
})
const dirty = computed(
  () =>
    fields.firstName !== props.profile.firstName ||
    fields.lastName !== props.profile.lastName ||
    fields.phoneNumber !== props.profile.phoneNumber,
)
function fillProfile() {
  Object.assign(fields, {
    firstName: props.profile.firstName,
    lastName: props.profile.lastName,
    phoneNumber: props.profile.phoneNumber,
  })
  errors.value = {}
}
function reset() {
  fillProfile()
  feedback.value = ''
}
watch(
  () => props.profile,
  (_current, previous) => {
    const unchanged =
      previous &&
      fields.firstName === previous.firstName &&
      fields.lastName === previous.lastName &&
      fields.phoneNumber === previous.phoneNumber
    if (!previous || unchanged || mutation.isPending.value) fillProfile()
  },
  { immediate: true },
)
watch(dirty, (value) => emit('dirty-change', value), { immediate: true })
watch(mutation.isPending, (value) => emit('saving-change', value), { immediate: true })
// The parent keys this form by owner, so switching accounts cannot reuse an old draft.
onBeforeRouteLeave(() => !mutation.isPending.value)
onBeforeRouteUpdate(() => !mutation.isPending.value)
async function submit() {
  if (
    mutation.isPending.value ||
    props.disabled ||
    !dirty.value ||
    auth.subject !== props.profile.id
  )
    return
  errors.value = {}
  feedback.value = ''
  const result = schema.safeParse(fields)
  if (!result.success) {
    for (const issue of result.error.issues) errors.value[String(issue.path[0])] ??= issue.message
    await nextTick()
    document.getElementById(`profile-${Object.keys(errors.value)[0]}`)?.focus()
    return
  }
  try {
    const saved = await mutation.mutateAsync({ request: result.data, owner: props.profile.id })
    Object.assign(fields, {
      firstName: saved.firstName,
      lastName: saved.lastName,
      phoneNumber: saved.phoneNumber,
    })
    errors.value = {}
    failed.value = false
    feedback.value = 'Đã lưu thông tin hồ sơ.'
  } catch (cause) {
    failed.value = true
    feedback.value = profileErrorMessage(cause)
  }
}
</script>

<template>
  <form class="current-profile-form" novalidate @submit.prevent="submit">
    <p class="booking-note">Thông tin liên hệ giúp rạp hỗ trợ bạn thuận tiện hơn.</p>
    <label class="current-profile-form__field" for="profile-email"
      >Email
      <input
        id="profile-email"
        :value="profile.email"
        type="email"
        readonly
        autocomplete="email"
        aria-describedby="profile-email-help"
      />
    </label>
    <p id="profile-email-help" class="booking-note">
      {{ profile.emailVerifiedAt ? 'Email đã được xác minh.' : 'Email chưa được xác minh.' }} Email
      đăng nhập không thay đổi tại đây.
    </p>
    <fieldset
      :disabled="disabled || mutation.isPending.value"
      :aria-busy="mutation.isPending.value"
    >
      <div class="current-profile-form__names">
        <label class="current-profile-form__field" for="profile-lastName"
          >Họ
          <input
            id="profile-lastName"
            v-model="fields.lastName"
            autocomplete="family-name"
            maxlength="100"
            :aria-invalid="!!errors.lastName"
            :aria-describedby="errors.lastName ? 'profile-lastName-error' : undefined"
          />
          <span v-if="errors.lastName" id="profile-lastName-error" class="booking-error">{{
            errors.lastName
          }}</span>
        </label>
        <label class="current-profile-form__field" for="profile-firstName"
          >Tên
          <input
            id="profile-firstName"
            v-model="fields.firstName"
            autocomplete="given-name"
            maxlength="100"
            :aria-invalid="!!errors.firstName"
            :aria-describedby="errors.firstName ? 'profile-firstName-error' : undefined"
          />
          <span v-if="errors.firstName" id="profile-firstName-error" class="booking-error">{{
            errors.firstName
          }}</span>
        </label>
      </div>
      <label class="current-profile-form__field" for="profile-phoneNumber"
        >Số điện thoại
        <input
          id="profile-phoneNumber"
          v-model="fields.phoneNumber"
          type="tel"
          autocomplete="tel"
          maxlength="32"
          :aria-invalid="!!errors.phoneNumber"
          :aria-describedby="errors.phoneNumber ? 'profile-phoneNumber-error' : undefined"
        />
      </label>
      <p v-if="errors.phoneNumber" id="profile-phoneNumber-error" class="booking-error">
        {{ errors.phoneNumber }}
      </p>
      <p
        v-if="feedback"
        :class="failed ? 'booking-error' : 'current-profile-form__success'"
        :role="failed ? 'alert' : 'status'"
      >
        {{ feedback }}
      </p>
      <div class="current-profile-form__actions">
        <AppButton type="submit" :loading="mutation.isPending.value" :disabled="!dirty"
          >Lưu thay đổi</AppButton
        >
        <AppButton variant="ghost" :disabled="!dirty || mutation.isPending.value" @click="reset"
          >Hoàn tác</AppButton
        >
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
@reference '../../../styles/main.css';
.current-profile-form,
.current-profile-form fieldset {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}
.current-profile-form fieldset {
  padding: 0;
  border: 0;
  margin: 0;
}
.current-profile-form__names {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}
.current-profile-form__field {
  display: grid;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.current-profile-form input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: var(--control-height-md);
  padding: var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}
.current-profile-form input:read-only {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
}
.current-profile-form input[aria-invalid='true'] {
  border-color: var(--color-error);
}
.current-profile-form input:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
.current-profile-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.current-profile-form__success {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
@variant lumiere-mobile {
  .current-profile-form__names {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
