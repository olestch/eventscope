import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import {
  applyDatePreset,
  buildExplorerQuery,
  createDefaultExplorerState,
  inclusiveDatesToAnalyticsRange,
  parseExplorerRoute,
  removeExplorerFilter,
  serializeExplorerState
} from '~/features/explorer/queryState'

const referencePeriod = northstarScenarioV1.referencePeriod

describe('Explorer route query state', () => {
  it('creates and serializes a useful 100K Northstar default', () => {
    const state = parseExplorerRoute({}, referenceCatalog, referencePeriod)
    expect(state).toEqual(createDefaultExplorerState(referenceCatalog))
    expect(serializeExplorerState(state)).toMatchObject({
      profile: 'large',
      start: '2026-03-04',
      end: '2026-03-18',
      campaign: 'cmp-northstar',
      breakdown: 'location',
      measure: 'sessions'
    })
  })

  it('canonicalizes duplicates and rejects invalid route values safely', () => {
    const state = parseExplorerRoute(
      {
        profile: 'unsupported',
        start: 'not-a-date',
        end: '2027-01-01',
        campaign: 'cmp-orbit,cmp-northstar,cmp-orbit,missing',
        channel: ['chn-paid', 'chn-partner,chn-paid'],
        location: 'missing',
        device: 'mobile,desktop,phone',
        breakdown: 'country',
        measure: 'visitors'
      },
      referenceCatalog,
      referencePeriod
    )
    expect(state).toMatchObject({
      profile: 'large',
      startDate: '2026-03-04',
      endDate: '2026-06-30',
      campaignIds: ['cmp-northstar', 'cmp-orbit'],
      channelIds: ['chn-paid', 'chn-partner'],
      locationIds: [],
      devices: ['desktop', 'mobile'],
      breakdown: 'location',
      breakdownMeasure: 'sessions'
    })
    expect(serializeExplorerState(state).campaign).toBe('cmp-northstar,cmp-orbit')
  })

  it('converts an inclusive UI end date to an exclusive UTC query boundary', () => {
    expect(inclusiveDatesToAnalyticsRange('2026-03-04', '2026-03-18')).toEqual({
      start: '2026-03-04T00:00:00.000Z',
      end: '2026-03-19T00:00:00.000Z'
    })
  })

  it('builds combined filters without manufacturing empty dimensions', () => {
    const state = parseExplorerRoute(
      {
        campaign: 'cmp-northstar,cmp-orbit',
        channel: 'chn-paid',
        location: 'loc-harbor',
        device: 'mobile',
        start: '2026-03-04',
        end: '2026-03-18'
      },
      referenceCatalog,
      referencePeriod
    )
    expect(buildExplorerQuery(state, ['events'], { breakdown: 'channel' })).toMatchObject({
      campaignIds: ['cmp-northstar', 'cmp-orbit'],
      channelIds: ['chn-paid'],
      locationIds: ['loc-harbor'],
      devices: ['mobile'],
      breakdown: 'channel'
    })
  })

  it('applies a draft, removes one committed chip and resets deterministically', () => {
    const defaults = createDefaultExplorerState(referenceCatalog)
    const draft = {
      ...defaults,
      campaignIds: ['cmp-orbit', 'cmp-northstar'],
      channelIds: ['chn-paid'],
      locationIds: ['loc-harbor'],
      devices: ['mobile' as const]
    }
    const committed = parseExplorerRoute(
      serializeExplorerState(draft),
      referenceCatalog,
      referencePeriod
    )
    expect(buildExplorerQuery(committed, ['events'])).toMatchObject({
      campaignIds: ['cmp-northstar', 'cmp-orbit'],
      channelIds: ['chn-paid'],
      locationIds: ['loc-harbor'],
      devices: ['mobile']
    })

    const withoutPaid = removeExplorerFilter(committed, 'channelIds', 'chn-paid')
    expect(withoutPaid.channelIds).toEqual([])
    expect(withoutPaid.campaignIds).toEqual(['cmp-northstar', 'cmp-orbit'])
    expect(
      parseExplorerRoute(serializeExplorerState(defaults), referenceCatalog, referencePeriod)
    ).toEqual(defaults)
  })

  it('uses campaign-aware fixed-history date presets', () => {
    const state = createDefaultExplorerState(referenceCatalog)
    expect(applyDatePreset(state, '7d', referenceCatalog, referencePeriod)).toMatchObject({
      startDate: '2026-03-12',
      endDate: '2026-03-18'
    })
    expect(applyDatePreset(state, 'full', referenceCatalog, referencePeriod)).toMatchObject({
      startDate: '2026-03-04',
      endDate: '2026-03-18'
    })
  })

  it('reconstructs the same query on reload and follows router Back/Forward state', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/explore', component: { template: '<div />' } }]
    })
    const base = createDefaultExplorerState(referenceCatalog)
    const queryA = serializeExplorerState(base)
    const queryB = serializeExplorerState({ ...base, channelIds: ['chn-paid'] })
    const queryC = serializeExplorerState({ ...base, devices: ['mobile'] })
    await router.push({ path: '/explore', query: queryA })
    await router.push({ query: queryB })
    await router.push({ query: queryC })
    router.back()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(
      parseExplorerRoute(router.currentRoute.value.query, referenceCatalog, referencePeriod)
    ).toEqual({
      ...base,
      channelIds: ['chn-paid']
    })
    router.back()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(
      parseExplorerRoute(router.currentRoute.value.query, referenceCatalog, referencePeriod)
    ).toEqual(base)
    router.forward()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(
      parseExplorerRoute(router.currentRoute.value.query, referenceCatalog, referencePeriod)
    ).toEqual({
      ...base,
      channelIds: ['chn-paid']
    })
  })
})
