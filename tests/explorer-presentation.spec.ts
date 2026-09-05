import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import {
  buildBreakdownChartOption,
  buildBreakdownViewModel,
  buildComparisonViewModel,
  buildFunnelViewModel,
  buildTemporalHeatmapChartOption,
  buildTemporalHeatmapViewModel,
  buildTimelineChartOption,
  buildTimelineViewModel,
  formatCount,
  formatPercentage
} from '~/features/explorer/presentation'
import type {
  BreakdownResult,
  ComparisonResult,
  FunnelResult,
  SummaryResult,
  TemporalHeatmapResult,
  TimeSeriesResult
} from '~/domain/analytics/contracts'

const metadata = {
  datasetId: 'fixture',
  datasetFingerprint: 'fixture',
  query: {
    range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-06T00:00:00.000Z' },
    measures: ['events' as const]
  },
  matchedEventCount: 12,
  matchedSessionCount: 8
}

describe('Explorer presentation models', () => {
  it('maps time series into exact chart/table values without mutating the result', () => {
    const result: TimeSeriesResult = {
      kind: 'time_series',
      bucket: '1d',
      metadata: { ...metadata, bucket: '1d' },
      points: [
        {
          timestamp: '2026-03-04T00:00:00.000Z',
          range: {
            start: '2026-03-04T00:00:00.000Z',
            end: '2026-03-05T00:00:00.000Z'
          },
          values: { events: 10, qr_scans: 2 }
        }
      ]
    }
    const before = structuredClone(result)
    const model = buildTimelineViewModel(result)
    expect(model.points[0]).toMatchObject({ events: 10, qrScans: 2 })
    expect(model.points[0]!.rangeLabel).toContain('[start, end) UTC')
    expect(buildTimelineChartOption(model, true)).toMatchObject({ animation: false })
    expect(result).toEqual(before)
  })

  it('resolves labels, preserves fallback keys and ranks stably', () => {
    const result: BreakdownResult = {
      kind: 'breakdown',
      dimension: 'location',
      metadata,
      rows: [
        { key: 'missing-location', values: { sessions: 4, conversion_rate: 0 } },
        { key: 'loc-river', values: { sessions: 8, conversion_rate: 0.1 } },
        { key: 'loc-harbor', values: { sessions: 8, conversion_rate: 0.2 } }
      ]
    }
    const model = buildBreakdownViewModel(result, referenceCatalog, 'sessions')
    expect(model.rows.map(({ label }) => label)).toEqual([
      'Harbor Hall',
      'Riverfront Lab',
      'missing-location'
    ])
    expect(buildBreakdownChartOption(model, true)).toMatchObject({ animation: false })
  })

  it('centralizes count and percentage formatting', () => {
    expect(formatCount(12345)).toBe('12,345')
    expect(formatPercentage(0.1234)).toBe('12.3%')
  })

  it('maps empty analytical results to empty view models', () => {
    const timeline = buildTimelineViewModel({
      kind: 'time_series',
      bucket: '1d',
      metadata: { ...metadata, bucket: '1d' },
      points: []
    })
    const breakdown = buildBreakdownViewModel(
      { kind: 'breakdown', dimension: 'channel', metadata, rows: [] },
      referenceCatalog,
      'events'
    )
    expect(timeline.points).toEqual([])
    expect(breakdown.rows).toEqual([])
  })

  it('presents comparison changes without Infinity or NaN edge cases', () => {
    const summary = (values: SummaryResult['values'], matchedEventCount: number): SummaryResult => ({
      kind: 'summary',
      values,
      metadata: {
        ...metadata,
        matchedEventCount,
        ...(matchedEventCount === 0 ? { emptyReason: 'no_matching_events' as const } : {})
      }
    })
    const comparison = (
      current: SummaryResult['values'],
      previous: SummaryResult['values'],
      previousEvents: number,
      deltas: ComparisonResult['deltas']
    ): ComparisonResult => ({
      kind: 'comparison',
      primary: summary(current, 4),
      comparison: summary(previous, previousEvents),
      deltas,
      comparisonDefinition: {
        kind: 'previous_period',
        range: { start: '2026-03-02T00:00:00.000Z', end: '2026-03-04T00:00:00.000Z' }
      }
    })

    const changed = buildComparisonViewModel(
      comparison(
        { events: 0, sessions: 5, conversion_rate: 0.12 },
        { events: 5, sessions: 0, conversion_rate: 0.1 },
        5,
        {
          events: { absolute: -5, percentage: -100 },
          sessions: { absolute: 5, percentage: null },
          conversion_rate: { absolute: 0.02, percentage: 20 }
        }
      )
    )
    expect(changed.metrics.events?.text).toBe('−100.0% vs previous period')
    expect(changed.metrics.sessions?.text).toBe('New vs previous period')
    expect(changed.metrics.conversion_rate?.text).toBe('+20.0% vs previous period')
    expect(JSON.stringify(changed)).not.toMatch(/Infinity|NaN/)

    const unavailable = buildComparisonViewModel(
      comparison({ events: 5 }, { events: 0 }, 0, {
        events: { absolute: 5, percentage: null }
      })
    )
    expect(unavailable.metrics.events?.text).toBe('No previous data')
  })

  it('builds an exact session-funnel model for zero entrants and zero later progression', () => {
    const funnel = (sessions: number[]): FunnelResult => ({
      kind: 'funnel',
      metadata,
      steps: ['page_view', 'registration', 'conversion'].map((eventType, index) => ({
        eventType: eventType as 'page_view' | 'registration' | 'conversion',
        sessions: sessions[index]!,
        percentageFromFirst: sessions[0] ? (sessions[index]! / sessions[0]!) * 100 : 0,
        dropOffFromPrevious:
          index === 0 || !sessions[index - 1]
            ? null
            : ((sessions[index - 1]! - sessions[index]!) / sessions[index - 1]!) * 100
      }))
    })
    const empty = buildFunnelViewModel(funnel([0, 0, 0]))
    expect(empty.empty).toBe(true)
    expect(empty.steps[1]?.progressionFromPrevious).toBe('No prior entrants')

    const stopped = buildFunnelViewModel(funnel([10, 4, 0]))
    expect(stopped.steps.map(({ label }) => label)).toEqual(['Page view', 'Registration', 'Conversion'])
    expect(stopped.steps[1]).toMatchObject({ progressionFromPrevious: '40.0%', sessions: 4 })
    expect(stopped.steps[2]).toMatchObject({ progressionFromPrevious: '0.0%', sessions: 0 })
  })

  it('maps temporal cells to canonical coordinates, labels, scale and exact table values', () => {
    const temporal: TemporalHeatmapResult = {
      kind: 'temporal_heatmap',
      metadata,
      cells: Array.from({ length: 168 }, (_, index) => ({
        weekday: Math.floor(index / 24) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        hour: index % 24,
        values: { conversion_rate: index === 42 ? 0.384 : 0 }
      }))
    }
    const before = structuredClone(temporal)
    const model = buildTemporalHeatmapViewModel(temporal, 'conversion_rate')
    expect(model.cells).toHaveLength(168)
    expect(model.cells[0]).toMatchObject({
      weekdayLabel: 'Monday',
      hourLabel: '00:00',
      hourRangeLabel: '00:00–01:00 UTC',
      coordinates: [0, 0, 0],
      formattedValue: '0.0%'
    })
    expect(model.cells[42]).toMatchObject({
      weekdayLabel: 'Tuesday',
      hour: 18,
      coordinates: [18, 1, 0.384],
      formattedValue: '38.4%'
    })
    expect(model.scale).toMatchObject({ min: 0, max: 0.384, minLabel: '0.0%', maxLabel: '38.4%' })
    expect(buildTemporalHeatmapChartOption(model, true)).toMatchObject({
      animation: false,
      series: [{ type: 'heatmap' }]
    })
    expect(temporal).toEqual(before)
  })
})
