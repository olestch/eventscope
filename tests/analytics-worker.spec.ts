import { describe, expect, it } from 'vitest'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'
import { AnalyticsWorkerClient, type WorkerTransport } from '~/services/analytics/AnalyticsWorkerClient'
import {
  AnalyticsGatewayRuntimeError,
  SupersededAnalyticsRequestError
} from '~/services/analytics/AnalyticsGateway'
import { createAnalyticsWorkerHandler } from '~/workers/analyticsWorkerHandler'
import type {
  AnalyticsWorkerRequest,
  AnalyticsWorkerResponse,
  RuntimeDatasetMetadata
} from '~/workers/analyticsProtocol'

const summaryQuery = {
  range: fixtureRange,
  measures: ['events'] as const
}

class FakeWorker implements WorkerTransport {
  readonly sent: AnalyticsWorkerRequest[] = []
  terminated = false
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null

  postMessage(message: AnalyticsWorkerRequest) {
    this.sent.push(message)
  }

  terminate() {
    this.terminated = true
  }

  respond(response: AnalyticsWorkerResponse | object) {
    this.onmessage?.({ data: response } as MessageEvent<unknown>)
  }

  fail(message: string) {
    this.onerror?.({ message } as ErrorEvent)
  }
}

const metadata: RuntimeDatasetMetadata = {
  datasetId: 'fixture',
  fingerprint: 'fixture-fingerprint',
  profile: 'test',
  eventCount: 10,
  referencePeriod: fixtureRange,
  analyticalStorageBytes: 400,
  generationMs: 1,
  compilationMs: 1
}

describe('Analytics Worker handler', () => {
  it('initializes, correlates a query response, resets and reinitializes', () => {
    const responses: AnalyticsWorkerResponse[] = []
    const handle = createAnalyticsWorkerHandler((response) => responses.push(response), {
      generate: () => createAnalyticsFixture()
    })

    handle({ requestId: 1, type: 'initialize', profile: 'test' })
    expect(responses.at(-1)).toMatchObject({ requestId: 1, type: 'initialized' })
    expect(responses.filter(({ type }) => type === 'progress')).toHaveLength(3)

    handle({ requestId: 2, type: 'execute_summary', query: { ...summaryQuery, measures: ['events'] } })
    expect(responses.at(-1)).toMatchObject({
      requestId: 2,
      type: 'summary_result',
      result: { values: { events: 9 } }
    })

    handle({
      requestId: 21,
      type: 'execute_temporal_heatmap',
      query: { ...summaryQuery, measures: ['events'] }
    })
    const temporalResponse = responses.at(-1)
    expect(temporalResponse).toMatchObject({
      requestId: 21,
      type: 'temporal_heatmap_result',
      result: { kind: 'temporal_heatmap' }
    })
    expect(
      temporalResponse?.type === 'temporal_heatmap_result' ? temporalResponse.result.cells : []
    ).toHaveLength(168)

    handle({
      requestId: 22,
      type: 'execute_summary',
      query: {
        range: { start: fixtureRange.end, end: fixtureRange.start },
        measures: ['events']
      }
    })
    expect(responses.at(-1)).toMatchObject({
      requestId: 22,
      type: 'error',
      error: { code: 'invalid_range' }
    })

    handle({ requestId: 3, type: 'reset' })
    handle({ requestId: 4, type: 'execute_summary', query: { ...summaryQuery, measures: ['events'] } })
    expect(responses.at(-1)).toMatchObject({ requestId: 4, type: 'error' })

    handle({ requestId: 5, type: 'initialize', profile: 'test' })
    expect(responses.at(-1)).toMatchObject({ requestId: 5, type: 'initialized' })
  })

  it('reports initialization failure and accepts a later retry', () => {
    const responses: AnalyticsWorkerResponse[] = []
    let shouldFail = true
    const handle = createAnalyticsWorkerHandler((response) => responses.push(response), {
      generate: () => {
        if (shouldFail) throw new Error('generation failed')
        return createAnalyticsFixture()
      }
    })

    handle({ requestId: 1, type: 'initialize', profile: 'test' })
    expect(responses.at(-1)).toMatchObject({
      requestId: 1,
      type: 'error',
      error: { message: 'generation failed' }
    })

    shouldFail = false
    handle({ requestId: 2, type: 'initialize', profile: 'test' })
    expect(responses.at(-1)).toMatchObject({ requestId: 2, type: 'initialized' })
  })
})

describe('Analytics Worker client', () => {
  it('correlates typed responses and reports initialization progress', async () => {
    const worker = new FakeWorker()
    const client = new AnalyticsWorkerClient(() => worker)
    const progress: string[] = []
    client.onProgress((stage) => progress.push(stage))

    const initialized = client.initialize('test')
    const request = worker.sent[0]!
    worker.respond({ requestId: request.requestId, type: 'progress', stage: 'generating_events' })
    worker.respond({ requestId: request.requestId, type: 'initialized', metadata })

    await expect(initialized).resolves.toEqual(metadata)
    expect(progress).toEqual(['generating_events'])
  })

  it('logically cancels an older same-family request and ignores its late response', async () => {
    const worker = new FakeWorker()
    const client = new AnalyticsWorkerClient(() => worker)
    const first = client.summary({ ...summaryQuery, measures: ['events'] })
    const firstOutcome = first.catch((error: unknown) => error)
    const second = client.summary({ ...summaryQuery, measures: ['events'], campaignIds: ['current'] })
    const [firstRequest, secondRequest] = worker.sent

    worker.respond({
      requestId: secondRequest!.requestId,
      type: 'summary_result',
      result: { kind: 'summary', values: { events: 2 }, metadata: {} }
    })
    worker.respond({
      requestId: firstRequest!.requestId,
      type: 'summary_result',
      result: { kind: 'summary', values: { events: 1 }, metadata: {} }
    })

    expect(await firstOutcome).toBeInstanceOf(SupersededAnalyticsRequestError)
    await expect(second).resolves.toMatchObject({ values: { events: 2 } })
  })

  it('uses a dedicated typed temporal heatmap request family', async () => {
    const worker = new FakeWorker()
    const client = new AnalyticsWorkerClient(() => worker)
    const pending = client.temporalHeatmap({ ...summaryQuery, measures: ['events'] })
    const request = worker.sent[0]!
    expect(request).toMatchObject({ type: 'execute_temporal_heatmap' })
    worker.respond({
      requestId: request.requestId,
      type: 'temporal_heatmap_result',
      result: { kind: 'temporal_heatmap', cells: [], metadata: {} }
    })
    await expect(pending).resolves.toMatchObject({ kind: 'temporal_heatmap' })
  })

  it('invalidates an older query when dataset initialization changes', async () => {
    const worker = new FakeWorker()
    const client = new AnalyticsWorkerClient(() => worker)
    const queryResult = client.summary({ ...summaryQuery, measures: ['events'] })
    const queryOutcome = queryResult.catch((error: unknown) => error)
    const initialization = client.initialize('large')
    const initializeRequest = worker.sent.at(-1)!
    worker.respond({ requestId: initializeRequest.requestId, type: 'initialized', metadata })

    expect(await queryOutcome).toBeInstanceOf(SupersededAnalyticsRequestError)
    await expect(initialization).resolves.toEqual(metadata)
  })

  it('restarts after a worker failure and can initialize again', async () => {
    const workers = [new FakeWorker(), new FakeWorker()]
    let nextWorker = 0
    const client = new AnalyticsWorkerClient(() => workers[nextWorker++]!)
    const pending = client.summary({ ...summaryQuery, measures: ['events'] })
    const activeWorker = workers[0]!
    activeWorker.fail('runtime failed')
    await expect(pending).rejects.toBeInstanceOf(AnalyticsGatewayRuntimeError)

    const recovered = client.initialize('test')
    const replacement = workers[1]!
    expect(replacement).not.toBe(activeWorker)
    replacement.respond({
      requestId: replacement.sent[0]!.requestId,
      type: 'initialized',
      metadata
    })
    await expect(recovered).resolves.toEqual(metadata)
    expect(activeWorker.terminated).toBe(true)
  })

  it('rejects malformed responses instead of deadlocking pending work', async () => {
    const workers = [new FakeWorker(), new FakeWorker()]
    let nextWorker = 0
    const client = new AnalyticsWorkerClient(() => workers[nextWorker++]!)
    const worker = workers[0]!
    const pending = client.summary({ ...summaryQuery, measures: ['events'] })
    worker.respond({ unexpected: true })
    await expect(pending).rejects.toThrow('malformed response')

    const recovered = client.initialize('test')
    const replacement = workers[1]!
    replacement.respond({ requestId: replacement.sent[0]!.requestId, type: 'initialized', metadata })
    await expect(recovered).resolves.toEqual(metadata)
    expect(worker.terminated).toBe(true)
  })
})
