import { describe, expect, it } from 'vitest'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { EventRecord } from '~/domain/events/models'
import { analyticsFixtureEvents, createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: ['events'],
  ...overrides
})

describe('session-based funnels', () => {
  const engine = createAnalyticsEngine(createAnalyticsFixture())

  it('counts complete and partial ordered journeys once per reached step', () => {
    const result = engine.funnel(query(), {
      steps: ['page_view', 'qr_scan', 'conversion']
    })
    expect(result.steps.map(({ eventType, sessions }) => ({ eventType, sessions }))).toEqual([
      { eventType: 'page_view', sessions: 3 },
      { eventType: 'qr_scan', sessions: 2 },
      { eventType: 'conversion', sessions: 1 }
    ])
    expect(result.steps[0]).toMatchObject({ percentageFromFirst: 100, dropOffFromPrevious: null })
    expect(result.steps[1]!.percentageFromFirst).toBeCloseTo(200 / 3)
    expect(result.steps[1]!.dropOffFromPrevious).toBeCloseTo(100 / 3)
    expect(result.steps[2]!.percentageFromFirst).toBeCloseTo(100 / 3)
    expect(result.steps[2]!.dropOffFromPrevious).toBe(50)
  })

  it('allows unrelated events and ignores repeated events after a reached step', () => {
    const result = engine.funnel(query(), {
      steps: ['page_view', 'download', 'conversion']
    })
    expect(result.steps.map(({ sessions }) => sessions)).toEqual([3, 1, 1])
  })

  it('does not advance a session through out-of-order events', () => {
    const reversed: EventRecord[] = [
      { ...analyticsFixtureEvents[2]!, id: 'reverse-1', timestamp: '2026-01-01T00:00:00Z' },
      {
        ...analyticsFixtureEvents[0]!,
        id: 'reverse-2',
        timestamp: '2026-01-01T00:01:00Z'
      }
    ]
    const result = createAnalyticsEngine(createAnalyticsFixture(reversed)).funnel(query(), {
      steps: ['page_view', 'conversion']
    })
    expect(result.steps.map(({ sessions }) => sessions)).toEqual([1, 0])
  })

  it('accepts ordered steps at the same timestamp using stable source order', () => {
    const sameTime: EventRecord[] = [
      { ...analyticsFixtureEvents[0]!, id: 'same-1' },
      { ...analyticsFixtureEvents[2]!, id: 'same-2', timestamp: '2026-01-01T00:00:00Z' }
    ]
    const result = createAnalyticsEngine(createAnalyticsFixture(sameTime)).funnel(query(), {
      steps: ['page_view', 'conversion']
    })
    expect(result.steps.map(({ sessions }) => sessions)).toEqual([1, 1])
  })

  it('rejects malformed funnel definitions', () => {
    expect(() => engine.funnel(query(), { steps: ['page_view'] })).toThrowError(
      expect.objectContaining({ code: 'malformed_funnel' })
    )
    expect(() => engine.funnel(query(), { steps: ['page_view', 'page_view'] })).toThrowError(
      expect.objectContaining({ code: 'malformed_funnel' })
    )
  })
})

describe('summary comparisons', () => {
  const engine = createAnalyticsEngine(createAnalyticsFixture())

  it('resolves an equal-duration previous period immediately before the primary range', () => {
    const result = engine.compareSummary(
      query({
        range: { start: '2026-01-02T00:00:00Z', end: '2026-01-03T00:00:00Z' },
        comparison: { kind: 'previous_period' }
      })
    )
    expect(result.comparisonDefinition.range).toEqual({
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-02T00:00:00.000Z'
    })
    expect(result.primary.values.events).toBe(3)
    expect(result.comparison.values.events).toBe(6)
    expect(result.deltas.events).toEqual({ absolute: -3, percentage: -50 })
  })

  it('supports custom comparison ranges and positive deltas', () => {
    const result = engine.compareSummary(
      query({
        range: { start: '2026-01-01T00:00:00Z', end: '2026-01-02T00:00:00Z' },
        comparison: {
          kind: 'custom',
          range: { start: '2026-01-02T00:00:00Z', end: '2026-01-03T00:00:00Z' }
        }
      })
    )
    expect(result.deltas.events).toEqual({ absolute: 3, percentage: 100 })
  })

  it('returns null percentage rather than NaN or Infinity for a zero baseline', () => {
    const result = engine.compareSummary(
      query({
        comparison: {
          kind: 'custom',
          range: { start: '2026-02-01T00:00:00Z', end: '2026-02-02T00:00:00Z' }
        }
      })
    )
    expect(result.comparison.metadata.emptyReason).toBe('no_matching_events')
    expect(result.deltas.events).toEqual({ absolute: 9, percentage: null })
  })

  it('requires an explicit comparison definition', () => {
    expect(() => engine.compareSummary(query())).toThrowError(
      expect.objectContaining({ code: 'missing_comparison' })
    )
  })
})
