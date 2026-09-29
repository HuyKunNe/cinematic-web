<script setup lang="ts">
import { membershipBenefits } from '../presentation/marketing'
</script>

<template>
  <section class="home-membership" aria-labelledby="membership-title">
    <div class="home-container home-membership__inner">
      <div class="home-membership__card" aria-hidden="true">
        <strong>CINEMATIC</strong><span>MEMBER</span>
      </div>
      <div class="home-membership__content">
        <h2 id="membership-title">Thành viên CINEMATIC</h2>
        <p>Xem phim nhiều hơn, nhận ưu đãi lớn hơn</p>
        <div class="home-membership__benefits">
          <div v-for="benefit in membershipBenefits" :key="benefit.text">
            <b aria-hidden="true">{{ benefit.icon }}</b
            ><span>{{ benefit.text }}</span>
          </div>
        </div>
        <small>Nội dung minh họa · quyền lợi đang chờ xác nhận</small>
      </div>
    </div>
  </section>
</template>
