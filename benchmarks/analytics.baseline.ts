import { describe, expect, it } from 'vitest'
import { generateDataset } from '~/data/generator/generateDataset'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage, estimateAnalyticsStorageBytes } from '~/domain/analytics/storage'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { DatasetProfile } from '~/domain/events/models'

const requestedProfiles = (process.env.EVENTSCOPE_BENCH_PROFILES ?? 'development,large,showcase')
  .split(',')
  .filter((profile): profile is DatasetProfile => ['development', 'large', 'showcase'].includes(profile))
const expectedFingerprints: Partial<Record<DatasetProfile, string>> = {
  development: 'es2-0b946418',
  large: 'es2-e91f0cc3',
  showcase: 'es2-903683f5'
}

const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}

const measure = <T>(operation: () => T) => {
  const startedAt = performance.now()
  const value = operation()
  return { value, duration: performance.now() - startedAt }
}

describe('local Analytics Core baseline', () => {
  it.each(requestedProfiles)('records the %s analytical baseline', (profile) => {
    const referenceMode = process.env.EVENTSCOPE_BENCH_ENGINE === 'reference'
    const heapBefore = process.memoryUsage().heapUsed
    const generated = measure(() => generateDataset({ profile }))
    const dataset = generated.value
    const heapAfterGeneration = process.memoryUsage().heapUsed
    const compiled = measure(() => compileAnalyticsStorage(dataset))
    const engine = referenceMode
      ? createAnalyticsEngine(dataset)
      : createRuntimeAnalyticsEngine(compiled.value)
    const query = {
      range: dataset.referencePeriod,
      measures: ['events', 'sessions', 'visitors', 'conversions', 'conversion_rate', 'qr_scans'] as const
    }
    const operations = {
      summary: () => engine.summary({ ...query, measures: [...query.measures] }),
      filteredSummary: () =>
        engine.summary({
          ...query,
          campaignIds: ['cmp-northstar'],
          devices: ['mobile'],
          measures: [...query.measures]
        }),
      qrFilteredSummary: () =>
        engine.summary({
          ...query,
          qrCodeIds: ['qr-harbor-entry'],
          measures: [...query.measures]
        }),
      qrFilteredBreakdown: () =>
        engine.breakdown({
          ...query,
          qrCodeIds: ['qr-harbor-entry'],
          measures: [...query.measures],
          breakdown: 'device'
        }),
      qrFilteredTimeSeries: () =>
        engine.timeSeries({
          ...query,
          qrCodeIds: ['qr-harbor-entry'],
          measures: [...query.measures],
          bucket: { kind: 'adaptive', maxPoints: 48 }
        }),
      breakdown: () =>
        engine.breakdown({ ...query, measures: [...query.measures], breakdown: 'channel' }),
      timeSeries: () =>
        engine.timeSeries({
          ...query,
          measures: [...query.measures],
          bucket: { kind: 'adaptive', maxPoints: 48 }
        }),
      temporalHeatmap: () =>
        engine.temporalHeatmap({
          ...query,
          measures: ['sessions']
        }),
      funnel: () =>
        engine.funnel(
          { ...query, measures: ['sessions'] },
          { steps: ['page_view', 'registration', 'conversion'] }
        ),
      comparison: () =>
        engine.compareSummary({
          ...query,
          measures: [...query.measures],
          comparison: { kind: 'previous_period' }
        })
    }
    const iterations = profile === 'showcase' ? 3 : 5

    const timings: Record<string, { p50: number; p95: number }> = {}
    for (const [name, operation] of Object.entries(operations)) {
      const operationFn = operation as () => unknown
      operationFn()
      const samples = Array.from({ length: iterations }, () => measure(operationFn).duration)
      timings[name] = {
        p50: Number(percentile(samples, 0.5).toFixed(2)),
        p95: Number(percentile(samples, 0.95).toFixed(2))
      }
    }

    const scenarioQuery: AnalyticsQuery = {
      range: dataset.referencePeriod,
      measures: ['sessions', 'conversion_rate']
    }
    const paid = engine.summary({ ...scenarioQuery, channelIds: ['chn-paid'] })
    const partner = engine.summary({ ...scenarioQuery, channelIds: ['chn-partner'] })
    const web = engine.summary({ ...scenarioQuery, channelIds: ['chn-web'] })
    const locations = engine.breakdown({
      ...scenarioQuery,
      campaignIds: ['cmp-northstar'],
      breakdown: 'location'
    })
    const harbor = locations.rows.find(({ key }) => key === 'loc-harbor')!
    const river = locations.rows.find(({ key }) => key === 'loc-river')!
    const issueStart = northstarScenarioV1.mobileConversionIssue.startsAt
    const safariBefore = engine.summary({
      ...scenarioQuery,
      range: { start: dataset.referencePeriod.start, end: issueStart },
      devices: ['mobile'],
      browsers: ['Safari']
    })
    const safariAfter = engine.summary({
      ...scenarioQuery,
      range: { start: issueStart, end: dataset.referencePeriod.end },
      devices: ['mobile'],
      browsers: ['Safari']
    })
    const launchStart = Date.parse(northstarScenarioV1.launchSpike.start)
    const launchEnd = Date.parse(northstarScenarioV1.launchSpike.end)
    const launch = engine.compareSummary({
      ...scenarioQuery,
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
    let sessionCount = 0
    let peakCount = 0
    let weekendCount = 0
    let previousSession = ''
    for (const event of dataset.events) {
      if (event.sessionId === previousSession) continue
      previousSession = event.sessionId
      sessionCount += 1
      const date = new Date(event.timestamp)
      if (northstarScenarioV1.weekdayPeakHoursUtc.includes(date.getUTCHours())) peakCount += 1
      if ([0, 6].includes(date.getUTCDay())) weekendCount += 1
    }

    expect(paid.values.sessions).toBeGreaterThan(partner.values.sessions! * 2)
    expect(paid.values.conversion_rate).toBeLessThan(partner.values.conversion_rate! * 0.4)
    expect(partner.values.sessions).toBeLessThan(web.values.sessions!)
    expect(partner.values.conversion_rate).toBeGreaterThan(web.values.conversion_rate! * 1.5)
    expect(harbor.values.sessions).toBeGreaterThan(river.values.sessions! * 1.5)
    expect(harbor.values.conversion_rate).toBeGreaterThan(river.values.conversion_rate! * 1.2)
    expect(safariAfter.values.conversion_rate).toBeLessThan(safariBefore.values.conversion_rate! * 0.65)
    expect(launch.primary.values.sessions).toBeGreaterThan(launch.comparison.values.sessions! * 2)
    expect(peakCount / sessionCount).toBeGreaterThan(0.6)
    expect(weekendCount / sessionCount).toBeLessThan(0.35)
    expect(dataset.fingerprint).toBe(expectedFingerprints[profile])

    console.info(
      JSON.stringify(
        {
          representation: referenceMode ? 'reference-object-records' : 'columnar-runtime',
          profile,
          eventCount: dataset.eventCount,
          fingerprint: dataset.fingerprint,
          generationMs: Number(generated.duration.toFixed(2)),
          compilationMs: Number(compiled.duration.toFixed(2)),
          analyticalColumnsMiB: Number(
            (estimateAnalyticsStorageBytes(compiled.value) / 1024 / 1024).toFixed(2)
          ),
          approximateHeapGrowthMiB: Number(
            ((heapAfterGeneration - heapBefore) / 1024 / 1024).toFixed(2)
          ),
          iterations,
          warmups: 1,
          runtime: `${process.release.name} ${process.version}`,
          platform: `${process.platform}/${process.arch}`,
          timingsMs: timings
        },
        null,
        2
      )
    )
    expect(dataset.eventCount).toBeGreaterThan(0)
  })
})
