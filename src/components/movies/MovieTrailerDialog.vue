<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { resolveTrailerSource } from '@/utils/trailer-source'

const props = defineProps<{
  title: string
  trailerUrl: string
  posterUrl?: string | null
  detailTo?: RouteLocationRaw
}>()
const emit = defineEmits<{ 'open-change': [open: boolean] }>()
const route = useRoute()
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const selected = shallowRef<{
  title: string
  posterUrl?: string | null
  detailTo?: RouteLocationRaw
  source: ReturnType<typeof resolveTrailerSource>
} | null>(null)

function setOpen(value: boolean) {
  if (value) {
    // Hero slides may change behind the dialog; keep the clicked film stable.
    const source = resolveTrailerSource(props.trailerUrl)
    selected.value = {
      title: props.title,
      posterUrl: props.posterUrl,
      detailTo: props.detailTo,
      source,
    }
    failed.value = false
    loading.value = source?.kind === 'video'
  } else {
    selected.value = null
    loading.value = false
  }
  open.value = value
  emit('open-change', value)
}
function mediaError() {
  loading.value = false
  failed.value = true
}
watch(
  () => route.fullPath,
  () => setOpen(false),
)
onBeforeUnmount(() => emit('open-change', false))
</script>

<template>
  <DialogRoot :open="open" @update:open="setOpen">
    <DialogTrigger as-child><slot /></DialogTrigger>
    <DialogPortal v-if="open && selected">
      <DialogOverlay class="movie-trailer-overlay" />
      <DialogContent class="movie-trailer-dialog">
        <p class="lumiere-eyebrow">TRẢI NGHIỆM ĐIỆN ẢNH</p>
        <DialogTitle class="movie-trailer-dialog__title">{{ selected.title }}</DialogTitle>
        <DialogDescription class="movie-trailer-dialog__description">
          Xem trailer trước cuộc hẹn của bạn.
          <br />
          Nếu video không phát, bạn có thể mở liên kết gốc.</DialogDescription
        >
        <DialogClose class="movie-trailer-dialog__close" aria-label="Đóng trailer"
          ><X aria-hidden="true"
        /></DialogClose>
        <video
          v-if="selected.source?.kind === 'video' && !failed"
          :src="selected.source.player"
          :poster="selected.posterUrl || undefined"
          class="movie-trailer-dialog__player"
          controls
          playsinline
          preload="metadata"
          :aria-label="`Trailer ${selected.title}`"
          @loadedmetadata="loading = false"
          @canplay="loading = false"
          @waiting="loading = true"
          @playing="loading = false"
          @error="mediaError"
        >
          Trình duyệt của bạn không hỗ trợ phát video.
        </video>
        <iframe
          v-else-if="selected.source?.kind === 'youtube'"
          :src="selected.source.player"
          :title="`Trailer ${selected.title}`"
          class="movie-trailer-dialog__player"
          allow="fullscreen; encrypted-media; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          @error="mediaError"
        ></iframe>
        <p v-if="loading" class="movie-trailer-dialog__status" role="status">Đang tải trailer…</p>
        <p v-if="failed" class="movie-trailer-dialog__error" role="alert">
          Chưa phát được trailer. Vui lòng mở liên kết gốc để xem video.
        </p>
        <p
          v-else-if="!selected.source || selected.source.kind === 'external'"
          class="movie-trailer-dialog__status"
        >
          Nguồn trailer này chưa hỗ trợ phát trong trang. <br />
          Bạn có thể xem ở liên kết gốc bên dưới.
        </p>
        <div class="movie-trailer-dialog__actions">
          <DialogClose v-if="selected.detailTo" as-child
            ><RouterLink :to="selected.detailTo" class="home-button home-button--primary"
              >Thông tin &amp; lịch chiếu →</RouterLink
            ></DialogClose
          >
          <a
            class="movie-trailer-dialog__original"
            v-if="selected.source"
            :href="selected.source.original"
            target="_blank"
            rel="noopener noreferrer"
            >Mở trailer gốc ↗</a
          >
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@reference '../../styles/main.css';
.movie-trailer-overlay {
  --trailer-overlay-background: #091e24b8;
  --trailer-overlay-blur: 0.25rem;
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--trailer-overlay-background);
  backdrop-filter: blur(var(--trailer-overlay-blur));
}
.movie-trailer-dialog {
  --trailer-dialog-width: 45rem;
  --trailer-dialog-radius: 0.75rem;
  --trailer-dialog-padding: 2rem;
  --trailer-dialog-title-size: 1.75rem;
  --trailer-dialog-background: var(--lumiere-paper);
  --trailer-dialog-ink: var(--lumiere-ink);
  --trailer-dialog-muted: var(--lumiere-muted);
  --trailer-dialog-accent: var(--lumiere-orange-dark);
  --trailer-player-background: #102b30;
  --trailer-player-ratio: 16 / 9;
  --trailer-player-min-height: 12.5rem;
  --trailer-dialog-shadow: 0 1.5625rem 6.25rem #0003;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: calc(var(--z-modal) + 1);
  width: min(var(--trailer-dialog-width), calc(100% - var(--space-8)));
  max-height: calc(var(--viewport-dynamic-height) - var(--space-8));
  overflow-y: auto;
  padding: var(--trailer-dialog-padding);
  border-radius: var(--trailer-dialog-radius);
  background: var(--trailer-dialog-background);
  color: var(--trailer-dialog-ink);
  box-shadow: var(--trailer-dialog-shadow);
}
.movie-trailer-dialog__title {
  padding-right: var(--space-8);
  margin: 0;
  font-size: var(--trailer-dialog-title-size);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}
.movie-trailer-dialog__description,
.movie-trailer-dialog__status {
  font-size: var(--font-size-sm);
  color: var(--trailer-dialog-muted);
  line-height: var(--line-height-base);
}
.movie-trailer-dialog__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: grid;
  place-items: center;
  width: var(--control-height-sm);
  height: var(--control-height-sm);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  color: var(--trailer-dialog-ink);
  cursor: pointer;
}
.movie-trailer-dialog__close svg {
  width: var(--icon-size-md);
  height: var(--icon-size-md);
}
.movie-trailer-dialog__player {
  display: block;
  width: 100%;
  aspect-ratio: var(--trailer-player-ratio);
  min-height: var(--trailer-player-min-height);
  margin-top: var(--space-5);
  background: var(--trailer-player-background);
  object-fit: contain;
  border: 0;
  border-radius: var(--radius-sm);
}
.movie-trailer-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
}
.movie-trailer-dialog__original {
  color: var(--trailer-dialog-accent);
  font-size: var(--font-size-xs);
}
.movie-trailer-dialog__actions .home-button--primary {
  background: var(--lumiere-orange);
  color: var(--lumiere-white);
  box-shadow: none;
}
.movie-trailer-dialog__error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
}
.movie-trailer-dialog :is(a, button, video, iframe):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
@variant lumiere-mobile {
  .movie-trailer-dialog {
    --trailer-dialog-padding: 1.5625rem;
    --trailer-dialog-title-size: 1.5rem;
  }
}
</style>
