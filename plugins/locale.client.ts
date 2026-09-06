import { watch, type Ref } from 'vue'
import {
  readLocalePreference,
  writeLocalePreference,
  type SupportedLocale
} from '~/utils/localePreference'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { locale, setLocale } = nuxtApp.$i18n as {
    locale: Ref<string>
    setLocale: (locale: SupportedLocale) => Promise<void>
  }
  const stored = readLocalePreference(window.localStorage)
  if (stored && stored !== locale.value) await setLocale(stored)

  watch(locale, (value) => {
    if (value === 'en' || value === 'ru') writeLocalePreference(window.localStorage, value)
  })
})
