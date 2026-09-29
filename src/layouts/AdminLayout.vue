<script setup lang="ts">
import AppLink from '../components/ui/AppLink.vue'
import { ROUTE_NAMES } from '../router/route-constants'

const navigation = [
  { label: 'Tổng quan', name: ROUTE_NAMES.ADMIN },
  { label: 'Phim', name: ROUTE_NAMES.ADMIN_MOVIES },
  { label: 'Rạp', name: ROUTE_NAMES.ADMIN_CINEMAS },
  { label: 'Phòng', name: ROUTE_NAMES.ADMIN_ROOMS },
  { label: 'Lịch chiếu', name: ROUTE_NAMES.ADMIN_SHOWTIMES },
  { label: 'Booking', name: ROUTE_NAMES.ADMIN_BOOKINGS },
  { label: 'Người dùng', name: ROUTE_NAMES.ADMIN_USERS },
]
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar">
      <AppLink class="admin-layout__brand" :to="{ name: ROUTE_NAMES.ADMIN }">
        CINEMATIC ADMIN
      </AppLink>

      <nav aria-label="Điều hướng quản trị" class="admin-layout__nav">
        <AppLink
          v-for="item in navigation"
          :key="item.name"
          :to="{ name: item.name }"
          variant="muted"
        >
          {{ item.label }}
        </AppLink>
      </nav>
    </aside>

    <div class="admin-layout__content">
      <header class="admin-layout__header">
        <span>Khu vực quản trị</span>
      </header>

      <main class="admin-layout__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: var(--admin-sidebar-width) minmax(0, 1fr);
  background: var(--color-background);
}

.admin-layout__sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  gap: var(--space-8);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6);
  background: var(--color-surface);
}

.admin-layout__brand {
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.admin-layout__nav {
  display: grid;
  gap: var(--space-3);
}

.admin-layout__content {
  min-width: 0;
}

.admin-layout__header {
  display: flex;
  min-height: var(--admin-header-height);
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-inline: var(--space-6);
  color: var(--color-text-secondary);
  background: var(--color-surface);
}

.admin-layout__main {
  padding: var(--space-6);
}

@media (max-width: 63.999rem) {
  .admin-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-layout__sidebar {
    position: static;
    height: auto;
    gap: var(--space-4);
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .admin-layout__nav {
    display: flex;
    overflow-x: auto;
    gap: var(--space-4);
  }

  .admin-layout__nav :deep(.app-link) {
    white-space: nowrap;
  }
}
</style>
