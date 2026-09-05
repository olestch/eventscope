import type {
  AnalyticsQuery,
  BreakdownResult,
  ComparisonResult,
  FunnelDefinition,
  FunnelResult,
  SummaryResult,
  TemporalHeatmapResult,
  TimeSeriesResult
} from '~/domain/analytics/contracts'
import type { DatasetProfile } from '~/domain/events/models'
import {
  AnalyticsGatewayProtocolError,
  AnalyticsGatewayRuntimeError,
  SupersededAnalyticsRequestError,
  type AnalyticsGateway
} from '~/services/analytics/AnalyticsGateway'
import type {
  AnalyticsWorkerRequest,
  AnalyticsWorkerResponse,
  RuntimeDatasetMetadata,
  WorkerProgressStage
} from '~/workers/analyticsProtocol'

export interface WorkerTransport {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: AnalyticsWorkerRequest): void
  terminate(): void
}

type RequestWithoutId = AnalyticsWorkerRequest extends infer Request
  ? Request extends AnalyticsWorkerRequest
    ? Omit<Request, 'requestId'>
    : never
  : never

interface PendingRequest {
  family: AnalyticsWorkerRequest['type']
  expectedType: AnalyticsWorkerResponse['type']
  resolve(value: unknown): void
  reject(reason: unknown): void
}

export class AnalyticsWorkerClient implements AnalyticsGateway {
  private worker: WorkerTransport
  private nextRequestId = 1
  private readonly pending = new Map<number, PendingRequest>()
  private readonly latestByFamily = new Map<AnalyticsWorkerRequest['type'], number>()
  private readonly progressListeners = new Set<(stage: WorkerProgressStage) => void>()
  private failed = false

  private readonly handleMessage = (event: MessageEvent<unknown>) => {
    const response = event.data
    if (
      !response ||
      typeof response !== 'object' ||
      typeof (response as { requestId?: unknown }).requestId !== 'number' ||
      typeof (response as { type?: unknown }).type !== 'string'
    ) {
      this.failed = true
      this.failAll(new AnalyticsGatewayProtocolError('Analytics runtime returned a malformed response.'))
      return
    }
    const message = response as AnalyticsWorkerResponse
    const pending = this.pending.get(message.requestId)
    if (!pending) return
    if (message.type === 'progress') {
      for (const listener of this.progressListeners) listener(message.stage)
      return
    }
    this.pending.delete(message.requestId)
    if (this.latestByFamily.get(pending.family) === message.requestId) {
      this.latestByFamily.delete(pending.family)
    }
    if (message.type === 'error') {
      const error = new Error(message.error.message)
      error.name = message.error.name
      pending.reject(error)
      return
    }
    if (message.type !== pending.expectedType) {
      this.failed = true
      const error = new AnalyticsGatewayProtocolError(
        `Expected ${pending.expectedType}, received ${message.type} for request ${message.requestId}.`
      )
      pending.reject(error)
      this.failAll(error)
      return
    }
    if (message.type === 'initialized') pending.resolve(message.metadata)
    else if (message.type === 'reset_complete') pending.resolve(undefined)
    else pending.resolve(message.result)
  }

  private readonly handleError = (event: ErrorEvent) => {
    this.failed = true
    this.failAll(new AnalyticsGatewayRuntimeError(event.message || 'Analytics runtime failed.'))
  }

  constructor(private readonly workerFactory: () => WorkerTransport) {
    this.worker = workerFactory()
    this.connect()
  }

  private connect() {
    this.worker.onmessage = this.handleMessage
    this.worker.onerror = this.handleError
  }

  private disconnect() {
    this.worker.onmessage = null
    this.worker.onerror = null
  }

  private failAll(error: Error) {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
    this.latestByFamily.clear()
  }

  private restartWorker() {
    this.disconnect()
    this.worker.terminate()
    this.worker = this.workerFactory()
    this.failed = false
    this.connect()
  }

  private send<Result>(
    request: RequestWithoutId,
    expectedType: AnalyticsWorkerResponse['type']
  ): Promise<Result> {
    const previousId = this.latestByFamily.get(request.type)
    if (previousId !== undefined) {
      const previous = this.pending.get(previousId)
      previous?.reject(new SupersededAnalyticsRequestError(`${request.type} request was superseded.`))
      this.pending.delete(previousId)
    }

    const requestId = this.nextRequestId++
    this.latestByFamily.set(request.type, requestId)
    return new Promise<Result>((resolve, reject) => {
      this.pending.set(requestId, {
        family: request.type,
        expectedType,
        resolve: resolve as (value: unknown) => void,
        reject
      })
      this.worker.postMessage({ ...request, requestId } as AnalyticsWorkerRequest)
    })
  }

  onProgress(listener: (stage: WorkerProgressStage) => void): () => void {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  initialize(profile: DatasetProfile): Promise<RuntimeDatasetMetadata> {
    this.failAll(new SupersededAnalyticsRequestError('Dataset initialization changed.'))
    if (this.failed) this.restartWorker()
    return this.send({ type: 'initialize', profile }, 'initialized')
  }

  summary(query: AnalyticsQuery): Promise<SummaryResult> {
    return this.send({ type: 'execute_summary', query }, 'summary_result')
  }

  breakdown(query: AnalyticsQuery): Promise<BreakdownResult> {
    return this.send({ type: 'execute_breakdown', query }, 'breakdown_result')
  }

  timeSeries(query: AnalyticsQuery): Promise<TimeSeriesResult> {
    return this.send({ type: 'execute_time_series', query }, 'time_series_result')
  }

  temporalHeatmap(query: AnalyticsQuery): Promise<TemporalHeatmapResult> {
    return this.send({ type: 'execute_temporal_heatmap', query }, 'temporal_heatmap_result')
  }

  funnel(query: AnalyticsQuery, definition: FunnelDefinition): Promise<FunnelResult> {
    return this.send({ type: 'execute_funnel', query, definition }, 'funnel_result')
  }

  compareSummary(query: AnalyticsQuery): Promise<ComparisonResult> {
    return this.send({ type: 'execute_comparison', query }, 'comparison_result')
  }

  reset(): Promise<void> {
    this.failAll(new SupersededAnalyticsRequestError('Analytics runtime was reset.'))
    if (this.failed) this.restartWorker()
    return this.send({ type: 'reset' }, 'reset_complete')
  }

  dispose(): void {
    this.failAll(new SupersededAnalyticsRequestError('Analytics gateway was disposed.'))
    this.disconnect()
    this.worker.terminate()
  }
}

export function createBrowserAnalyticsClient(): AnalyticsWorkerClient {
  return new AnalyticsWorkerClient(
    () =>
      new Worker(new URL('../../workers/analytics.worker.ts', import.meta.url), {
        type: 'module',
        name: 'eventscope-analytics'
      })
  )
}
