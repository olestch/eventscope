<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppNavigation from '~/components/shell/AppNavigation.vue'
const { t } = useI18n()
</script>

<template>
  <div class="app-frame">
    <a class="skip-link" href="#main-content">{{ t('navigation.skip') }}</a>
    <AppNavigation />
    <main id="main-content" class="app-main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
