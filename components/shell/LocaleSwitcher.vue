<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '~/utils/localePreference'

const { locale, setLocale, t } = useI18n()
const changeLocale = (event: Event) =>
  setLocale((event.target as HTMLSelectElement).value as SupportedLocale)
</script>

<template>
  <label class="locale-switcher">
    <span class="sr-only">{{ t('navigation.language') }}</span>
    <select :value="locale" :aria-label="t('navigation.language')" @change="changeLocale">
      <option value="en">EN · English</option>
      <option value="ru">RU · Русский</option>
    </select>
  </label>
</template>
