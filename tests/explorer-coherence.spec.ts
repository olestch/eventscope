import { describe, expect, it, vi } from 'vitest'
import type {
  BreakdownResult,
  ComparisonResult,
  FunnelResult,
  SummaryResult,
  TimeSeriesResult
} from '~/domain/analytics/contracts'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { ExplorerQueryCoordinator, StaleExplorerResultError } from '~/features/explorer/queryCoordinator'
import { createDefaultExplorerState } from '~/features/explorer/queryState'

const deferred = <Value>() => {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const metadata = (marker: number) => ({
  datasetId: `dataset-${marker}`,
  datasetFingerprint: `fingerprint-${marker}`,
  query: {
    range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
    measures: ['events' as const]
  },
  matchedEventCount: marker,
  matchedSessionCount: marker
})
const summary = (marker: number): SummaryResult => ({
  kind: 'summary',
  values: { events: marker },
  metadata: metadata(marker)
})
const timeline = (marker: number): TimeSeriesResult => ({
  kind: 'time_series',
  bucket: '1d',
  points: [],
  metadata: { ...metadata(marker), bucket: '1d' }
})
const breakdown = (marker: number): BreakdownResult => ({
  kind: 'breakdown',
  dimension: 'location',
  rows: [],
  metadata: metadata(marker)
})
const comparison = (marker: number): ComparisonResult => ({
  kind: 'comparison',
  primary: summary(marker),
  comparison: summary(marker - 1),
  deltas: { events: { absolute: 1, percentage: marker === 1 ? null : 100 / (marker - 1) } },
  comparisonDefinition: {
    kind: 'previous_period',
    range: { start: '2026-02-17T00:00:00.000Z', end: '2026-03-04T00:00:00.000Z' }
  }
})
const funnel = (marker: number): FunnelResult => ({
  kind: 'funnel',
  metadata: metadata(marker),
  steps: [
    { eventType: 'page_view', sessions: marker, percentageFromFirst: 100, dropOffFromPrevious: null },
    { eventType: 'registration', sessions: marker, percentageFromFirst: 100, dropOffFromPrevious: 0 },
    { eventType: 'conversion', sessions: marker, percentageFromFirst: 100, dropOffFromPrevious: 0 }
  ]
})

describe('Explorer result coherence', () => {
  it('never publishes a mixed result when A completes around newer query B', async () => {
    const summaryA = deferred<SummaryResult>()
    const timelineA = deferred<TimeSeriesResult>()
    const breakdownA = deferred<BreakdownResult>()
    const summaryB = deferred<SummaryResult>()
    const timelineB = deferred<TimeSeriesResult>()
    const breakdownB = deferred<BreakdownResult>()
    const gateway = {
      summary: vi.fn().mockReturnValueOnce(summaryA.promise).mockReturnValueOnce(summaryB.promise),
      timeSeries: vi.fn().mockReturnValueOnce(timelineA.promise).mockReturnValueOnce(timelineB.promise),
      breakdown: vi.fn().mockReturnValueOnce(breakdownA.promise).mockReturnValueOnce(breakdownB.promise),
      compareSummary: vi.fn(),
      funnel: vi.fn()
    }
    const coordinator = new ExplorerQueryCoordinator(gateway)
    const stateA = createDefaultExplorerState(referenceCatalog)
    const stateB = { ...stateA, channelIds: ['chn-paid'] }

    const resultA = coordinator.execute(stateA)
    summaryA.resolve(summary(1))
    const resultB = coordinator.execute(stateB)
    timelineA.resolve(timeline(1))
    breakdownA.resolve(breakdown(1))
    summaryB.resolve(summary(2))
    timelineB.resolve(timeline(2))
    breakdownB.resolve(breakdown(2))

    await expect(resultA).rejects.toBeInstanceOf(StaleExplorerResultError)
    await expect(resultB).resolves.toMatchObject({
      state: { channelIds: ['chn-paid'] },
      summary: { metadata: { matchedEventCount: 2 } },
      timeline: { metadata: { matchedEventCount: 2 } },
      breakdown: { metadata: { matchedEventCount: 2 } }
    })
  })

  it('propagates committed filters to one atomic comparison and lazy funnel result', async () => {
    const gateway = {
      summary: vi.fn(),
      timeSeries: vi.fn().mockResolvedValue(timeline(7)),
      breakdown: vi.fn().mockResolvedValue(breakdown(7)),
      compareSummary: vi.fn().mockResolvedValue(comparison(7)),
      funnel: vi.fn().mockResolvedValue(funnel(7))
    }
    const coordinator = new ExplorerQueryCoordinator(gateway)
    const state = {
      ...createDefaultExplorerState(referenceCatalog),
      channelIds: ['chn-paid'],
      locationIds: ['loc-harbor'],
      devices: ['mobile' as const],
      comparison: 'previous' as const,
      view: 'funnel' as const
    }
    const result = await coordinator.execute(state)
    expect(gateway.summary).not.toHaveBeenCalled()
    expect(gateway.compareSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignIds: ['cmp-northstar'],
        channelIds: ['chn-paid'],
        locationIds: ['loc-harbor'],
        devices: ['mobile'],
        comparison: { kind: 'previous_period' }
      })
    )
    expect(gateway.funnel).toHaveBeenCalledWith(
      expect.objectContaining({ channelIds: ['chn-paid'], locationIds: ['loc-harbor'] }),
      { steps: ['page_view', 'registration', 'conversion'] }
    )
    expect(result).toMatchObject({
      comparison: { primary: { metadata: { matchedEventCount: 7 } } },
      funnel: { metadata: { matchedEventCount: 7 } }
    })
  })

  it('rejects a late comparison generation after rapid cross-filtering', async () => {
    const comparisonA = deferred<ComparisonResult>()
    const comparisonB = deferred<ComparisonResult>()
    const gateway = {
      summary: vi.fn(),
      timeSeries: vi.fn().mockResolvedValue(timeline(2)),
      breakdown: vi.fn().mockResolvedValue(breakdown(2)),
      compareSummary: vi
        .fn()
        .mockReturnValueOnce(comparisonA.promise)
        .mockReturnValueOnce(comparisonB.promise),
      funnel: vi.fn()
    }
    const coordinator = new ExplorerQueryCoordinator(gateway)
    const base = {
      ...createDefaultExplorerState(referenceCatalog),
      comparison: 'previous' as const
    }
    const resultA = coordinator.execute({ ...base, locationIds: ['loc-harbor'] })
    const resultB = coordinator.execute({ ...base, channelIds: ['chn-paid'] })
    comparisonB.resolve(comparison(2))
    await expect(resultB).resolves.toMatchObject({
      state: { channelIds: ['chn-paid'] },
      comparison: { primary: { metadata: { matchedEventCount: 2 } } }
    })
    comparisonA.resolve(comparison(1))
    await expect(resultA).rejects.toBeInstanceOf(StaleExplorerResultError)
  })

  it('rejects a late funnel generation after the committed filter changes', async () => {
    const funnelA = deferred<FunnelResult>()
    const funnelB = deferred<FunnelResult>()
    const gateway = {
      summary: vi.fn().mockResolvedValue(summary(3)),
      timeSeries: vi.fn().mockResolvedValue(timeline(3)),
      breakdown: vi.fn().mockResolvedValue(breakdown(3)),
      compareSummary: vi.fn(),
      funnel: vi.fn().mockReturnValueOnce(funnelA.promise).mockReturnValueOnce(funnelB.promise)
    }
    const coordinator = new ExplorerQueryCoordinator(gateway)
    const base = { ...createDefaultExplorerState(referenceCatalog), view: 'funnel' as const }
    const resultA = coordinator.execute({ ...base, locationIds: ['loc-harbor'] })
    const resultB = coordinator.execute({ ...base, channelIds: ['chn-paid'] })
    funnelB.resolve(funnel(3))
    await expect(resultB).resolves.toMatchObject({ state: { channelIds: ['chn-paid'] } })
    funnelA.resolve(funnel(2))
    await expect(resultA).rejects.toBeInstanceOf(StaleExplorerResultError)
  })
})
