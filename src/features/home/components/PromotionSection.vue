<script setup lang="ts">
import { promotionPreviews } from '../presentation/marketing'
</script>

<template>
  <section
    id="promotions"
    class="home-container home-promotions"
    aria-label="Thiết kế ưu đãi đang chờ xác nhận"
  >
    <article
      v-for="(promotion, index) in promotionPreviews"
      :key="promotion.label"
      class="home-promotion"
      :class="{ 'home-promotion--combo': index === 1 }"
    >
      <div>
        <span class="home-promotion__label">{{ promotion.label }}</span>
        <h2>
          {{ promotion.title }} <strong>{{ promotion.highlight }}</strong>
        </h2>
        <p>{{ promotion.description }}</p>
        <small>Nội dung minh họa · chưa áp dụng</small>
      </div>
      <div class="home-promotion__art" aria-hidden="true">{{ promotion.art }}</div>
    </article>
  </section>
</template>
