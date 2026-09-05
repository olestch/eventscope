import { describe, expect, it } from 'vitest'
import type { Measure, TemporalHeatmapCell, TemporalHeatmapResult } from '~/domain/analytics/contracts'
import {
  deriveTemporalInsights,
  TEMPORAL_MIN_COMPARISON_TOTAL,
  TEMPORAL_RELATIVE_INSIGHT_THRESHOLD
} from '~/features/explorer/temporalInsights'

const resultFor = (
  measure: Measure,
  value: (weekday: number, hour: number) => number,
  range = { start: '2026-01-01T00:00:00.000Z', end: '2026-02-01T00:00:00.000Z' }
): TemporalHeatmapResult => ({
  kind: 'temporal_heatmap',
  cells: Array.from({ length: 168 }, (_, index) => ({
    weekday: Math.floor(index / 24) as TemporalHeatmapCell['weekday'],
    hour: index % 24,
    values: { [measure]: value(Math.floor(index / 24), index % 24) }
  })),
  metadata: {
    datasetId: 'fixture',
    datasetFingerprint: 'fixture',
    query: {
      range,
      measures: [measure]
    },
    matchedEventCount: 1,
    matchedSessionCount: 1
  }
})

describe('explainable temporal insight rules', () => {
  it('emits stable peak, weekday/weekend and morning/evening evidence', () => {
    const result = resultFor('events', (weekday, hour) => {
      if (weekday === 5 && hour === 20) return 30
      if (weekday >= 5) return hour >= 18 ? 20 : 10
      return hour >= 18 ? 2 : 10
    })
    const insights = deriveTemporalInsights(result, 'events')
    expect(insights.map(({ id }) => id)).toEqual(['peak-window', 'weekday-weekend', 'morning-evening'])
    expect(insights[0]).toMatchObject({ evidence: { weekday: 5, hour: 20, value: 30 } })
    expect(JSON.stringify(insights)).not.toMatch(/NaN|Infinity/)
  })

  it('suppresses relative statements below the documented threshold', () => {
    const result = resultFor('events', (weekday) => (weekday >= 5 ? 109 : 100))
    const insights = deriveTemporalInsights(result, 'events')
    expect(TEMPORAL_RELATIVE_INSIGHT_THRESHOLD).toBe(0.1)
    expect(insights.map(({ id }) => id)).toEqual(['peak-window'])
  })

  it('suppresses relative statements backed by a tiny counted sample', () => {
    const tiny = resultFor('conversions', (weekday, hour) =>
      weekday === 0 && hour === 8 ? 1 : weekday === 5 && hour === 20 ? 2 : 0
    )
    expect(TEMPORAL_MIN_COMPARISON_TOTAL).toBe(20)
    expect(deriveTemporalInsights(tiny, 'conversions').map(({ id }) => id)).toEqual(['peak-window'])
  })

  it('avoids zero-denominator claims and never averages conversion-rate cells', () => {
    const zeroBaseline = resultFor('events', (weekday, hour) => (weekday >= 5 && hour >= 18 ? 10 : 0))
    expect(deriveTemporalInsights(zeroBaseline, 'events').map(({ id }) => id)).toEqual(['peak-window'])

    const rates = resultFor('conversion_rate', (weekday, hour) =>
      weekday === 6 && hour === 23 ? 0.5 : 0.1
    )
    expect(deriveTemporalInsights(rates, 'conversion_rate').map(({ id }) => id)).toEqual(['peak-window'])
  })

  it('returns no fabricated statement for an entirely empty aggregate', () => {
    expect(
      deriveTemporalInsights(
        resultFor('qr_scans', () => 0),
        'qr_scans'
      )
    ).toEqual([])
  })

  it('does not treat weekdays absent from a short date range as zero behavior', () => {
    const oneWednesday = resultFor(
      'events',
      (weekday, hour) => (weekday === 2 && hour === 10 ? 50 : 0),
      { start: '2026-03-04T00:00:00.000Z', end: '2026-03-05T00:00:00.000Z' }
    )
    expect(deriveTemporalInsights(oneWednesday, 'events').map(({ id }) => id)).toEqual([
      'peak-window',
      'morning-evening'
    ])
  })
})
