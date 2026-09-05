import { describe, expect, it } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'

const dataset = eventDatasetProvider.getDataset('development')
const engine = createAnalyticsEngine(dataset)
const baseQuery = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: dataset.referencePeriod,
  measures: ['sessions', 'conversion_rate'],
  ...overrides
})

describe('Northstar stories through Analytics Core', () => {
  it('shows Harbor above comparable Northstar locations in traffic and conversion rate', () => {
    const result = engine.breakdown(
      baseQuery({
        range: { start: '2026-03-04T00:00:00Z', end: '2026-03-19T00:00:00Z' },
        campaignIds: ['cmp-northstar'],
        breakdown: 'location'
      })
    )
    const harbor = result.rows.find(({ key }) => key === 'loc-harbor')!
    const river = result.rows.find(({ key }) => key === 'loc-river')!
    expect(harbor.values.sessions).toBeGreaterThan(river.values.sessions! * 1.5)
    expect(harbor.values.conversion_rate).toBeGreaterThan(river.values.conversion_rate! * 1.2)
  })

  it('shows paid media with more traffic but substantially weaker conversion than partner', () => {
    const paid = engine.summary(baseQuery({ channelIds: ['chn-paid'] }))
    const partner = engine.summary(baseQuery({ channelIds: ['chn-partner'] }))
    expect(paid.values.sessions).toBeGreaterThan(partner.values.sessions! * 2)
    expect(paid.values.conversion_rate).toBeLessThan(partner.values.conversion_rate! * 0.4)
  })

  it('shows partner as lower volume but higher quality than web', () => {
    const partner = engine.summary(baseQuery({ channelIds: ['chn-partner'] }))
    const web = engine.summary(baseQuery({ channelIds: ['chn-web'] }))
    expect(partner.values.sessions).toBeLessThan(web.values.sessions!)
    expect(partner.values.conversion_rate).toBeGreaterThan(web.values.conversion_rate! * 1.5)
  })

  it('shows higher Northstar traffic in the launch window than the equal-duration baseline', () => {
    const launchStart = Date.parse(northstarScenarioV1.launchSpike.start)
    const launchEnd = Date.parse(northstarScenarioV1.launchSpike.end)
    const duration = launchEnd - launchStart
    const result = engine.compareSummary(
      baseQuery({
        range: northstarScenarioV1.launchSpike,
        campaignIds: ['cmp-northstar'],
        measures: ['sessions'],
        comparison: {
          kind: 'custom',
          range: {
            start: new Date(launchStart - duration).toISOString(),
            end: new Date(launchStart).toISOString()
          }
        }
      })
    )
    expect(result.primary.values.sessions).toBeGreaterThan(result.comparison.values.sessions! * 2)
  })

  it('shows the mobile Safari conversion degradation after its fixed start', () => {
    const issueStart = northstarScenarioV1.mobileConversionIssue.startsAt
    const before = engine.summary(
      baseQuery({
        range: { start: dataset.referencePeriod.start, end: issueStart },
        devices: ['mobile'],
        browsers: ['Safari']
      })
    )
    const after = engine.summary(
      baseQuery({
        range: { start: issueStart, end: dataset.referencePeriod.end },
        devices: ['mobile'],
        browsers: ['Safari']
      })
    )
    expect(after.values.sessions).toBeGreaterThan(100)
    expect(after.values.conversion_rate).toBeLessThan(before.values.conversion_rate! * 0.65)
  })
})

describe('balanced campaign stories through Analytics Core', () => {
  const summaryFor = (campaignId: string) =>
    engine.summary(
      baseQuery({
        campaignIds: [campaignId],
        measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
      })
    )
  const channelFor = (campaignId: string, channelId: string) =>
    engine.summary(baseQuery({ campaignIds: [campaignId], channelIds: [channelId] }))
  const deviceFor = (campaignId: string, device: 'mobile' | 'desktop') =>
    engine.summary(baseQuery({ campaignIds: [campaignId], devices: [device] }))

  it.each(dataset.catalog.campaigns.map(({ id, name }) => [id, name] as const))(
    'returns meaningful real analytics for %s (%s)',
    (campaignId) => {
      const result = summaryFor(campaignId)
      expect(result.values.events).toBeGreaterThan(1_000)
      expect(result.values.sessions).toBeGreaterThan(650)
      expect(result.values.conversions).toBeGreaterThan(40)
      expect(result.values.qr_scans).toBeGreaterThan(40)
      expect(result.values.conversion_rate).toBeGreaterThan(0)
    }
  )

  it('keeps six distinguishable campaign narratives', () => {
    expect(deviceFor('cmp-aurora', 'mobile').values.sessions).toBeGreaterThan(
      deviceFor('cmp-aurora', 'desktop').values.sessions! * 2
    )
    expect(channelFor('cmp-waypoint', 'chn-social').values.sessions).toBeGreaterThan(
      channelFor('cmp-waypoint', 'chn-paid').values.sessions! * 3
    )
    expect(channelFor('cmp-orbit', 'chn-partner').values.sessions).toBeGreaterThan(
      channelFor('cmp-orbit', 'chn-physical').values.sessions! * 1.8
    )
    expect(summaryFor('cmp-northstar').values.sessions).toBeGreaterThan(
      summaryFor('cmp-horizon').values.sessions! * 1.5
    )
    expect(channelFor('cmp-skyline', 'chn-paid').values.sessions).toBeGreaterThan(
      channelFor('cmp-skyline', 'chn-web').values.sessions! * 2
    )
    expect(
      channelFor('cmp-horizon', 'chn-email').values.sessions! +
        channelFor('cmp-horizon', 'chn-web').values.sessions!
    ).toBeGreaterThan(summaryFor('cmp-horizon').values.sessions! * 0.6)
    expect(summaryFor('cmp-orbit').values.conversion_rate).toBeGreaterThan(
      summaryFor('cmp-skyline').values.conversion_rate! * 3
    )
  })
})
