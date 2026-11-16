<script setup lang="ts">
import {
  AccordionRoot,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import CinemaContactPanel from '../components/CinemaContactPanel.vue'
import { supportFaqGroups, bookingGuideSteps } from '../content/support-content'

withDefaults(defineProps<{ topic?: 'faq' | 'guide' | 'contact' }>(), { topic: 'faq' })
const navigation = [
  { topic: 'faq', name: ROUTE_NAMES.SUPPORT, label: 'Câu hỏi thường gặp' },
  { topic: 'guide', name: ROUTE_NAMES.SUPPORT_GUIDE, label: 'Hướng dẫn đặt vé' },
  { topic: 'contact', name: ROUTE_NAMES.SUPPORT_CONTACT, label: 'Liên hệ hỗ trợ' },
]
</script>

<template>
  <div class="customer-support">
    <AppContainer>
      <header class="customer-support__heading">
        <p class="lumiere-eyebrow">LUÔN Ở ĐÂY KHI BẠN CẦN</p>
        <h1>Chúng mình có thể giúp gì?</h1>
        <p>Hướng dẫn cho những cuộc hẹn trọn vẹn hơn.</p>
      </header>
      <div class="customer-support__layout">
        <nav class="customer-support__nav" aria-label="Trung tâm hỗ trợ">
          <RouterLink
            v-for="item in navigation"
            :key="item.topic"
            :to="{ name: item.name }"
            :aria-current="topic === item.topic ? 'page' : undefined"
            :data-active="topic === item.topic"
            >{{ item.label }}</RouterLink
          >
        </nav>
        <div class="customer-support__main">
          <template v-if="topic === 'faq'">
            <section
              v-for="group in supportFaqGroups"
              :key="group.id"
              class="customer-support__faq-section"
              :aria-labelledby="`faq-${group.id}`"
            >
              <h2 :id="`faq-${group.id}`">{{ group.title }}</h2>
              <AccordionRoot type="multiple">
                <AccordionItem
                  v-for="item in group.items"
                  :key="item.id"
                  :value="item.id"
                  class="customer-support__faq"
                >
                  <AccordionHeader class="customer-support__question"
                    ><AccordionTrigger
                      ><span>{{ item.question }}</span
                      ><ChevronDown aria-hidden="true" /></AccordionTrigger
                  ></AccordionHeader>
                  <AccordionContent class="customer-support__answer"
                    ><p>{{ item.answer }}</p></AccordionContent
                  >
                </AccordionItem>
              </AccordionRoot>
            </section>
            <div class="customer-support__actions">
              <RouterLink :to="{ name: ROUTE_NAMES.SUPPORT_GUIDE }"
                >Xem hướng dẫn đặt vé →</RouterLink
              ><RouterLink :to="{ name: ROUTE_NAMES.SUPPORT_CONTACT }">Liên hệ rạp →</RouterLink>
            </div>
          </template>
          <section v-else-if="topic === 'guide'" class="booking-panel customer-support__panel">
            <h2>Đặt vé trong 7 bước</h2>
            <ol class="customer-support__steps">
              <li v-for="step in bookingGuideSteps" :key="step">{{ step }}</li>
            </ol>
            <RouterLink
              class="home-button home-button--primary"
              :to="{ name: ROUTE_NAMES.BOOKING_START }"
              >Bắt đầu đặt vé →</RouterLink
            >
          </section>
          <CinemaContactPanel v-else />
        </div>
      </div>
    </AppContainer>
  </div>
</template>

<style src="../../../styles/customer-support.css"></style>
