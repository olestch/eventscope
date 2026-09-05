import { describe, expect, it } from 'vitest'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage } from '~/domain/analytics/storage'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const dataset = createAnalyticsFixture()
const reference = createAnalyticsEngine(dataset)
const runtime = createRuntimeAnalyticsEngine(compileAnalyticsStorage(dataset))
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans'],
  ...overrides
})

describe('temporal heatmap analytics', () => {
  it('returns a deterministic Monday-first 7 × 24 UTC topology including empty cells', () => {
    const first = reference.temporalHeatmap(query())
    const repeated = reference.temporalHeatmap(query())
    expect(first).toEqual(repeated)
    expect(first.cells).toHaveLength(168)
    expect(first.cells[0]).toMatchObject({ weekday: 0, hour: 0 })
    expect(first.cells[23]).toMatchObject({ weekday: 0, hour: 23 })
    expect(first.cells[24]).toMatchObject({ weekday: 1, hour: 0 })
    expect(first.cells[167]).toMatchObject({ weekday: 6, hour: 23 })
    expect(first.cells[0]?.values).toEqual({
      events: 0,
      sessions: 0,
      conversions: 0,
      conversion_rate: 0,
      qr_scans: 0
    })
  })

  it('uses deduplicated eligible-session conversion semantics inside each cell', () => {
    const result = reference.temporalHeatmap(query())
    const thursdayMidnight = result.cells.find(({ weekday, hour }) => weekday === 3 && hour === 0)
    expect(thursdayMidnight?.values).toEqual({
      events: 4,
      sessions: 1,
      conversions: 1,
      conversion_rate: 1,
      qr_scans: 1
    })
    expect(result.cells.find(({ weekday, hour }) => weekday === 3 && hour === 1)?.values).toEqual({
      events: 2,
      sessions: 1,
      conversions: 0,
      conversion_rate: 0,
      qr_scans: 1
    })
  })

  it('respects full filters, half-open date ranges and QR scan semantics', () => {
    const orbit = reference.temporalHeatmap(query({ campaignIds: ['cmp-orbit'] }))
    expect(orbit.metadata.matchedEventCount).toBe(3)
    expect(orbit.cells.find(({ weekday, hour }) => weekday === 4 && hour === 0)?.values.events).toBe(3)

    const firstDay = reference.temporalHeatmap(
      query({ range: { start: fixtureRange.start, end: '2026-01-02T00:00:00.000Z' } })
    )
    expect(firstDay.metadata.matchedEventCount).toBe(6)
    expect(firstDay.cells.reduce((total, cell) => total + (cell.values.qr_scans ?? 0), 0)).toBe(2)
    expect(firstDay.cells.find(({ weekday, hour }) => weekday === 4 && hour === 0)?.values.events).toBe(
      0
    )
  })

  it('keeps reference and columnar runtime results identical', () => {
    for (const request of [
      query(),
      query({ locationIds: ['loc-harbor'] }),
      query({ eventTypes: ['conversion'] }),
      query({ campaignIds: ['missing'] })
    ]) {
      expect(runtime.temporalHeatmap(request)).toEqual(reference.temporalHeatmap(request))
    }
  })
})
