<script setup lang="ts">
import AppContainer from '@/components/ui/AppContainer.vue'
import '@/styles/registration-auth.css'
</script>

<template>
  <AppContainer as="main" class="auth-layout">
    <div class="auth-layout__grid">
      <aside class="auth-layout__story" aria-label="Lumière Club">
        <p class="auth-layout__eyebrow">LUMIÈRE CLUB</p>
        <div class="auth-layout__copy">
          <h2>Phim hay hơn<br />khi có <em>bạn.</em></h2>
          <p>
            Lưu vé thật tiện. Tích điểm mỗi cuộc hẹn.<br />
            Và thêm nhiều niềm vui chờ phía trước.
          </p>
        </div>
        <div class="auth-layout__orbit" aria-hidden="true">
          <span>✦</span>
        </div>
        <p class="auth-layout__tagline">YOUR NEXT MOVIE MOMENT.</p>
      </aside>
      <section class="auth-layout__content">
        <slot />
      </section>
    </div>
  </AppContainer>
</template>