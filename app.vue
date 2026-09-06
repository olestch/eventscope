<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()
useHead(() => ({
  htmlAttrs: { lang: locale.value },
  meta: [{ name: 'description', content: t('head.description') }]
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
