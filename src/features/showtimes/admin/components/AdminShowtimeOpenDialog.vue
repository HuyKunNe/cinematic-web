<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import {
  formatCinemaDateKey,
  formatCinemaTime,
  getCinemaDateKey,
} from '@/utils/cinema-time'
import {
  showtimeOpeningErrorMessage,
  useAdminShowtimeOpening,
  type ShowtimeOpeningDetail,
} from '../api/admin-showtime-open'
import {
  showtimePresentationLabels,
  showtimeStatusLabels,
} from '../schemas/admin-showtime.schema'

const props = defineProps<{
  showtimeId: string
  movieTitle: string
  canManage: boolean
}>()

const emit = defineEmits<{
  close: []
  opened: []
}>()

const actions = useAdminShowtimeOpening(() => props.canManage)
const detail = ref<ShowtimeOpeningDetail | null>(null)
const loading = ref(false)
const opening = ref(false)
const requiresReload = ref(false)
const error = ref('')
const notice = ref('')
const feedbackElement = ref<HTMLElement | null>(null)

const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const now = useNow({
  scheduler: (update) => useIntervalFn(update, 1_000),
})

const futureStart = computed(
  () => detail.value !== null && Date.parse(detail.value.startsAt) > now.value.getTime(),
)
const canOpen = computed(
  () =>
    props.canManage &&
    !loading.value &&
    !opening.value &&
    !requiresReload.value &&
    detail.value?.status === 'SCHEDULED' &&
    Boolean(detail.value.pricingPolicyId) &&
    Boolean(detail.value.pricingPolicyVersionId) &&
    detail.value.screeningVersion !== undefined &&
    futureStart.value,
)

function dateTime(value: string): string {
  return `${formatCinemaDateKey(getCinemaDateKey(value))} ${formatCinemaTime(value)}`
}

async function reload(): Promise<void> {
  if (loading.value || opening.value || !props.canManage) return

  loading.value = true
  requiresReload.value = true
  error.value = ''
  notice.value = ''

  try {
    detail.value = await actions.load(props.showtimeId)
    requiresReload.value = false
  } catch (cause: unknown) {
    error.value = showtimeOpeningErrorMessage(cause)
  } finally {
    loading.value = false
  }
}

async function openForBooking(): Promise<void> {
  const reviewed = detail.value
  if (!canOpen.value || !reviewed) return

  opening.value = true
  error.value = ''
  notice.value = ''

  try {
    detail.value = await actions.open.mutateAsync(reviewed)
    notice.value = 'Đã chuyển suất chiếu sang trạng thái “Đang mở bán”.'
    emit('opened')
  } catch (cause: unknown) {
    error.value = showtimeOpeningErrorMessage(cause)
    requiresReload.value = true
  } finally {
    opening.value = false
    await nextTick()
    feedbackElement.value?.focus()
  }
}

function close(): void {
  if (!opening.value) emit('close')
}

function handleOpenChange(open: boolean): void {
  if (!open) close()
}

function restoreFocus(event: Event): void {
  event.preventDefault()
  if (returnFocus?.isConnected) returnFocus.focus()
}

function preventUnload(event: BeforeUnloadEvent): void {
  if (!opening.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => !opening.value)
onBeforeRouteUpdate(() => !opening.value)

onMounted(() => {
  window.addEventListener('beforeunload', preventUnload)
  void reload()
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))
</script>

<template>
  <DialogRoot :open="true" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="price-dialog-overlay" />
      <DialogContent
        class="price-dialog showtime-open-dialog"
        @escape-key-down.prevent="close"
        @pointer-down-outside.prevent
        @close-auto-focus="restoreFocus"
      >
        <header class="price-dialog-head">
          <DialogTitle>Mở bán suất chiếu</DialogTitle>
          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            aria-label="Đóng mở bán suất chiếu"
            :disabled="opening"
            @click="close"
          >
            ×
          </button>
        </header>

        <DialogDescription class="price-visually-hidden">
          Kiểm tra phim, phòng, giờ chiếu và tình trạng gán bảng giá trước khi mở bán.
        </DialogDescription>

        <div class="price-dialog-form">
          <div class="price-dialog-body" :aria-busy="loading || opening">
            <div ref="feedbackElement" tabindex="-1">
              <p v-if="error" class="price-notice price-notice--error" role="alert">
                {{ error }}
              </p>
              <p v-if="notice" class="price-notice price-notice--success" role="status">
                {{ notice }}
              </p>
            </div>

            <p v-if="!canManage" class="price-notice price-notice--error" role="alert">
              Bạn không có quyền quản lý suất chiếu.
            </p>

            <p v-if="loading" class="price-notice price-notice--info" role="status">
              Đang tải thông tin suất chiếu…
            </p>

            <p
              v-if="requiresReload && detail && !loading"
              class="price-notice"
              role="status"
            >
              Cần tải lại để kiểm tra kết quả và thông tin hiện tại.
              Yêu cầu mở bán không được tự gửi lại.
            </p>

            <template v-if="detail">
              <div class="price-explain">
                <p class="price-note"><strong>{{ movieTitle }}</strong></p>
                <p class="price-note">
                  {{ detail.cinemaName }} · {{ detail.roomName }}
                </p>
                <p class="price-note">
                  {{ dateTime(detail.startsAt) }} – {{ dateTime(detail.endsAt) }}
                </p>
                <p v-if="detail.screeningVersion" class="price-note">
                  {{ detail.screeningVersion.contentFormat }} ·
                  {{ showtimePresentationLabels[detail.screeningVersion.presentationType] }}
                  · Âm thanh {{ detail.screeningVersion.audioLanguage }}
                </p>
                <p class="price-note">
                  Trạng thái: {{ showtimeStatusLabels[detail.status] }}
                </p>
                <p class="price-note">
                  Bảng giá:
                  {{ detail.pricingPolicyVersionId ? 'Đã gán bảng giá' : 'Chưa gán bảng giá' }}
                </p>
              </div>

              <p
                v-if="detail.status === 'OPEN_FOR_BOOKING'"
                class="price-notice price-notice--info price-space-top"
              >
                Suất hiện đang mở bán.
              </p>
              <p
                v-else-if="detail.status !== 'SCHEDULED'"
                class="price-notice price-space-top"
              >
                Trạng thái hiện tại không cho phép mở bán.
              </p>
              <template v-else>
                <p
                  v-if="!detail.pricingPolicyVersionId"
                  class="price-notice price-space-top"
                >
                  Cần gán bảng giá đã công bố trước khi mở bán.
                </p>
                <p
                  v-if="!detail.screeningVersion"
                  class="price-notice price-space-top"
                >
                  Suất chưa có phiên bản chiếu hợp lệ để áp dụng giá.
                </p>
                <p v-if="!futureStart" class="price-notice price-space-top">
                  Suất đã đến giờ bắt đầu hoặc đã qua giờ chiếu.
                </p>
              </template>

              <p class="price-note price-space-top">
                Khi mở bán, hệ thống kiểm tra phòng, cụm rạp, bảng giá và dữ liệu ghế,
                đồng thời cập nhật giá ghế theo bảng giá đang gán.
              </p>
              <p class="price-note">
                Bảng giá Lễ/Tết được giữ theo lựa chọn đã gán cho suất.
                Mỗi định dạng có giá riêng, không cộng phụ thu.
              </p>
            </template>
          </div>

          <footer class="price-dialog-foot">
            <button
              class="price-button"
              type="button"
              :disabled="opening"
              @click="close"
            >
              Đóng
            </button>
            <button
              class="price-button"
              type="button"
              :disabled="loading || opening || !canManage"
              @click="reload"
            >
              Tải lại dữ liệu
            </button>
            <button
              class="price-button price-button--primary"
              type="button"
              :disabled="!canOpen"
              @click="openForBooking"
            >
              {{ opening ? 'Đang mở bán…' : 'Mở bán' }}
            </button>
          </footer>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.price-dialog.showtime-open-dialog {
  --price-dialog-width: 44rem;
}

.showtime-open-dialog .price-dialog-form {
  flex: 1 1 auto;
}
</style>