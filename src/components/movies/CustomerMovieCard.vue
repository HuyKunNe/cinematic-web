<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  title: string
  posterUrl: string | null
  trailerUrl: string | null
  detailTo: RouteLocationRaw
  actionTo: RouteLocationRaw
  metadata: string
  caption: string
  ageLabel: string
  ageDescription: string
  ageCode?: string | null
  bookable: boolean
  heading?: 'h2' | 'h3'
}>(), { heading: 'h3' })
const imageFailed = ref(false)
watch(() => props.posterUrl, () => { imageFailed.value = false })
</script>

<template>
  <article class="customer-movie-card">
    <div class="customer-movie-card__art">
      <RouterLink class="customer-movie-card__poster" :to="detailTo" :aria-label="`Xem chi tiết phim ${title}`">
        <img :src="imageFailed || !posterUrl ? '/customer/movie-placeholder.svg' : posterUrl" :alt="`Poster ${title}`" loading="lazy" @error="imageFailed = true" />
        <span class="customer-movie-card__age" :data-rating="ageCode" :aria-label="ageDescription" :title="ageDescription">{{ ageCode || ageLabel }}</span>
        <span class="customer-movie-card__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </span>
      </RouterLink>
      <a v-if="trailerUrl" class="customer-movie-card__trailer" :href="trailerUrl" target="_blank" rel="noopener noreferrer" :aria-label="`Xem trailer ${title} (mở tab mới)`" title="Xem trailer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" /></svg>
      </a>
    </div>
    <div class="customer-movie-card__info">
      <p class="customer-movie-card__metadata" :title="metadata">{{ metadata }}</p>
      <component :is="heading" class="customer-movie-card__title" :title="title">
        <RouterLink :to="detailTo">{{ title }}</RouterLink>
      </component>
      <div class="customer-movie-card__bottom">
        <span class="customer-movie-card__caption" :title="caption">{{ caption }}</span>
        <RouterLink class="customer-movie-card__action" :to="actionTo" :aria-label="`${bookable ? 'Đặt vé' : 'Chi tiết'}: ${title}`">
          {{ bookable ? 'Đặt vé' : 'Chi tiết' }}
          <svg v-if="bookable" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z" /><path d="M16 5v3m0 3v2m0 3v3" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </RouterLink>
      </div>
    </div>
  </article>
</template>

<style scoped>
@reference '../../styles/main.css';
.customer-movie-card {
  --customer-card-title-size: 1.125rem;
  --customer-card-meta-size: 0.6875rem;
  --customer-card-bottom-size: 0.75rem;
  --customer-card-title-lines: 2;
  --customer-card-meta-lines: 1;
  --customer-card-title-leading: 1.4;
  --customer-card-title-tracking: -0.025em;
  --customer-card-title-height: calc(var(--customer-card-title-size) * var(--customer-card-title-leading) * var(--customer-card-title-lines));
  --customer-card-meta-height: calc(var(--customer-card-meta-size) * var(--line-height-base) * var(--customer-card-meta-lines));
  --customer-card-age-default: #d39e52;
  --customer-card-age-p: #43826f;
  --customer-card-age-k: #4c7c9c;
  --customer-card-age-t16: #c77737;
  --customer-card-age-t18: #b63e38;
  --customer-card-age-width: 1.8125rem;
  --customer-card-age-height: 1.5625rem;
  --customer-card-age-size: 0.625rem;
  --customer-card-poster-control: 2.1875rem;
  --customer-card-control-offset: var(--space-4);
  --customer-card-glass-border: #ffffff70;
  --customer-card-glass-bg: #ffffff18;
  --customer-card-glass-blur: 0.3125rem;
  --customer-card-hover-scale: 1.035;
  display: flex; flex-direction: column; min-width: 0; height: 100%; scroll-snap-align: start;
}
.customer-movie-card__art { position: relative; flex-shrink: 0; }
.customer-movie-card__poster { display: block; position: relative; width: 100%; aspect-ratio: var(--lumiere-poster-ratio); border-radius: var(--lumiere-card-radius); overflow: hidden; background: var(--color-surface-raised); }
.customer-movie-card__poster img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform var(--duration-normal) var(--easing-standard); }
.customer-movie-card__poster:hover img { transform: scale(var(--customer-card-hover-scale)); }
.customer-movie-card__age { position: absolute; top: var(--space-3); left: var(--space-3); display: inline-grid; place-items: center; box-sizing: border-box; min-width: var(--customer-card-age-width); min-height: var(--customer-card-age-height); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--customer-card-age-default); color: var(--color-on-primary); font-size: var(--customer-card-age-size); font-weight: var(--font-weight-bold); line-height: var(--line-height-heading); }
.customer-movie-card__age[data-rating='P'] { background: var(--customer-card-age-p); }
.customer-movie-card__age[data-rating='K'] { background: var(--customer-card-age-k); }
.customer-movie-card__age[data-rating='T16'] { background: var(--customer-card-age-t16); }
.customer-movie-card__age[data-rating='T18'] { background: var(--customer-card-age-t18); }
.customer-movie-card__arrow, .customer-movie-card__trailer { position: absolute; right: var(--customer-card-control-offset); display: grid; place-items: center; box-sizing: border-box; width: var(--customer-card-poster-control); height: var(--customer-card-poster-control); border: var(--border-width-thin) solid var(--customer-card-glass-border); border-radius: var(--radius-pill); color: var(--color-on-primary); background: var(--customer-card-glass-bg); backdrop-filter: blur(var(--customer-card-glass-blur)); }
.customer-movie-card__arrow { bottom: var(--customer-card-control-offset); }
.customer-movie-card__trailer { top: var(--space-3); }
.customer-movie-card svg { width: var(--icon-size-sm); height: var(--icon-size-sm); fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.customer-movie-card__info { display: flex; flex-direction: column; flex: 1; padding-top: var(--space-3); min-width: 0; }
.customer-movie-card__metadata { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--customer-card-meta-lines); height: var(--customer-card-meta-height); margin: 0 0 var(--space-2); overflow: hidden; color: var(--color-text-secondary); font-size: var(--customer-card-meta-size); line-height: var(--line-height-base); overflow-wrap: anywhere; }
.customer-movie-card__title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--customer-card-title-lines); height: var(--customer-card-title-height); margin: 0; overflow: hidden; overflow-wrap: anywhere; font-size: var(--customer-card-title-size); font-weight: var(--font-weight-bold); letter-spacing: var(--customer-card-title-tracking); line-height: var(--customer-card-title-leading); }
.customer-movie-card__title a { color: var(--color-text-primary); text-decoration: none; }
.customer-movie-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: var(--control-height-sm); margin-top: auto; padding-top: var(--space-2); font-size: var(--customer-card-bottom-size); }
.customer-movie-card__caption { min-width: 0; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.customer-movie-card__action { display: inline-flex; flex-shrink: 0; align-items: center; gap: var(--space-2); color: var(--color-primary-hover); font-weight: var(--font-weight-bold); text-decoration: none; }
.customer-movie-card a:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus); outline-offset: var(--space-1); }
@variant lumiere-mobile { .customer-movie-card { --customer-card-title-size: 1rem; } }
@media (prefers-reduced-motion: reduce) { .customer-movie-card__poster img { transition: none; } }
</style>
