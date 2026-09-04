import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import {
  buildBreakdownChartOption,
  buildBreakdownViewModel,
  buildTimelineChartOption,
  buildTimelineViewModel,
  formatCount,
  formatPercentage
} from '~/features/explorer/presentation'
import type { BreakdownResult, TimeSeriesResult } from '~/domain/analytics/contracts'

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
})
