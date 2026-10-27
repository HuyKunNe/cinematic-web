<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import {
  pricingErrorMessage,
  pricingLabel,
  pricingSeatLabel,
  useAdminPricingActions,
  type PricingCinema,
  type PricingDetail,
} from '../api/admin-pricing-queries'
import { useAdminPricingVersions } from '../api/admin-pricing-list'
import {
  pricingQuoteErrorCode,
  pricingQuoteErrorMessage,
  publishedQuoteFormSchema,
  useAdminPublishedPricingQuote,
  type PublishedPricingQuoteInput,
} from '../api/admin-pricing-quote'

const props = defineProps<{
  cinemas: PricingCinema[]
  anchorCinemaId: string
  canManage: boolean
  initial: PricingDetail
}>()

const emit = defineEmits<{ close: [] }>()

const detail = ref<PricingDetail>(props.initial)
const versionId = ref(props.initial.policy.id)
const loadingVersion = ref(false)
const versionError = ref('')

const cinemaId = ref(props.anchorCinemaId)
const experienceType = ref('')
const contentFormat = ref('')
const seatType = ref('')
const ticketCategory = ref('')
const time = ref('17:00')

function vietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

const date = ref(vietnamToday())

const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

const actions = useAdminPricingActions(() => props.canManage)

const versions = useAdminPricingVersions(
  () => ({
    cinemaId: props.anchorCinemaId,
    policyId: detail.value.policy.policyId,
    versionId: detail.value.policy.id,
  }),
  () => props.canManage,
)

const publishedVersions = computed(() =>
  (versions.data.value ?? []).filter((item) => item.status === 'PUBLISHED'),
)

const availableCinemas = computed(() =>
  props.cinemas.filter((item) => detail.value.policy.cinemaIds.includes(item.id)),
)

const experiences = computed(() => [
  ...new Set(detail.value.matrix.scopes.map((item) => item.experienceType)),
])

const formats = computed(() =>
  detail.value.matrix.scopes
    .filter((item) => item.experienceType === experienceType.value)
    .map((item) => item.contentFormat),
)

watch(
  availableCinemas,
  (items) => {
    if (!items.some((item) => item.id === cinemaId.value)) {
      cinemaId.value = items[0]?.id ?? ''
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  experiences,
  (items) => {
    if (!items.some((item) => item === experienceType.value)) {
      experienceType.value = items[0] ?? ''
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  formats,
  (items) => {
    if (!items.some((item) => item === contentFormat.value)) {
      contentFormat.value = items[0] ?? ''
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  () => detail.value.matrix.seatTypes,
  (items) => {
    if (!items.some((item) => item === seatType.value)) {
      seatType.value = items[0] ?? ''
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  () => detail.value.matrix.ticketCategories,
  (items) => {
    if (!items.some((item) => item === ticketCategory.value)) {
      ticketCategory.value = items[0] ?? ''
    }
  },
  { immediate: true, flush: 'sync' },
)

const quoteInput = computed<PublishedPricingQuoteInput | null>(() => {
  const current = detail.value

  if (
    !props.canManage ||
    loadingVersion.value ||
    current.policy.status !== 'PUBLISHED' ||
    current.matrix.status !== 'PUBLISHED'
  ) {
    return null
  }

  const parsed = publishedQuoteFormSchema.safeParse({
    cinemaId: cinemaId.value,
    date: date.value,
    time: time.value,
    experienceType: experienceType.value,
    contentFormat: contentFormat.value,
    seatType: seatType.value,
    ticketCategory: ticketCategory.value,
  })

  if (!parsed.success) return null

  const selected = parsed.data
  const seatOption = current.matrix.options.seatTypes.find(
    (item) => item.seatType === selected.seatType,
  )

  if (
    !seatOption ||
    !availableCinemas.value.some((item) => item.id === selected.cinemaId) ||
    !current.matrix.scopes.some(
      (item) =>
        item.experienceType === selected.experienceType &&
        item.contentFormat === selected.contentFormat,
    ) ||
    !current.matrix.seatTypes.some((item) => item === selected.seatType) ||
    !current.matrix.ticketCategories.some((item) => item === selected.ticketCategory)
  ) {
    return null
  }

  return {
    context: {
      cinemaId: selected.cinemaId,
      policyId: current.policy.policyId,
      versionId: current.policy.id,
    },
    request: {
      startsAt: `${selected.date}T${selected.time}:00+07:00`,
      experienceType: selected.experienceType,
      contentFormat: selected.contentFormat,
      seatType: selected.seatType,
      ticketCategory: selected.ticketCategory,
    },
    revision: current.policy.revision,
    dayGroup: current.policy.dayGroup,
    unit: seatOption.unit,
    capacityPerUnit: seatOption.capacity,
  }
})

const quoteQuery = useAdminPublishedPricingQuote(
  quoteInput,
  () => props.canManage && !loadingVersion.value,
)

const result = computed(() => {
  if (!quoteInput.value || quoteQuery.isFetching.value || !quoteQuery.isSuccess.value) {
    return undefined
  }

  return quoteQuery.data.value
})

const notApplicable = computed(
  () => pricingQuoteErrorCode(quoteQuery.error.value) === 'INVENTORY_PRICING_FARE_NOT_APPLICABLE',
)

function money(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(amount)}đ`
}

function localDateTime(startsAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(startsAt))
}

async function changeVersion(event: Event): Promise<void> {
  const target = event.target

  if (!(target instanceof HTMLSelectElement) || loadingVersion.value || !props.canManage) {
    return
  }

  const selectedId = target.value
  const selected = publishedVersions.value.find((item) => item.id === selectedId)

  if (!selected) return

  versionId.value = selected.id
  loadingVersion.value = true
  versionError.value = ''

  try {
    const loaded = await actions.loadDetail({
      cinemaId: props.anchorCinemaId,
      policyId: selected.policyId,
      versionId: selected.id,
    })

    if (loaded.policy.status !== 'PUBLISHED') {
      throw new Error('Phiên bản được chọn chưa được công bố.')
    }

    detail.value = loaded
  } catch (error: unknown) {
    versionId.value = detail.value.policy.id
    versionError.value = pricingErrorMessage(error)
  } finally {
    loadingVersion.value = false
  }
}

function close(): void {
  emit('close')
}

function handleOpenChange(open: boolean): void {
  if (!open) close()
}

function restoreFocus(event: Event): void {
  event.preventDefault()
  if (returnFocus?.isConnected) returnFocus.focus()
}
</script>

<template>
  <DialogRoot :open="true" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="price-dialog-overlay" />
      <DialogContent
        class="price-dialog price-dialog--preview"
        @escape-key-down.prevent="close"
        @pointer-down-outside.prevent
        @close-auto-focus="restoreFocus"
      >
        <header class="price-dialog-head">
          <DialogTitle>Tra cứu giá vé</DialogTitle>

          <button
            class="price-button price-button--icon price-button--ghost"
            type="button"
            aria-label="Đóng tra cứu giá"
            @click="close"
          >
            <svg class="price-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12 M6 18L18 6" />
            </svg>
          </button>
        </header>

        <DialogDescription class="price-visually-hidden">
          Tra giá bảng đã công bố theo cụm rạp, ngày giờ chiếu, loại phòng, định dạng, hạng ghế và
          đối tượng vé.
        </DialogDescription>

        <form class="price-dialog-form" @submit.prevent>
          <div class="price-dialog-body">
            <p class="price-notice price-notice--info">
              {{ detail.policy.description || 'Bảng giá được chọn trực tiếp theo suất chiếu.' }}
              Giá được lấy từ hệ thống theo phiên bản đã công bố.
            </p>

            <p v-if="!canManage" class="price-notice price-notice--error" role="alert">
              Bạn không có quyền tra giá.
            </p>

            <p v-if="versionError" class="price-notice price-notice--error" role="alert">
              {{ versionError }}
            </p>

            <label v-if="publishedVersions.length" class="price-history">
              <span>Phiên bản đã công bố</span>
              <select
                class="price-control"
                :value="versionId"
                :disabled="loadingVersion || !canManage"
                @change="changeVersion"
              >
                <option v-for="version in publishedVersions" :key="version.id" :value="version.id">
                  {{ version.revision }} · {{ version.name }}
                </option>
              </select>
            </label>

            <p v-if="versions.isError.value" class="price-note" role="status">
              Chưa tải được lịch sử phiên bản. Bạn vẫn có thể tra giá phiên bản đang mở.
            </p>

            <div class="price-form-grid">
              <label class="price-field">
                <span>Cụm rạp</span>
                <select
                  v-model="cinemaId"
                  class="price-control"
                  :disabled="loadingVersion || !canManage"
                >
                  <option v-for="cinema in availableCinemas" :key="cinema.id" :value="cinema.id">
                    {{ cinema.name }}
                  </option>
                </select>
              </label>

              <label class="price-field">
                <span>Loại phòng</span>
                <select
                  v-model="experienceType"
                  class="price-control"
                  :disabled="loadingVersion || !canManage"
                >
                  <option v-for="item in experiences" :key="item" :value="item">
                    {{ pricingLabel(item) }}
                  </option>
                </select>
              </label>

              <label class="price-field">
                <span>Định dạng</span>
                <select
                  v-model="contentFormat"
                  class="price-control"
                  :disabled="loadingVersion || !canManage"
                >
                  <option v-for="item in formats" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
              </label>

              <label class="price-field">
                <span>Ngày chiếu</span>
                <input
                  v-model="date"
                  class="price-control"
                  type="date"
                  :disabled="loadingVersion || !canManage"
                />
              </label>

              <label class="price-field">
                <span>Giờ bắt đầu</span>
                <input
                  v-model="time"
                  class="price-control"
                  type="time"
                  step="60"
                  :disabled="loadingVersion || !canManage"
                />
              </label>

              <label class="price-field">
                <span>Hạng ghế</span>
                <select
                  v-model="seatType"
                  class="price-control"
                  :disabled="loadingVersion || !canManage"
                >
                  <option v-for="item in detail.matrix.seatTypes" :key="item" :value="item">
                    {{ pricingSeatLabel(item) }}
                  </option>
                </select>
              </label>

              <label class="price-field">
                <span>Đối tượng vé</span>
                <select
                  v-model="ticketCategory"
                  class="price-control"
                  :disabled="loadingVersion || !canManage"
                >
                  <option v-for="item in detail.matrix.ticketCategories" :key="item" :value="item">
                    {{ pricingLabel(item) }}
                  </option>
                </select>
              </label>

              <p class="price-note price-full">
                Ngày và giờ nhập theo giờ Việt Nam, UTC+07:00. Hệ thống tính khung giá theo múi giờ
                của cụm rạp.
              </p>
            </div>

            <div
              class="price-explain"
              aria-live="polite"
              :aria-busy="loadingVersion || quoteQuery.isFetching.value"
            >
              <p class="price-note">
                {{ detail.policy.name }} · {{ pricingLabel(detail.policy.dayGroup) }} · Phiên bản
                {{ detail.policy.revision }}
              </p>

              <p
                v-if="loadingVersion || quoteQuery.isFetching.value"
                class="price-explain-value"
                role="status"
              >
                <strong>Đang tra giá…</strong>
              </p>

              <p v-else-if="!quoteInput" class="price-explain-value">
                <strong>Chọn đủ thông tin tra giá</strong>
              </p>

              <template v-else-if="quoteQuery.isError.value">
                <p class="price-explain-value">
                  <strong>
                    {{ notApplicable ? 'Không áp dụng' : 'Chưa tra được giá' }}
                  </strong>
                </p>
                <p class="price-note" role="alert">
                  {{ pricingQuoteErrorMessage(quoteQuery.error.value) }}
                </p>
                <button
                  class="price-button price-button--small"
                  type="button"
                  :disabled="!canManage"
                  @click="quoteQuery.refetch()"
                >
                  Thử lại
                </button>
              </template>

              <template v-else-if="result">
                <p class="price-explain-value">
                  <strong>{{ money(result.fare.amount) }}</strong>
                  <span class="price-unit"> /{{ pricingLabel(result.fare.unit) }} </span>
                </p>
                <p class="price-note">
                  {{ pricingLabel(result.fare.experienceType) }} · {{ result.fare.contentFormat }} ·
                  {{ pricingSeatLabel(result.fare.seatType) }} ·
                  {{ pricingLabel(result.fare.ticketCategory) }}
                </p>
                <p class="price-note">
                  {{ localDateTime(result.localStartsAt, result.cinemaTimeZone) }}
                  · {{ result.cinemaTimeZone }} ·
                  {{ pricingLabel(result.fare.timeBand) }}
                </p>
                <p class="price-note">
                  Một đơn vị giá tương ứng {{ result.capacityPerUnit }} chỗ. Giá bán trọn gói, không
                  cộng phụ thu.
                  {{ result.fare.amount === 0 ? 'Giá 0đ là miễn phí.' : '' }}
                </p>
              </template>

              <p class="price-note">
                Tra theo bảng đã chọn; không tự xác định lịch Lễ/Tết. Kết quả này chưa xác nhận
                phòng, ghế còn trống hoặc giá trị đơn đặt vé.
              </p>
            </div>
          </div>

          <footer class="price-dialog-foot">
            <button class="price-button" type="button" @click="close">Đóng</button>
          </footer>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
