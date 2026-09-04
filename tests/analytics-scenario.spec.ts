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
