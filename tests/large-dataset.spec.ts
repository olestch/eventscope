import { describe, expect, it } from 'vitest'
import { generateDataset } from '~/data/generator/generateDataset'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage } from '~/domain/analytics/storage'

const dataset = generateDataset({ profile: 'large' })
const engine = createRuntimeAnalyticsEngine(compileAnalyticsStorage(dataset))
const query = {
  range: dataset.referencePeriod,
  measures: ['sessions', 'conversion_rate'] as const
}

describe('100K deterministic dataset', () => {
  it('has the exact profile size and a repeatable fingerprint', () => {
    const repeated = generateDataset({ profile: 'large' })
    expect(dataset.eventCount).toBe(100_000)
    expect(dataset.fingerprint).toBe('es2-e91f0cc3')
    expect(repeated.fingerprint).toBe(dataset.fingerprint)
    expect(repeated.events[0]).toEqual(dataset.events[0])
    expect(repeated.events.at(-1)).toEqual(dataset.events.at(-1))
  })

  it.each(dataset.catalog.campaigns.map(({ id, name }) => [id, name] as const))(
    'keeps %s (%s) analytically useful at 100K',
    (campaignId) => {
      const result = engine.summary({
        ...query,
        campaignIds: [campaignId],
        measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
      })
      expect(result.values.events).toBeGreaterThan(10_000)
      expect(result.values.sessions).toBeGreaterThan(7_000)
      expect(result.values.conversions).toBeGreaterThan(500)
      expect(result.values.qr_scans).toBeGreaterThan(500)
      expect(result.values.conversion_rate).toBeGreaterThan(0)
    }
  )

  it('preserves Northstar launch and Harbor strength', () => {
    const launchStart = Date.parse(northstarScenarioV1.launchSpike.start)
    const launchEnd = Date.parse(northstarScenarioV1.launchSpike.end)
    const launch = engine.compareSummary({
      ...query,
      campaignIds: ['cmp-northstar'],
      measures: ['sessions'],
      range: northstarScenarioV1.launchSpike,
      comparison: {
        kind: 'custom',
        range: {
          start: new Date(launchStart - (launchEnd - launchStart)).toISOString(),
          end: new Date(launchStart).toISOString()
        }
      }
    })
    const locations = engine.breakdown({
      ...query,
      campaignIds: ['cmp-northstar'],
      breakdown: 'location'
    })
    const harbor = locations.rows.find(({ key }) => key === 'loc-harbor')!
    const river = locations.rows.find(({ key }) => key === 'loc-river')!
    expect(launch.primary.values.sessions).toBeGreaterThan(launch.comparison.values.sessions! * 2)
    expect(harbor.values.sessions).toBeGreaterThan(river.values.sessions! * 1.5)
    expect(harbor.values.conversion_rate).toBeGreaterThan(river.values.conversion_rate! * 1.2)
  })

  it('preserves channel quality and mobile Safari degradation', () => {
    const paid = engine.summary({ ...query, channelIds: ['chn-paid'] })
    const partner = engine.summary({ ...query, channelIds: ['chn-partner'] })
    const web = engine.summary({ ...query, channelIds: ['chn-web'] })
    const issueStart = northstarScenarioV1.mobileConversionIssue.startsAt
    const safariBefore = engine.summary({
      ...query,
      range: { start: dataset.referencePeriod.start, end: issueStart },
      devices: ['mobile'],
      browsers: ['Safari']
    })
    const safariAfter = engine.summary({
      ...query,
      range: { start: issueStart, end: dataset.referencePeriod.end },
      devices: ['mobile'],
      browsers: ['Safari']
    })

    expect(paid.values.sessions).toBeGreaterThan(partner.values.sessions! * 2)
    expect(paid.values.conversion_rate).toBeLessThan(partner.values.conversion_rate! * 0.4)
    expect(partner.values.sessions).toBeLessThan(web.values.sessions!)
    expect(partner.values.conversion_rate).toBeGreaterThan(web.values.conversion_rate! * 1.5)
    expect(safariAfter.values.conversion_rate).toBeLessThan(safariBefore.values.conversion_rate! * 0.65)
  })

  it('preserves weekday peak-hour and weekend suppression patterns', () => {
    const firstEvents = [...new Map(dataset.events.map((event) => [event.sessionId, event])).values()]
    const peakShare =
      firstEvents.filter((event) =>
        northstarScenarioV1.weekdayPeakHoursUtc.includes(new Date(event.timestamp).getUTCHours())
      ).length / firstEvents.length
    const weekendShare =
      firstEvents.filter((event) => [0, 6].includes(new Date(event.timestamp).getUTCDay())).length /
      firstEvents.length

    expect(peakShare).toBeGreaterThan(0.6)
    expect(weekendShare).toBeLessThan(0.35)
  })
})
