export default defineNuxtConfig({
  // EventScope is an authenticated-style analytical shell. Rendering it on the
  // client avoids a server layer until the product has server-owned data needs.
  ssr: false,
  compatibilityDate: '2026-09-03',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      titleTemplate: '%s · EventScope',
      meta: [
        {
          name: 'description',
          content:
            'Explore deterministic event analytics, design local QR assets and model asynchronous reporting workflows.'
        },
        { name: 'theme-color', content: '#08131f' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  typescript: {
    typeCheck: true
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.ts' },
      { code: 'ru', language: 'ru', name: 'Русский', file: 'ru.ts' }
    ],
    vueI18n: './i18n.config.ts'
  },
  vite: {
    // ECharts is loaded lazily by the Explorer. Serving its modular entrypoints
    // directly also avoids an unnecessary development-only prebundle.
    optimizeDeps: {
      exclude: [
        'echarts',
        'echarts/core',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        'zrender'
      ]
    }
  }
})
