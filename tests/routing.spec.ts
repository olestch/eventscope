import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { routeCatalog } from '~/app/navigation'

const pageForRoute: Record<(typeof routeCatalog)[number], string> = {
  '/explore': 'pages/explore.vue',
  '/qr': 'pages/qr/index.vue',
  '/qr/new': 'pages/qr/new.vue',
  '/qr/:id': 'pages/qr/[id].vue',
  '/reports': 'pages/reports/index.vue',
  '/reports/new': 'pages/reports/new.vue',
  '/reports/:id': 'pages/reports/[id].vue',
  '/methodology': 'pages/methodology.vue'
}

describe('Nuxt route surface', () => {
  it.each(routeCatalog)('provides the %s page', (route) => {
    expect(existsSync(resolve(pageForRoute[route]))).toBe(true)
  })

  it('redirects the root route to Explore', () => {
    expect(readFileSync(resolve('pages/index.vue'), 'utf8')).toContain("navigateTo('/explore'")
  })

  it('provides a global error view for unknown routes', () => {
    expect(readFileSync(resolve('error.vue'), 'utf8')).toContain("t('errors.pageNotFound')")
  })
})
