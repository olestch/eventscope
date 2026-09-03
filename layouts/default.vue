<script setup lang="ts">
import AppNavigation from '~/components/shell/AppNavigation.vue'
</script>

<template>
  <div class="app-frame">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <AppNavigation />
    <main id="main-content" class="app-main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
