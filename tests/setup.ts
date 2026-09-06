import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '~/i18n/locales/en'
import ru from '~/i18n/locales/ru'

export const testI18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru }
})

Object.assign(testI18n.global, {
  setLocale: async (value: 'en' | 'ru') => {
    testI18n.global.locale.value = value
  }
})

config.global.plugins = [testI18n]
