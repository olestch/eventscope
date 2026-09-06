import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ExplorerToolbar from '~/components/explore/ExplorerToolbar.vue'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import ReportPreview from '~/components/reports/ReportPreview.vue'
import AppNavigation from '~/components/shell/AppNavigation.vue'
import LocaleSwitcher from '~/components/shell/LocaleSwitcher.vue'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { fingerprintDataset } from '~/data/generator/fingerprint'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import type { CreateReportRequest } from '~/domain/reports/models'
import { formatCount, formatDateOnly } from '~/features/explorer/presentation'
import { buildQrArtifact, createDefaultQrStudioDraft } from '~/features/qr/studio'
import en from '~/i18n/locales/en'
import ru from '~/i18n/locales/ru'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'
import { testI18n } from '~/tests/setup'
import {
  localePreferenceKey,
  readLocalePreference,
  writeLocalePreference
} from '~/utils/localePreference'

const leafKeys = (value: unknown, prefix = ''): string[] => {
  if (Array.isArray(value)) return [prefix]
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key)
    )
  }
  return [prefix]
}

afterEach(async () => {
  await testI18n.global.setLocale('en')
})

describe('English and Russian localization', () => {
  it('keeps the translation catalogs structurally equivalent', () => {
    expect(leafKeys(ru).sort()).toEqual(leafKeys(en).sort())
  })

  it('defaults defensively and persists only supported locale values under its own key', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }

    expect(readLocalePreference(storage)).toBeUndefined()
    values.set(localePreferenceKey, 'de')
    expect(readLocalePreference(storage)).toBeUndefined()
    expect(writeLocalePreference(storage, 'ru')).toBe(true)
    expect(values.get(localePreferenceKey)).toBe('ru')
    expect(readLocalePreference(storage)).toBe('ru')
  })

  it('switches locale in place without changing route-backed or draft product state', async () => {
    const productState = {
      route: '/explore?campaign=cmp-northstar&view=timeline',
      qrDraft: createDefaultQrStudioDraft(referenceCatalog)
    }
    const before = structuredClone(productState)
    const wrapper = mount(LocaleSwitcher)

    await wrapper.get('select').setValue('ru')

    expect(testI18n.global.locale.value).toBe('ru')
    expect(productState).toEqual(before)
    expect(wrapper.get('select').attributes('aria-label')).toBe('Язык интерфейса')

    await wrapper.get('select').setValue('en')
    expect(testI18n.global.locale.value).toBe('en')
    expect(productState).toEqual(before)
    expect(wrapper.get('select').attributes('aria-label')).toBe('Interface language')
  })

  it('localizes presentation formatting without changing canonical QR output', async () => {
    const draft = createDefaultQrStudioDraft(referenceCatalog)
    const englishSvg = buildQrArtifact(draft)?.svg

    await testI18n.global.setLocale('ru')

    expect(formatCount(12_450, 'en')).not.toBe(formatCount(12_450, 'ru'))
    expect(formatDateOnly('2026-03-04', 'ru')).toMatch(/2026/)
    expect(buildQrArtifact(draft)?.svg).toBe(englishSvg)
  })

  it('keeps analytics, fingerprint and report scope invariant across locale changes', async () => {
    const dataset = createAnalyticsFixture()
    const query: AnalyticsQuery = {
      range: fixtureRange,
      campaignIds: ['cmp-northstar'],
      measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
    }
    const request: CreateReportRequest = {
      title: 'Northstar performance report',
      format: 'pdf',
      query,
      sections: ['executive_summary']
    }
    const engine = createAnalyticsEngine(dataset)
    const before = {
      query: structuredClone(query),
      result: engine.summary(query),
      fingerprint: fingerprintDataset(dataset),
      request: structuredClone(request)
    }

    await testI18n.global.setLocale('ru')

    expect(query).toEqual(before.query)
    expect(engine.summary(query)).toEqual(before.result)
    expect(fingerprintDataset(dataset)).toBe(before.fingerprint)
    expect(request).toEqual(before.request)
  })

  it('renders representative navigation, Explorer, QR, Reports and error copy in Russian', async () => {
    await testI18n.global.setLocale('ru')
    const navigation = mount(AppNavigation, {
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    const toolbar = mount(ExplorerToolbar, {
      props: { profile: 'large', activeFilterCount: 2, runtimeError: false }
    })
    const qrStudio = mount(QrEditorShell)
    const report = mount(ReportPreview, {
      props: {
        title: 'Northstar performance report',
        query: { range: fixtureRange, measures: ['sessions'] },
        sections: ['executive_summary'],
        catalog: referenceCatalog
      }
    })

    expect(navigation.text()).toContain('Аналитика')
    expect(navigation.get('[aria-label="Язык интерфейса"]').exists()).toBe(true)
    expect(toolbar.text()).toContain('Фильтры')
    expect(qrStudio.text()).toContain('Контекст кампании')
    expect(qrStudio.text()).toContain('Экспорт SVG')
    expect(report.text()).toContain('Краткие итоги')
    expect(ru.errors.pageNotFound).toBe('Страница не найдена')
  })

  it('uses unprefixed routes, reactive document language and client-side preference restore', () => {
    expect(readFileSync(resolve('nuxt.config.ts'), 'utf8')).toContain("strategy: 'no_prefix'")
    expect(readFileSync(resolve('app.vue'), 'utf8')).toContain('htmlAttrs: { lang: locale.value }')
    expect(readFileSync(resolve('error.vue'), 'utf8')).toContain('<Html :lang="locale">')
    expect(readFileSync(resolve('plugins/locale.client.ts'), 'utf8')).toContain(
      'readLocalePreference(window.localStorage)'
    )
    expect(readFileSync(resolve('plugins/locale.client.ts'), 'utf8')).toContain('nuxtApp.$i18n')
    expect(readFileSync(resolve('plugins/locale.client.ts'), 'utf8')).not.toContain('useI18n()')
  })
})
