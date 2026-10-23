<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import AppButton from '@/components/ui/AppButton.vue'
import { APP_PERMISSIONS } from '@/config/authorization'
import { ReplaceRoomContentFormatsRequestFormatsItem } from '@/services/api/generated/inventory-service/model'
import { useAuthStore } from '@/stores/auth.store'
import { adminRoomErrorMessage, isAdminRoomApiError } from '../schemas/admin-room.schema'
import {
  useAdminRoomContentFormatsQuery,
  useReplaceAdminRoomContentFormatsMutation,
} from '../api/admin-room-content-formats-queries'

const props = defineProps<{
  roomId: string
  roomName: string
  returnFocusId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const auth = useAuthStore()
const canManage = computed(
  () =>
    auth.isAuthenticated && auth.isAdmin && auth.hasPermission(APP_PERMISSIONS.INVENTORY_MANAGE),
)

const detail = useAdminRoomContentFormatsQuery(() => props.roomId, canManage)
const mutation = useReplaceAdminRoomContentFormatsMutation()

const selectedFormats = ref<ReplaceRoomContentFormatsRequestFormatsItem[]>([])
const requestError = ref('')
const busy = computed(() => mutation.isPending.value)

const ready = computed(
  () => detail.data.value?.roomId === props.roomId && typeof detail.data.value.version === 'number',
)

const formatOptions = computed(() => detail.data.value?.supportedFormatOptions ?? [])

const isDirty = computed(() => {
  const saved = [...(detail.data.value?.formats ?? [])].sort()
  const selected = [...selectedFormats.value].sort()

  return saved.join('|') !== selected.join('|')
})

watch(
  detail.data,
  (response) => {
    if (response?.roomId !== props.roomId) return

    selectedFormats.value = [...(response.formats ?? [])]
    requestError.value = ''
  },
  { immediate: true },
)

function close() {
  if (!busy.value) emit('close')
}

function onOpenChange(open: boolean) {
  if (!open) close()
}

function focusCloseButton(event: Event) {
  event.preventDefault()
  document.getElementById('admin-room-content-formats-close')?.focus()
}

function preventDuringSave(event: Event) {
  if (busy.value) event.preventDefault()
}

function restoreFocus(event: Event) {
  event.preventDefault()

  void nextTick(() => {
    const target =
      document.getElementById(props.returnFocusId) ?? document.getElementById('admin-rooms-title')

    target?.focus()
  })
}

async function save() {
  const response = detail.data.value

  if (
    !canManage.value ||
    !response ||
    response.roomId !== props.roomId ||
    typeof response.version !== 'number' ||
    busy.value
  ) {
    return
  }

  requestError.value = ''

  try {
    await mutation.mutateAsync({
      roomId: props.roomId,
      input: {
        expectedVersion: response.version,
        formats: [...selectedFormats.value],
      },
    })

    emit('saved')
  } catch (error) {
    requestError.value = adminRoomErrorMessage(error, 'Không thể cập nhật định dạng nội dung.')

    if (isAdminRoomApiError(error) && error.code === 'INVENTORY_ROOM_VERSION_CONFLICT') {
      await detail.refetch()
    }
  }
}
</script>

<template>
  <DialogRoot :open="true" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="admin-room-dialog__overlay" />

      <DialogContent
        class="admin-room-dialog"
        :aria-busy="busy || detail.isFetching.value"
        @open-auto-focus="focusCloseButton"
        @close-auto-focus="restoreFocus"
        @escape-key-down="preventDuringSave"
        @interact-outside="preventDuringSave"
      >
        <header class="admin-room-dialog__heading">
          <div>
            <DialogTitle class="admin-room-dialog__title"> Định dạng nội dung </DialogTitle>
            <DialogDescription class="admin-rooms__muted">
              {{ roomName }}
            </DialogDescription>
          </div>

          <AppButton
            id="admin-room-content-formats-close"
            variant="ghost"
            size="sm"
            :disabled="busy"
            @click="close"
          >
            Đóng
          </AppButton>
        </header>

        <p v-if="!canManage" class="admin-rooms__error" role="alert">
          Tài khoản không còn quyền quản lý phòng.
        </p>

        <template v-else>
          <p v-if="detail.isFetching.value && !detail.data.value" role="status">
            Đang tải định dạng được hỗ trợ…
          </p>

          <div v-else-if="detail.isError.value && !detail.data.value" class="admin-rooms__feedback">
            <p class="admin-rooms__error" role="alert">
              {{ adminRoomErrorMessage(detail.error.value, 'Không thể tải định dạng phòng.') }}
            </p>
            <AppButton
              variant="secondary"
              :loading="detail.isFetching.value"
              @click="detail.refetch()"
            >
              Thử lại
            </AppButton>
          </div>

          <form v-else-if="ready" class="admin-room-content-form" @submit.prevent="save">
            <fieldset class="admin-room-content-form__options" :disabled="busy || !canManage">
              <legend>Định dạng nội dung phòng hỗ trợ</legend>

              <label
                v-for="format in formatOptions"
                :key="format"
                class="admin-room-content-form__option"
              >
                <input v-model="selectedFormats" type="checkbox" :value="format" />
                <span>{{ format }}</span>
              </label>

              <p v-if="!formatOptions.length" class="admin-rooms__muted">
                API hiện không trả về định dạng nào có thể chọn.
              </p>
            </fieldset>

            <p class="admin-rooms__muted">
              Định dạng 2D/3D được quản lý riêng với loại phòng. Bỏ chọn tất cả sẽ lưu phòng không
              khai báo định dạng nội dung.
            </p>

            <p v-if="requestError" class="admin-rooms__error" role="alert">
              {{ requestError }}
            </p>

            <footer class="admin-room-form__actions">
              <AppButton variant="secondary" type="button" :disabled="busy" @click="close">
                Hủy
              </AppButton>
              <AppButton type="submit" :loading="busy" :disabled="!ready || !canManage || !isDirty">
                Lưu định dạng
              </AppButton>
            </footer>
          </form>

          <div v-else class="admin-rooms__feedback">
            <p class="admin-rooms__error" role="alert">
              Không nhận được phiên bản định dạng hợp lệ từ API.
            </p>
            <AppButton variant="secondary" @click="detail.refetch()"> Tải lại </AppButton>
          </div>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
