import { describe, expect, it } from 'vitest'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const engine = createAnalyticsEngine(createAnalyticsFixture())
const allMeasures = [
  'events',
  'sessions',
  'visitors',
  'conversions',
  'conversion_rate',
  'qr_scans'
] as const
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: [...allMeasures],
  ...overrides
})

describe('analytics filtering and summary measures', () => {
  it('calculates exact event, distinct and conversion measures', () => {
    expect(engine.summary(query()).values).toEqual({
      conversion_rate: 2 / 3,
      conversions: 2,
      events: 9,
      qr_scans: 2,
      sessions: 3,
      visitors: 2
    })
  })

  it('counts a session with repeated conversions only once', () => {
    const result = engine.summary(query({ campaignIds: ['cmp-northstar'] }))
    expect(result.values.conversions).toBe(1)
  })

  it('uses OR within a dimension and AND across dimensions', () => {
    const orResult = engine.summary(
      query({ campaignIds: ['cmp-northstar', 'cmp-orbit'], measures: ['events'] })
    )
    const andResult = engine.summary(
      query({ campaignIds: ['cmp-northstar'], devices: ['mobile'], measures: ['events'] })
    )
    expect(orResult.values.events).toBe(9)
    expect(andResult.values.events).toBe(4)
  })

  it('supports every source-backed filter dimension', () => {
    const result = engine.summary(
      query({
        eventTypes: ['qr_scan'],
        campaignIds: ['cmp-northstar'],
        channelIds: ['chn-physical'],
        sourceIds: ['src-entrance-poster'],
        locationIds: ['loc-harbor'],
        assetIds: ['asset-harbor-entry'],
        qrCodeIds: ['qr-harbor-entry'],
        devices: ['mobile'],
        browsers: ['Safari'],
        operatingSystems: ['iOS'],
        countryCodes: ['US'],
        regions: ['Northwest'],
        measures: ['events', 'qr_scans']
      })
    )
    expect(result.values).toEqual({ events: 1, qr_scans: 1 })
  })

  it('treats empty filters as unrestricted', () => {
    expect(engine.summary(query({ campaignIds: [], devices: [] })).values.events).toBe(9)
  })

  it('uses inclusive start and exclusive end boundaries', () => {
    const result = engine.summary(
      query({
        range: {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-01T01:00:00.000Z'
        },
        measures: ['events']
      })
    )
    expect(result.values.events).toBe(4)
  })

  it('keeps a conversion-only query denominator independent from its event filter', () => {
    const result = engine.summary(query({ eventTypes: ['conversion'] }))
    expect(result.values.events).toBe(3)
    expect(result.values.sessions).toBe(2)
    expect(result.values.conversions).toBe(2)
    expect(result.values.conversion_rate).toBe(2 / 3)
  })

  it('returns finite zero conversion rate when no session is eligible', () => {
    const result = engine.summary(
      query({ campaignIds: ['cmp-missing'], measures: ['conversion_rate', 'conversions'] })
    )
    expect(result.values).toEqual({ conversion_rate: 0, conversions: 0 })
    expect(Number.isFinite(result.values.conversion_rate)).toBe(true)
    expect(result.metadata.emptyReason).toBe('no_matching_events')
  })

  it('returns only requested measures and stable dataset metadata', () => {
    const result = engine.summary(query({ measures: ['sessions'] }))
    expect(result.values).toEqual({ sessions: 3 })
    expect(result.metadata).toMatchObject({
      datasetId: 'analytics-fixture',
      datasetFingerprint: 'fixture-fingerprint',
      matchedEventCount: 9,
      matchedSessionCount: 3
    })
  })

  it('does not mutate source events while producing derived results', () => {
    const dataset = createAnalyticsFixture()
    const before = JSON.stringify(dataset.events)
    createAnalyticsEngine(dataset).summary(query())
    expect(JSON.stringify(dataset.events)).toBe(before)
  })

  it('rejects unsupported runtime measures with a typed error', () => {
    expect(() =>
      engine.summary(query({ measures: ['revenue' as AnalyticsQuery['measures'][number]] }))
    ).toThrowError(expect.objectContaining({ code: 'unsupported_measure' }))
  })
})
