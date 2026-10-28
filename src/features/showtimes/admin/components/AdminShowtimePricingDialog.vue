<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
  showtimePricingErrorMessage,
  showtimePricingNeedsReload,
  showtimePricingVersionLabel,
  useAdminShowtimePricing,
  type ShowtimePricingEditorData,
} from '../api/admin-showtime-pricing'
import { showtimeStatusLabels } from '../schemas/admin-showtime.schema'

const props = defineProps<{
  showtimeId: string
  movieTitle: string
  canManage: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const actions = useAdminShowtimePricing(() => props.canManage)
const data = ref<ShowtimePricingEditorData | null>(null)
const selectedId = ref('')
const loading = ref(false)
const saving = ref(false)
const requiresReload = ref(false)
const error = ref('')
const notice = ref('')

const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const currentVersionId = computed(
  () => data.value?.showtime.pricingPolicyVersionId ?? '',
)
const publishedVersions = computed(
  () => data.value?.versions.filter((item) => item.status === 'PUBLISHED') ?? [],
)
const currentPolicy = computed(() =>
  data.value?.versions.find((item) => item.id === currentVersionId.value),
)
const selectedVersion = computed(() =>
  publishedVersions.value.find((item) => item.id === selectedId.value),
)
const unavailableCurrent = computed(
  () =>
    currentVersionId.value !== '' &&
    !publishedVersions.value.some((item) => item.id === currentVersionId.value),
)
const dirty = computed(
  () => data.value !== null && selectedId.value !== currentVersionId.value,
)
const editable = computed(
  () =>
    props.canManage &&
    !loading.value &&
    !saving.value &&
    !requiresReload.value &&
    data.value?.showtime.status === 'SCHEDULED',
)
const canSave = computed(
  () =>
    editable.value &&
    dirty.value &&
    (!selectedId.value || selectedVersion.value !== undefined) &&
    (!selectedId.value || data.value?.showtime.screeningVersion !== undefined),
)

function dateTime(value: string): string {
  return `${formatCinemaDateKey(getCinemaDateKey(value))} ${formatCinemaTime(value)}`
}

async function reload(): Promise<void> {
  if (loading.value || saving.value || !props.canManage) return

  if (
    dirty.value &&
    !window.confirm('Bỏ lựa chọn chưa lưu và tải lại dữ liệu mới nhất của suất chiếu?')
  ) {
    return
  }

  loading.value = true
  requiresReload.value = true
  error.value = ''
  notice.value = ''

  try {
    const loaded = await actions.load(props.showtimeId)
    data.value = loaded
    selectedId.value = loaded.showtime.pricingPolicyVersionId ?? ''
    requiresReload.value = false
  } catch (cause: unknown) {
    error.value = showtimePricingErrorMessage(cause)
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  const before = data.value
  const selected = selectedVersion.value

  if (!canSave.value || !before || (selectedId.value && !selected)) return

  saving.value = true
  error.value = ''
  notice.value = ''

  try {
    const saved = await actions.save.mutateAsync({
      current: before.showtime,
      selection: selected ?? null,
    })

    data.value = { ...before, showtime: saved }
    selectedId.value = saved.pricingPolicyVersionId ?? ''
    notice.value = saved.pricingPolicyVersionId
      ? 'Đã lưu bảng giá cho suất chiếu. Suất vẫn ở trạng thái “Đã lên lịch”.'
      : 'Đã bỏ bảng giá khỏi suất chiếu. Cần gán bảng giá trước khi mở bán.'

    emit('saved')
  } catch (cause: unknown) {
    error.value = showtimePricingErrorMessage(cause)
    requiresReload.value = showtimePricingNeedsReload(cause)
  } finally {
    saving.value = false
  }
}

function confirmLeave(): boolean {
  if (saving.value) return false
  return !dirty.value || window.confirm('Bỏ lựa chọn bảng giá chưa lưu?')
}

function close(): void {
  if (confirmLeave()) emit('close')
}

function handleOpenChange(open: boolean): void {
  if (!open) close()
}

function restoreFocus(event: Event): void {
  event.preventDefault()
  if (returnFocus?.isConnected) returnFocus.focus()
}

function preventUnload(event: BeforeUnloadEvent): void {
  if (!saving.value && !dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

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
        class="price-dialog showtime-pricing-dialog"
        @escape-key-down.prevent="close"
        @pointer-down-outside.prevent
        @close-auto-focus="restoreFocus"
      >
        <header class="price-dialog-head">
          <DialogTitle>Bảng giá của suất chiếu</DialogTitle>
          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            aria-label="Đóng bảng giá của suất chiếu"
            :disabled="saving"
            @click="close"
          >
            ×
          </button>
        </header>

        <DialogDescription class="price-visually-hidden">
          Chọn phiên bản bảng giá đã công bố cho suất đã lên lịch.
        </DialogDescription>

        <form class="price-dialog-form" novalidate @submit.prevent="save">
          <div class="price-dialog-body" :aria-busy="loading || saving">
            <p v-if="!canManage" class="price-notice price-notice--error" role="alert">
              Bạn cần quyền quản lý suất chiếu và bảng giá để thực hiện thao tác này.
            </p>

            <p v-if="loading" class="price-notice price-notice--info" role="status">
              Đang tải suất chiếu và các phiên bản bảng giá…
            </p>

            <p v-if="error" class="price-notice price-notice--error" role="alert">
              {{ error }}
            </p>

            <p v-if="notice" class="price-notice price-notice--success" role="status">
              {{ notice }}
            </p>

            <p
              v-if="requiresReload && data && !loading"
              class="price-notice"
              role="status"
            >
              Cần tải lại dữ liệu trước khi lưu tiếp. Lựa chọn đang nhập chưa được tự gửi lại.
            </p>

            <template v-if="data">
              <div class="price-explain">
                <p class="price-note"><strong>{{ movieTitle }}</strong></p>
                <p class="price-note">
                  {{ data.showtime.cinemaName }} · {{ data.showtime.roomName }}
                </p>
                <p class="price-note">
                  {{ dateTime(data.showtime.startsAt) }} – {{ dateTime(data.showtime.endsAt) }}
                </p>
                <p class="price-note">
                  {{ showtimeStatusLabels[data.showtime.status] }}
                  <template v-if="data.showtime.screeningVersion">
                    · {{ data.showtime.screeningVersion.contentFormat }}
                  </template>
                </p>
                <p class="price-note">
                  Bảng giá đang gán:
                  {{
                    currentPolicy
                      ? showtimePricingVersionLabel(currentPolicy)
                      : currentVersionId
                        ? currentVersionId
                        : 'Chưa gán bảng giá'
                  }}
                </p>
              </div>

              <p
                v-if="data.showtime.status !== 'SCHEDULED'"
                class="price-notice price-notice--info price-space-top"
              >
                Suất không còn ở trạng thái “Đã lên lịch”, nên không thể thay đổi bảng giá.
              </p>

              <p
                v-if="!data.showtime.screeningVersion"
                class="price-notice price-space-top"
              >
                Suất chưa có phiên bản chiếu đã lưu nên chưa đủ thông tin để gán bảng giá.
              </p>

              <div class="price-form-grid price-space-top">
                <label class="price-field price-full">
                  <span>Phiên bản bảng giá</span>
                  <select
                    v-model="selectedId"
                    class="price-control"
                    :disabled="!editable"
                  >
                    <option value="">Chưa gán bảng giá</option>
                    <option
                      v-if="unavailableCurrent"
                      :value="currentVersionId"
                      disabled
                    >
                      {{
                        currentPolicy
                          ? showtimePricingVersionLabel(currentPolicy)
                          : 'Phiên bản đang gán'
                      }}
                      · Không còn trong lựa chọn đã công bố
                    </option>
                    <option
                      v-for="version in publishedVersions"
                      :key="version.id"
                      :value="version.id"
                    >
                      {{ showtimePricingVersionLabel(version) }}
                    </option>
                  </select>
                  <span v-if="selectedVersion?.description" class="price-note">
                    {{ selectedVersion.description }}
                  </span>
                </label>
              </div>

              <p
                v-if="!publishedVersions.length && !loading"
                class="price-notice price-notice--info price-space-top"
              >
                Cụm rạp chưa có phiên bản bảng giá đã công bố để lựa chọn.
              </p>

              <p
                v-if="dirty && selectedId === ''"
                class="price-notice price-space-top"
              >
                Bạn đang bỏ bảng giá của suất chiếu. Suất cần được gán bảng giá trước khi mở bán.
              </p>

              <p class="price-note price-space-top">
                Chọn trực tiếp bảng giá Ngày thường, Cuối tuần hoặc Lễ/Tết phù hợp.
                Hệ thống kiểm tra loại phòng, định dạng, giờ chiếu và hạng ghế khi lưu.
              </p>
              <p class="price-note">
                Giá ghế được áp dụng theo nhóm vé mặc định của bảng giá.
                Giá ghế đôi là giá cho cả cặp; mỗi định dạng có giá riêng, không cộng phụ thu.
              </p>
            </template>
          </div>

          <footer class="price-dialog-foot">
            <button
              class="price-button"
              type="button"
              :disabled="saving"
              @click="close"
            >
              Đóng
            </button>
            <button
              class="price-button"
              type="button"
              :disabled="loading || saving || !canManage"
              @click="reload"
            >
              Tải lại dữ liệu
            </button>
            <button
              class="price-button price-button--primary"
              type="submit"
              :disabled="!canSave"
            >
              {{ saving ? 'Đang lưu…' : 'Lưu bảng giá' }}
            </button>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.price-dialog.showtime-pricing-dialog {
  --price-dialog-width: 44rem;
}

.showtime-pricing-dialog .price-dialog-form {
  flex: 1 1 auto;
}
</style>