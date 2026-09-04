import { describe, expect, it } from 'vitest'
import { bucketCount, floorBucket, nextBucket, selectAdaptiveBucket } from '~/domain/analytics/buckets'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { AnalyticsError } from '~/domain/analytics/errors'
import type { AnalyticsQuery, BucketSize } from '~/domain/analytics/contracts'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const engine = createAnalyticsEngine(createAnalyticsFixture())
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: ['events'],
  ...overrides
})

describe('categorical breakdowns', () => {
  it.each([
    ['campaign', 'cmp-northstar'],
    ['channel', 'chn-physical'],
    ['source', 'src-entrance-poster'],
    ['location', 'loc-harbor'],
    ['asset', 'asset-harbor-entry'],
    ['qr_code', 'qr-harbor-entry'],
    ['device', 'mobile'],
    ['browser', 'Safari'],
    ['operating_system', 'iOS'],
    ['country', 'US'],
    ['region', 'Northwest']
  ] as const)('supports the %s dimension', (dimension, expectedKey) => {
    const result = engine.breakdown(query({ breakdown: dimension }))
    expect(result.rows.some(({ key }) => key === expectedKey)).toBe(true)
  })

  it('groups by raw dimension IDs with multiple measures', () => {
    const result = engine.breakdown(
      query({ breakdown: 'campaign', measures: ['events', 'sessions', 'conversions'] })
    )
    expect(result.rows).toEqual([
      {
        key: 'cmp-northstar',
        values: { conversions: 1, events: 6, sessions: 2 }
      },
      {
        key: 'cmp-orbit',
        values: { conversions: 1, events: 3, sessions: 1 }
      }
    ])
  })

  it('sorts descending by the canonical primary measure and uses key as tie-breaker', () => {
    const result = engine.breakdown(query({ breakdown: 'country', measures: ['events'] }))
    expect(result.rows.map(({ key }) => key)).toEqual(['US', 'DE'])

    const tied = engine.breakdown(query({ breakdown: 'campaign', measures: ['conversions'] }))
    expect(tied.rows.map(({ key }) => key)).toEqual(['cmp-northstar', 'cmp-orbit'])
  })

  it('excludes missing optional dimension values and preserves QR downstream conversion', () => {
    const result = engine.breakdown(
      query({ breakdown: 'qr_code', measures: ['conversions', 'qr_scans'] })
    )
    expect(result.rows).toEqual([
      { key: 'qr-harbor-entry', values: { conversions: 1, qr_scans: 1 } },
      { key: 'qr-river-stage', values: { conversions: 0, qr_scans: 1 } }
    ])
  })

  it('returns an empty, non-error result for no matching dimension values', () => {
    const result = engine.breakdown(query({ campaignIds: ['cmp-missing'], breakdown: 'location' }))
    expect(result.rows).toEqual([])
    expect(result.metadata.emptyReason).toBe('no_matching_events')
  })

  it('does not create zero-valued rows from events excluded by the event-type filter', () => {
    const result = engine.breakdown(query({ eventTypes: ['share'], breakdown: 'campaign' }))
    expect(result.rows).toEqual([])
    expect(result.metadata.emptyReason).toBe('no_matching_events')
  })

  it('uses typed errors for missing or unsupported breakdowns', () => {
    expect(() => engine.breakdown(query())).toThrowError(AnalyticsError)
    expect(() =>
      engine.breakdown(query({ breakdown: 'unknown' as AnalyticsQuery['breakdown'] }))
    ).toThrowError(expect.objectContaining({ code: 'unsupported_breakdown' }))
  })
})

describe('UTC semantic time buckets', () => {
  it('fills continuous daily buckets with real zero-free and populated values', () => {
    const result = engine.timeSeries(
      query({ bucket: { kind: 'fixed', size: '1d' }, measures: ['events', 'sessions'] })
    )
    expect(result.bucket).toBe('1d')
    expect(result.points.map(({ values }) => values)).toEqual([
      { events: 6, sessions: 2 },
      { events: 3, sessions: 1 }
    ])
  })

  it('fills empty buckets and respects exact range boundaries', () => {
    const result = engine.timeSeries(
      query({
        range: {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-01T04:00:00.000Z'
        },
        bucket: { kind: 'fixed', size: '1h' }
      })
    )
    expect(result.points.map(({ values }) => values.events)).toEqual([4, 2, 0, 0])
  })

  it('aligns weeks to Monday and months to calendar boundaries in UTC', () => {
    expect(new Date(floorBucket(Date.parse('2026-01-07T15:00:00Z'), '1w')).toISOString()).toBe(
      '2026-01-05T00:00:00.000Z'
    )
    expect(new Date(floorBucket(Date.parse('2026-02-18T15:00:00Z'), '1mo')).toISOString()).toBe(
      '2026-02-01T00:00:00.000Z'
    )
    expect(new Date(nextBucket(Date.parse('2024-02-01T00:00:00Z'), '1mo')).toISOString()).toBe(
      '2024-03-01T00:00:00.000Z'
    )
  })

  it('selects deterministic adaptive buckets within point budgets', () => {
    expect(
      selectAdaptiveBucket({ start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z' }, 12)
    ).toBe('5m')
    expect(selectAdaptiveBucket({ start: '2026-01-01T00:00:00Z', end: '2026-01-02T00:00:00Z' }, 4)).toBe(
      '6h'
    )
    expect(bucketCount({ start: '2026-01-01T00:00:00Z', end: '2027-01-01T00:00:00Z' }, '1mo')).toBe(12)
  })

  it('rejects invalid ranges and bucket requests explicitly', () => {
    expect(() =>
      engine.summary(query({ range: { ...fixtureRange, end: fixtureRange.start } }))
    ).toThrowError(expect.objectContaining({ code: 'invalid_range' }))
    expect(() =>
      engine.timeSeries(query({ bucket: { kind: 'fixed', size: '2h' as BucketSize } }))
    ).toThrowError(expect.objectContaining({ code: 'invalid_bucket' }))
    expect(() => engine.timeSeries(query({ bucket: { kind: 'adaptive', maxPoints: 0 } }))).toThrowError(
      expect.objectContaining({ code: 'invalid_bucket' })
    )
  })
})
