import { describe, expect, it } from 'vitest'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage, estimateAnalyticsStorageBytes } from '~/domain/analytics/storage'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import { analyticsFixtureEvents, createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const dataset = createAnalyticsFixture()
const reference = createAnalyticsEngine(dataset)
const storage = compileAnalyticsStorage(dataset)
const runtime = createRuntimeAnalyticsEngine(storage)
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: ['events', 'sessions', 'visitors', 'conversions', 'conversion_rate', 'qr_scans'],
  ...overrides
})

describe('columnar runtime semantic equivalence', () => {
  it('matches summaries including conversion-only denominator semantics', () => {
    const request = query({ eventTypes: ['conversion'] })
    expect(runtime.summary(request)).toEqual(reference.summary(request))
    expect(runtime.summary(query())).toEqual(reference.summary(query()))
    expect(runtime.summary(query({ campaignIds: ['missing'] }))).toEqual(
      reference.summary(query({ campaignIds: ['missing'] }))
    )
  })

  it('matches filtered breakdown values and stable ordering', () => {
    const request = query({
      campaignIds: ['cmp-northstar', 'cmp-orbit'],
      breakdown: 'campaign'
    })
    expect(runtime.breakdown(request)).toEqual(reference.breakdown(request))
  })

  it('matches continuous time buckets and exact range boundaries', () => {
    const request = query({
      range: { start: '2026-01-01T00:00:00Z', end: '2026-01-01T04:00:00Z' },
      bucket: { kind: 'fixed', size: '1h' }
    })
    expect(runtime.timeSeries(request)).toEqual(reference.timeSeries(request))
    const calendarRequest = query({
      range: { start: '2025-12-29T00:00:00Z', end: '2026-03-02T00:00:00Z' },
      bucket: { kind: 'fixed', size: '1mo' }
    })
    expect(runtime.timeSeries(calendarRequest)).toEqual(reference.timeSeries(calendarRequest))
  })

  it('matches ordered session funnels', () => {
    const definition = { steps: ['page_view', 'qr_scan', 'conversion'] as const }
    expect(runtime.funnel(query(), { steps: [...definition.steps] })).toEqual(
      reference.funnel(query(), { steps: [...definition.steps] })
    )
    expect(runtime.funnel(query(), { steps: ['page_view', 'download', 'conversion'] })).toEqual(
      reference.funnel(query(), { steps: ['page_view', 'download', 'conversion'] })
    )

    const shuffledDataset = createAnalyticsFixture([...analyticsFixtureEvents].reverse())
    const shuffledReference = createAnalyticsEngine(shuffledDataset)
    const shuffledStorage = compileAnalyticsStorage(shuffledDataset)
    const shuffledRuntime = createRuntimeAnalyticsEngine(shuffledStorage)
    expect(shuffledStorage.funnelOrder).toBeInstanceOf(Uint32Array)
    expect(shuffledRuntime.funnel(query(), { steps: [...definition.steps] })).toEqual(
      shuffledReference.funnel(query(), { steps: [...definition.steps] })
    )
  })

  it('matches custom comparisons with a zero baseline', () => {
    const request = query({
      comparison: {
        kind: 'custom',
        range: { start: '2026-02-01T00:00:00Z', end: '2026-02-02T00:00:00Z' }
      }
    })
    expect(runtime.compareSummary(request)).toEqual(reference.compareSummary(request))
    const previousRequest = query({
      range: { start: '2026-01-02T00:00:00Z', end: '2026-01-03T00:00:00Z' },
      comparison: { kind: 'previous_period' }
    })
    expect(runtime.compareSummary(previousRequest)).toEqual(reference.compareSummary(previousRequest))
  })

  it('uses fixed-width analytical columns without retaining event objects', () => {
    expect(estimateAnalyticsStorageBytes(storage)).toBe(dataset.eventCount * 40)
    expect(storage.eventCount).toBe(dataset.eventCount)
    expect(storage).not.toHaveProperty('events')
  })
})
