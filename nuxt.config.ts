export default defineNuxtConfig({
  // EventScope is an authenticated-style analytical shell. Rendering it on the
  // client avoids a server layer until the product has server-owned data needs.
  ssr: false,
  compatibilityDate: '2026-09-03',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      titleTemplate: '%s · EventScope',
      meta: [
        {
          name: 'description',
          content: 'A fictional event intelligence studio product shell.'
        },
        { name: 'theme-color', content: '#08131f' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  typescript: {
    typeCheck: true
  }
})
