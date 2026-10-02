<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { AppButton, AppErrorState, AppSelect } from '@/components/ui'
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

function changeCity(cityKey: string) {
  draftCityKey.value = cityKey
  draftCinemaId.value = ''
  selectionError.value = ''
}

function changeCinema(cinemaId: string) {
  draftCinemaId.value = cinemaId
  selectionError.value = ''
}

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

  if (originalTrigger?.isConnected && originalTrigger.getClientRects().length > 0) {
    originalTrigger.focus()
    return
  }

  // Khi xoay màn hình, nút mở ban đầu có thể đã bị ẩn.
  const visibleTrigger = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-location-trigger]'),
  ].find((button) => !button.disabled && button.getClientRects().length > 0)

  visibleTrigger?.focus()
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
          Chọn thành phố trước, sau đó chọn rạp bạn muốn xem phim.
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

          <AppSelect
            id="cinema-location-city"
            label="Thành phố"
            :model-value="draftCityKey"
            :options="cityOptions"
            placeholder="Chọn thành phố"
            :disabled="controlsDisabled"
            required
            @update:model-value="changeCity"
          />

          <AppSelect
            id="cinema-location-cinema"
            label="Rạp"
            :model-value="draftCinemaId"
            :options="cinemaOptions"
            :placeholder="draftCityKey ? 'Chọn rạp' : 'Chọn thành phố trước'"
            :disabled="controlsDisabled || !draftCityKey"
            required
            @update:model-value="changeCinema"
          />

          <p v-if="draftCinema?.address" class="location-dialog__message">
            {{ draftCinema.address }}
          </p>

          <p v-if="selectionError" class="location-dialog__error" role="alert">
            {{ selectionError }}
          </p>

          <div class="location-dialog__actions">
            <AppButton variant="ghost" @click="emit('update:open', false)"> Hủy </AppButton>

            <AppButton type="submit" :disabled="!canApply"> Áp dụng </AppButton>
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
</style>
