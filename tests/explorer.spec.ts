import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createAnalyticsEngine } from '~/domain/analytics/engine'

beforeAll(() => vi.stubGlobal('useHead', vi.fn()))

describe('Explorer story', () => {
  it('renders async worker-backed results and connected workflows', async () => {
    const dataset = eventDatasetProvider.getDataset('development')
    const engine = createAnalyticsEngine(dataset)
    const state: Record<string, unknown> = { status: 'idle', requestedProfile: 'large' }
    const metadata = {
      datasetId: dataset.id,
      fingerprint: dataset.fingerprint,
      profile: dataset.profile,
      eventCount: dataset.eventCount,
      referencePeriod: dataset.referencePeriod,
      analyticalStorageBytes: dataset.eventCount * 40,
      generationMs: 1,
      compilationMs: 1
    }
    vi.doMock('~/composables/useEventAnalytics', () => ({
      useEventAnalytics: () => ({
        catalog: dataset.catalog,
        state,
        initialize: async () => {
          Object.assign(state, { status: 'ready', metadata })
          return metadata
        },
        summary: async (query: Parameters<typeof engine.summary>[0]) => engine.summary(query),
        timeSeries: async (query: Parameters<typeof engine.timeSeries>[0]) => engine.timeSeries(query),
        breakdown: async (query: Parameters<typeof engine.breakdown>[0]) => engine.breakdown(query)
      })
    }))

    const { default: ExplorePage } = await import('~/pages/explore.vue')
    const wrapper = mount(ExplorePage, { global: { stubs: { NuxtLink: RouterLinkStub } } })
    await flushPromises()

    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Generated facts stay off the main thread')
    expect(wrapper.text()).toContain('100K default')
    expect(wrapper.text()).toContain('1M showcase')
    expect(wrapper.text()).toContain('Source events')
    expect(wrapper.text()).toContain('Conversion rate')
    const summary = engine.summary({
      range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
      campaignIds: ['cmp-northstar'],
      measures: ['events', 'conversion_rate']
    })
    expect(wrapper.text()).toContain(summary.values.events!.toLocaleString('en-US'))
    expect(wrapper.text()).toContain(`${(summary.values.conversion_rate! * 100).toFixed(1)}%`)
    expect(wrapper.text()).toContain('Open QR studio')
    expect(wrapper.text()).toContain('Start report')
    expect(wrapper.find('svg[role="img"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(true)
  })
})
