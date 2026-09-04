import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createAnalyticsEngine } from '~/domain/analytics/engine'

beforeAll(() => vi.stubGlobal('useHead', vi.fn()))

describe('Explorer story', () => {
  it('connects campaign context, insight and next workflows', async () => {
    const { default: ExplorePage } = await import('~/pages/explore.vue')
    const wrapper = mount(ExplorePage, { global: { stubs: { NuxtLink: RouterLinkStub } } })

    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Generated facts now drive this view')
    expect(wrapper.text()).toContain('Source events')
    expect(wrapper.text()).toContain('Conversion rate')
    const dataset = eventDatasetProvider.getDataset('development')
    const summary = createAnalyticsEngine(dataset).summary({
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
