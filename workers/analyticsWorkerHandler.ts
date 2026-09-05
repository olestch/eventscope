import { generateDataset } from '~/data/generator/generateDataset'
import type { AnalyticsEngine } from '~/domain/analytics/contracts'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage, estimateAnalyticsStorageBytes } from '~/domain/analytics/storage'
import type {
  AnalyticsWorkerRequest,
  AnalyticsWorkerResponse,
  RuntimeDatasetMetadata
} from '~/workers/analyticsProtocol'

export interface AnalyticsWorkerDependencies {
  generate: typeof generateDataset
}

const defaultDependencies: AnalyticsWorkerDependencies = { generate: generateDataset }

export function createAnalyticsWorkerHandler(
  emit: (response: AnalyticsWorkerResponse) => void,
  dependencies: AnalyticsWorkerDependencies = defaultDependencies
) {
  let engine: AnalyticsEngine | undefined

  const requireEngine = () => {
    if (!engine) throw new Error('Analytics Worker is not initialized.')
    return engine
  }

  return (request: AnalyticsWorkerRequest): void => {
    try {
      if (request.type === 'initialize') {
        engine = undefined
        emit({ requestId: request.requestId, type: 'progress', stage: 'preparing_catalog' })
        emit({ requestId: request.requestId, type: 'progress', stage: 'generating_events' })
        const generationStartedAt = performance.now()
        const dataset = dependencies.generate({ profile: request.profile })
        const generationMs = performance.now() - generationStartedAt
        emit({
          requestId: request.requestId,
          type: 'progress',
          stage: 'preparing_analytics_storage'
        })
        const compilationStartedAt = performance.now()
        const storage = compileAnalyticsStorage(dataset)
        const compilationMs = performance.now() - compilationStartedAt
        engine = createRuntimeAnalyticsEngine(storage)
        const metadata: RuntimeDatasetMetadata = {
          datasetId: dataset.id,
          fingerprint: dataset.fingerprint,
          profile: dataset.profile,
          eventCount: dataset.eventCount,
          referencePeriod: dataset.referencePeriod,
          analyticalStorageBytes: estimateAnalyticsStorageBytes(storage),
          generationMs,
          compilationMs
        }
        emit({ requestId: request.requestId, type: 'initialized', metadata })
        return
      }

      if (request.type === 'reset') {
        engine = undefined
        emit({ requestId: request.requestId, type: 'reset_complete' })
        return
      }

      const analytics = requireEngine()
      if (request.type === 'execute_summary') {
        emit({
          requestId: request.requestId,
          type: 'summary_result',
          result: analytics.summary(request.query)
        })
      } else if (request.type === 'execute_breakdown') {
        emit({
          requestId: request.requestId,
          type: 'breakdown_result',
          result: analytics.breakdown(request.query)
        })
      } else if (request.type === 'execute_time_series') {
        emit({
          requestId: request.requestId,
          type: 'time_series_result',
          result: analytics.timeSeries(request.query)
        })
      } else if (request.type === 'execute_temporal_heatmap') {
        emit({
          requestId: request.requestId,
          type: 'temporal_heatmap_result',
          result: analytics.temporalHeatmap(request.query)
        })
      } else if (request.type === 'execute_funnel') {
        emit({
          requestId: request.requestId,
          type: 'funnel_result',
          result: analytics.funnel(request.query, request.definition)
        })
      } else if (request.type === 'execute_comparison') {
        emit({
          requestId: request.requestId,
          type: 'comparison_result',
          result: analytics.compareSummary(request.query)
        })
      }
    } catch (error) {
      const details = error instanceof Error ? error : new Error(String(error))
      emit({
        requestId: request.requestId,
        type: 'error',
        error: {
          name: details.name,
          message: details.message,
          ...('code' in details && typeof details.code === 'string' ? { code: details.code } : {})
        }
      })
    }
  }
}
