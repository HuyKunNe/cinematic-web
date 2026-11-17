<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
withDefaults(
  defineProps<{
    title: string
    location?: string
    seatNumbers: string[]
    total: string
    summaryId: string
    emptySeatLabel?: string
  }>(),
  { emptySeatLabel: 'Chưa chọn' },
)
function showSummary(id: string) {
  const summary = document.getElementById(id)
  if (!summary) return
  if (!summary.hasAttribute('tabindex')) summary.setAttribute('tabindex', '-1')
  summary.focus({ preventScroll: true })
  summary.scrollIntoView({
    block: 'start',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
</script>
<template>
  <div class="booking-mobile-recap" aria-label="Tóm tắt đặt vé">
    <div>
      <strong :title="title">{{ title }}</strong>
      <span v-if="location" :title="location">{{ location }}</span>
      <span :title="seatNumbers.join(', ')"
        >Ghế: {{ seatNumbers.join(', ') || emptySeatLabel }}</span
      >
      <button
        class="booking-mobile-recap__link"
        type="button"
        :aria-controls="summaryId"
        @click="showSummary(summaryId)"
      >
        Xem tóm tắt
      </button>
    </div>
    <div>
      <strong>{{ total }}</strong>
      <slot
        ><AppButton size="sm" :aria-controls="summaryId" @click="showSummary(summaryId)"
          >Xem tổng tiền</AppButton
        ></slot
      >
    </div>
  </div>
</template>
<style scoped>
@reference '../../../styles/main.css';
.booking-mobile-recap {
  display: none;
}
@variant lumiere-mobile {
  .booking-mobile-recap {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: var(--z-header);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
    background: var(--color-surface);
    border-top: var(--border-width-thin) solid var(--color-border);
    box-shadow: var(--shadow-card);
  }
  .booking-mobile-recap > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: start;
  }
  .booking-mobile-recap > div:last-child {
    flex-shrink: 0;
    align-items: end;
    gap: var(--space-2);
  }
  .booking-mobile-recap strong {
    display: block;
    max-width: 100%;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .booking-mobile-recap > div:last-child > strong {
    font-size: var(--font-size-lg);
    color: var(--lumiere-orange-dark);
  }
  .booking-mobile-recap span {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: var(--lumiere-caption-size);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
  }
  .booking-mobile-recap__link {
    color: var(--lumiere-orange-dark);
    font-size: var(--lumiere-caption-size);
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .booking-mobile-recap__link:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-focus);
    outline-offset: var(--space-1);
  }
}
</style>
