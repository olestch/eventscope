import { describe, expect, it, vi } from 'vitest'
import type { BreakdownResult, SummaryResult, TimeSeriesResult } from '~/domain/analytics/contracts'
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
      breakdown: vi.fn().mockReturnValueOnce(breakdownA.promise).mockReturnValueOnce(breakdownB.promise)
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
})
