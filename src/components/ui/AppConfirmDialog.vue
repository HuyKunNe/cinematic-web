<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import AppButton from './AppButton.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  pending?: boolean
  confirmLabel?: string
}>(), { pending: false, confirmLabel: 'Xóa bản nháp' })

const emit = defineEmits<{ cancel: []; confirm: [] }>()

function cancel() {
  if (!props.pending) emit('cancel')
}
</script>

<template>
  <AlertDialogRoot :open="open" @update:open="!$event && cancel()">
    <AlertDialogPortal>
      <AlertDialogOverlay class="app-confirm-dialog__overlay" />
      <AlertDialogContent
        class="app-confirm-dialog"
        :aria-busy="pending"
        @escape-key-down="pending && $event.preventDefault()"
      >
        <AlertDialogTitle class="app-confirm-dialog__title">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="app-confirm-dialog__description">
          {{ description }}
        </AlertDialogDescription>
        <div class="app-confirm-dialog__actions">
          <AlertDialogCancel as-child>
            <AppButton variant="secondary" :disabled="pending">Giữ bản nháp</AppButton>
          </AlertDialogCancel>
          <AppButton class="app-confirm-dialog__confirm" :loading="pending" @click="emit('confirm')">
            {{ pending ? 'Đang xóa…' : confirmLabel }}
          </AppButton>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.app-confirm-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-toast);
  background: var(--color-overlay);
}
.app-confirm-dialog {
  --confirm-dialog-width: 28rem;
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: calc(var(--z-toast) + 1);
  display: grid;
  gap: var(--space-5);
  width: min(var(--confirm-dialog-width), calc(100vw - var(--space-8)));
  max-height: calc(100dvh - var(--space-8));
  overflow-y: auto;
  padding: var(--space-6);
  transform: translate(-50%, -50%);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-raised);
}
.app-confirm-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.app-confirm-dialog__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.app-confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
.app-confirm-dialog .app-confirm-dialog__confirm {
  background: var(--color-error);
  color: var(--color-on-primary);
}
.app-confirm-dialog .app-confirm-dialog__confirm:hover:not(:disabled) {
  background: var(--color-error);
  box-shadow: var(--shadow-focus);
}
</style>
