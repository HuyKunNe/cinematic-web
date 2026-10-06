<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { AppButton, AppErrorState } from '@/components/ui'
import { useCinemaLocation } from '../composables/use-cinema-location'

const props = defineProps<{
  open: boolean
  returnFocusTo: HTMLButtonElement | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { query, location, cities, cinemas, selectCinemaById } = useCinemaLocation()

const draftCityKey = ref('')
const draftCinemaId = ref('')
const selectionError = ref('')
const cinemaDropdownOpen = ref(false)
const pendingCinemaDropdown = ref(false)
const cityDropdownOpen = ref(false)
const cityDropdownClosed = ref(true)
const cityOptions = computed(() =>
  cities.value.map((city) => ({
    value: city.key,
    label: city.name,
  })),
)

const availableCinemas = computed(() =>
  cinemas.value.filter((cinema) => cinema.cityKey === draftCityKey.value),
)

const cinemaOptions = computed(() =>
  availableCinemas.value.map((cinema) => ({
    value: cinema.id,
    label: cinema.name,
  })),
)

const draftCinema = computed(() =>
  availableCinemas.value.find((cinema) => cinema.id === draftCinemaId.value),
)

const controlsDisabled = computed(() => query.isFetching.value || query.isError.value)

const canApply = computed(
  () => Boolean(draftCityKey.value && draftCinema.value) && !controlsDisabled.value,
)

function changeCity(cityKey: unknown, autoOpenCinema = false) {
  if (typeof cityKey !== 'string') return

  if (cityKey && !cityOptions.value.some((option) => option.value === cityKey)) {
    return
  }
  draftCityKey.value = cityKey
  draftCinemaId.value = ''
  selectionError.value = ''
  cinemaDropdownOpen.value = false
  pendingCinemaDropdown.value = Boolean(cityKey) && autoOpenCinema
  cityDropdownOpen.value = false
}

function changeCinema(cinemaId: unknown) {
  if (
    typeof cinemaId !== 'string' ||
    !cinemaOptions.value.some((option) => option.value === cinemaId)
  ) {
    return
  }
  draftCinemaId.value = cinemaId
  selectionError.value = ''
  cinemaDropdownOpen.value = false
  pendingCinemaDropdown.value = false
}

function updateCinemaDropdown(open: boolean) {
  pendingCinemaDropdown.value = false
  cinemaDropdownOpen.value =
    open && props.open && !controlsDisabled.value && cinemaOptions.value.length > 0
}

function updateCityDropdown(open: boolean) {
  if (open) {
    if (!props.open || controlsDisabled.value) return

    pendingCinemaDropdown.value = false
    cinemaDropdownOpen.value = false
    cityDropdownClosed.value = false
  }

  cityDropdownOpen.value = open
}

function handleCityDropdownClosed(event: Event) {
  cityDropdownClosed.value = true

  // Không trả focus về city khi đang chuyển sang chọn rạp.
  if (pendingCinemaDropdown.value) {
    event.preventDefault()
  }
}

watch(
  [
    () => props.open,
    pendingCinemaDropdown,
    controlsDisabled,
    cinemaOptions,
    cityDropdownOpen,
    cityDropdownClosed,
  ],
  ([dialogOpen, pending, disabled, options, cityOpen, cityClosed], _previous, onCleanup) => {
    if (!dialogOpen) {
      cityDropdownOpen.value = false
      cityDropdownClosed.value = true
      cinemaDropdownOpen.value = false
      pendingCinemaDropdown.value = false
      return
    }

    if (disabled) {
      cinemaDropdownOpen.value = false
      return
    }

    if (!pending || cityOpen || !cityClosed) return

    if (!options.length) {
      pendingCinemaDropdown.value = false
      return
    }

    const requestedCity = draftCityKey.value
    let cancelled = false
    let frame: number | undefined

    void nextTick(() => {
      if (cancelled) return

      frame = window.requestAnimationFrame(() => {
        if (
          cancelled ||
          !props.open ||
          !pendingCinemaDropdown.value ||
          controlsDisabled.value ||
          cityDropdownOpen.value ||
          !cityDropdownClosed.value ||
          draftCityKey.value !== requestedCity ||
          !cinemaOptions.value.length
        ) {
          return
        }

        pendingCinemaDropdown.value = false
        cinemaDropdownOpen.value = true
      })
    })

    onCleanup(() => {
      cancelled = true
      if (frame !== undefined) window.cancelAnimationFrame(frame)
    })
  },
  { flush: 'post' },
)

function applySelection() {
  if (!canApply.value) return

  const applied = selectCinemaById(draftCinemaId.value, draftCityKey.value)

  if (!applied) {
    selectionError.value = 'Rạp này không còn khả dụng. Vui lòng chọn lại.'
    return
  }

  emit('update:open', false)
}

function restoreFocus(event: Event) {
  event.preventDefault()

  const originalTrigger = props.returnFocusTo

  void nextTick(() => {
    if (props.open) return

    // Đổi rạp có thể remount Quick Booking.
    const replacementTrigger = originalTrigger?.id
      ? document.getElementById(originalTrigger.id)
      : null

    const candidates = [
      originalTrigger,
      replacementTrigger,
      ...document.querySelectorAll<HTMLButtonElement>('[data-location-trigger]'),
    ]

    const visibleTrigger = candidates.find(
      (element): element is HTMLButtonElement =>
        element instanceof HTMLButtonElement &&
        element.isConnected &&
        !element.disabled &&
        element.getClientRects().length > 0,
    )

    visibleTrigger?.focus()
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return

    draftCityKey.value = location.selectedCityKey
    draftCinemaId.value = location.selectedCinemaId
    selectionError.value = ''

    void query.refetch()
  },
  { immediate: true },
)

watch(query.data, (catalog) => {
  if (!catalog || !props.open) return

  if (draftCityKey.value && !catalog.cities.some((city) => city.key === draftCityKey.value)) {
    changeCity('')
    selectionError.value = 'Thành phố đã chọn không còn rạp hoạt động.'
    return
  }

  if (
    draftCinemaId.value &&
    !catalog.cinemas.some(
      (cinema) => cinema.id === draftCinemaId.value && cinema.cityKey === draftCityKey.value,
    )
  ) {
    draftCinemaId.value = ''
    selectionError.value = 'Rạp đã chọn không còn khả dụng. Vui lòng chọn lại.'
  }
})
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="location-dialog__overlay" />

      <DialogContent
        id="cinema-location-dialog"
        class="location-dialog"
        @close-auto-focus="restoreFocus"
      >
        <div class="location-dialog__heading">
          <DialogTitle class="location-dialog__title"> Chọn thành phố và rạp </DialogTitle>

          <DialogClose class="location-dialog__close" aria-label="Đóng bộ chọn địa điểm">
            <X aria-hidden="true" />
          </DialogClose>
        </div>

        <DialogDescription class="location-dialog__description">
          Chọn thành phố trước, sau đó chọn rạp. Phim và lịch chiếu sẽ được cập nhật theo rạp bạn
          chọn.
        </DialogDescription>

        <p v-if="query.isPending.value" class="location-dialog__message" role="status">
          Đang tải danh sách thành phố và rạp…
        </p>

        <AppErrorState
          v-else-if="query.isError.value && !query.data.value"
          title="Không thể tải danh sách rạp"
          description="Vui lòng thử lại để chọn địa điểm."
          show-retry
          :retrying="query.isFetching.value"
          @retry="query.refetch()"
        />

        <p v-else-if="cities.length === 0" class="location-dialog__message" role="status">
          Hiện chưa có rạp đang hoạt động.
        </p>

        <form v-else class="location-dialog__form" @submit.prevent="applySelection">
          <AppErrorState
            v-if="query.isError.value"
            title="Không thể cập nhật danh sách rạp"
            description="Vui lòng thử lại trước khi áp dụng lựa chọn."
            show-retry
            :retrying="query.isFetching.value"
            @retry="query.refetch()"
          />

          <p v-else-if="query.isFetching.value" class="location-dialog__message" role="status">
            Đang cập nhật danh sách rạp…
          </p>

          <div class="location-dialog__cinema-field">
            <label class="location-dialog__cinema-label" for="cinema-location-city">
              Thành phố
            </label>

            <SelectRoot
              :model-value="draftCityKey"
              :open="cityDropdownOpen"
              :disabled="controlsDisabled"
              required
              @update:model-value="changeCity($event, true)"
              @update:open="updateCityDropdown"
            >
              <SelectTrigger
                id="cinema-location-city"
                class="location-dialog__cinema-trigger"
                aria-label="Thành phố"
              >
                <span class="location-dialog__cinema-value">
                  <SelectValue placeholder="Chọn thành phố" />
                </span>
                <ChevronDown aria-hidden="true" />
              </SelectTrigger>

              <SelectPortal>
                <SelectContent
                  class="location-dialog__cinema-content"
                  position="popper"
                  side="bottom"
                  align="start"
                  @close-auto-focus="handleCityDropdownClosed"
                >
                  <SelectViewport>
                    <SelectItem
                      v-for="option in cityOptions"
                      :key="option.value"
                      :value="option.value"
                      class="location-dialog__cinema-item"
                    >
                      <SelectItemText>{{ option.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>

          <div class="location-dialog__cinema-field">
            <label class="location-dialog__cinema-label" for="cinema-location-cinema"> Rạp </label>

            <SelectRoot
              :model-value="draftCinemaId"
              :open="cinemaDropdownOpen"
              :disabled="controlsDisabled || !draftCityKey || !cinemaOptions.length"
              required
              @update:model-value="changeCinema"
              @update:open="updateCinemaDropdown"
            >
              <SelectTrigger
                id="cinema-location-cinema"
                class="location-dialog__cinema-trigger"
                aria-label="Rạp"
              >
                <span class="location-dialog__cinema-value">
                  <SelectValue :placeholder="draftCityKey ? 'Chọn rạp' : 'Chọn thành phố trước'" />
                </span>
                <ChevronDown aria-hidden="true" />
              </SelectTrigger>

              <SelectPortal>
                <SelectContent
                  class="location-dialog__cinema-content"
                  position="popper"
                  side="bottom"
                  align="start"
                >
                  <SelectViewport>
                    <SelectItem
                      v-for="option in cinemaOptions"
                      :key="option.value"
                      :value="option.value"
                      class="location-dialog__cinema-item"
                    >
                      <SelectItemText>{{ option.label }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>

            <p
              v-if="draftCityKey && !controlsDisabled && !cinemaOptions.length"
              class="location-dialog__message"
              role="status"
            >
              Thành phố này hiện chưa có rạp hoạt động.
            </p>
          </div>

          <p v-if="draftCinema?.address" class="location-dialog__message">
            {{ draftCinema.address }}
          </p>

          <p v-if="selectionError" class="location-dialog__error" role="alert">
            {{ selectionError }}
          </p>

          <div class="location-dialog__actions">
            <AppButton variant="ghost" @click="emit('update:open', false)"> Hủy </AppButton>
            <AppButton type="submit" :disabled="!canApply"> Áp dụng địa điểm </AppButton>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.location-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-overlay);
}

.location-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: var(--z-modal);
  width: min(
    var(--location-dialog-max-width),
    calc(
      100% - max(var(--location-dialog-edge), env(safe-area-inset-left)) -
        max(var(--location-dialog-edge), env(safe-area-inset-right))
    )
  );
  max-height: calc(
    100vh - var(--location-dialog-edge) * 2 - env(safe-area-inset-top) - env(safe-area-inset-bottom)
  );
  max-height: calc(
    100dvh - var(--location-dialog-edge) * 2 - env(safe-area-inset-top) -
      env(safe-area-inset-bottom)
  );
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding: var(--space-5);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-raised);
  transform: translate(-50%, -50%);
}

.location-dialog__heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
}

.location-dialog__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}

.location-dialog__close {
  display: grid;
  width: var(--control-height-md);
  height: var(--control-height-md);
  place-items: center;
  padding: 0;
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  background: transparent;
  cursor: pointer;
}

.location-dialog__close svg {
  width: var(--icon-size-md);
  height: var(--icon-size-md);
}

.location-dialog__close:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.location-dialog__description,
.location-dialog__message,
.location-dialog__error {
  margin: var(--space-3) 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}

.location-dialog__description,
.location-dialog__message {
  color: var(--color-text-secondary);
}

.location-dialog__error {
  color: var(--color-error);
}

.location-dialog__form {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.location-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}

.location-dialog__actions > button {
  flex: 1;
  min-width: 0;
}
.location-dialog__cinema-field {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

.location-dialog__cinema-label {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.location-dialog__cinema-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: var(--app-select-height);
  padding-inline: var(--app-select-padding-start);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  background: var(--color-surface-raised);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.location-dialog__cinema-value {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.location-dialog__cinema-trigger > svg {
  flex-shrink: 0;
  width: var(--icon-size-sm);
  height: var(--icon-size-sm);
}

.location-dialog__cinema-trigger:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.location-dialog__cinema-trigger:disabled {
  opacity: var(--app-select-disabled-opacity);
  cursor: not-allowed;
}

:global(.location-dialog__cinema-content) {
  z-index: var(--location-dialog-dropdown-layer);
  box-sizing: border-box;
  width: var(--reka-select-trigger-width);
  max-width: var(--reka-select-content-available-width);
  max-height: min(
    var(--location-dialog-dropdown-max-height),
    var(--reka-select-content-available-height)
  );
  overflow: hidden;
  padding: var(--space-1);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-raised);
}

:global(.location-dialog__cinema-item) {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
  cursor: pointer;
}

:global(.location-dialog__cinema-item[data-highlighted]) {
  outline: none;
  color: var(--color-on-primary);
  background: var(--color-primary);
}
</style>
