<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
await navigateTo('/explore', { replace: true })
</script>

<template>
  <div class="page">
    <p>{{ t('errors.openingExplore') }}</p>
  </div>
</template>
