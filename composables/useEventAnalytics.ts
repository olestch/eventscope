import { reactive, readonly } from 'vue'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
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
import { createBrowserAnalyticsClient } from '~/services/analytics/AnalyticsWorkerClient'
import type { AnalyticsWorkerClient } from '~/services/analytics/AnalyticsWorkerClient'
import {
  AnalyticsGatewayProtocolError,
  AnalyticsGatewayRuntimeError,
  type AnalyticsDatasetMetadata
} from '~/services/analytics/AnalyticsGateway'
import type { WorkerProgressStage } from '~/workers/analyticsProtocol'

type AnalyticsResourceStatus = 'idle' | 'generating' | 'ready' | 'error'
export type AnalyticsPreparationStage = 'preparing' | 'generating' | 'optimizing'

interface AnalyticsResourceState {
  status: AnalyticsResourceStatus
  requestedProfile: DatasetProfile
  progressStage?: AnalyticsPreparationStage
  metadata?: AnalyticsDatasetMetadata
  error?: string
}

const state = reactive<AnalyticsResourceState>({
  status: 'idle',
  requestedProfile: 'large'
})
let client: AnalyticsWorkerClient | undefined
let initializationToken = 0
let currentInitialization:
  { profile: DatasetProfile; promise: Promise<AnalyticsDatasetMetadata> } | undefined

const preparationStage: Record<WorkerProgressStage, AnalyticsPreparationStage> = {
  preparing_catalog: 'preparing',
  generating_events: 'generating',
  preparing_analytics_storage: 'optimizing'
}

function getClient(): AnalyticsWorkerClient {
  if (!client) {
    client = createBrowserAnalyticsClient()
    client.onProgress((stage) => {
      if (state.status === 'generating') state.progressStage = preparationStage[stage]
    })
  }
  return client
}

async function initializeProfile(profile: DatasetProfile): Promise<AnalyticsDatasetMetadata> {
  const token = ++initializationToken
  state.status = 'generating'
  state.requestedProfile = profile
  state.progressStage = 'preparing'
  state.error = undefined
  try {
    const metadata = await getClient().initialize(profile)
    if (token === initializationToken) {
      state.metadata = metadata
      state.status = 'ready'
      state.progressStage = undefined
    }
    return metadata
  } catch (error) {
    if (token === initializationToken) {
      state.status = 'error'
      state.error = error instanceof Error ? error.message : String(error)
      state.progressStage = undefined
    }
    throw error
  }
}

function initialize(profile: DatasetProfile): Promise<AnalyticsDatasetMetadata> {
  if (state.status === 'ready' && state.metadata?.profile === profile) {
    return Promise.resolve(state.metadata)
  }
  if (state.status === 'generating' && currentInitialization?.profile === profile) {
    return currentInitialization.promise
  }
  const promise = initializeProfile(profile)
  currentInitialization = { profile, promise }
  const clear = () => {
    if (currentInitialization?.promise === promise) currentInitialization = undefined
  }
  void promise.then(clear, clear)
  return promise
}

async function execute<Result>(operation: () => Promise<Result>): Promise<Result> {
  try {
    return await operation()
  } catch (error) {
    if (
      error instanceof AnalyticsGatewayRuntimeError ||
      error instanceof AnalyticsGatewayProtocolError
    ) {
      state.status = 'error'
      state.error = error.message
    }
    throw error
  }
}

export function useEventAnalytics() {
  return {
    catalog: eventDatasetProvider.getCatalog(),
    state: readonly(state),
    initialize,
    summary: (query: AnalyticsQuery): Promise<SummaryResult> =>
      execute(() => getClient().summary(query)),
    breakdown: (query: AnalyticsQuery): Promise<BreakdownResult> =>
      execute(() => getClient().breakdown(query)),
    timeSeries: (query: AnalyticsQuery): Promise<TimeSeriesResult> =>
      execute(() => getClient().timeSeries(query)),
    temporalHeatmap: (query: AnalyticsQuery): Promise<TemporalHeatmapResult> =>
      execute(() => getClient().temporalHeatmap(query)),
    funnel: (query: AnalyticsQuery, definition: FunnelDefinition): Promise<FunnelResult> =>
      execute(() => getClient().funnel(query, definition)),
    compareSummary: (query: AnalyticsQuery): Promise<ComparisonResult> =>
      execute(() => getClient().compareSummary(query)),
    reset: (): Promise<void> => execute(() => getClient().reset())
  }
}
