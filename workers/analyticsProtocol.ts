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
import type { AnalyticsDatasetMetadata } from '~/services/analytics/AnalyticsGateway'

export type RuntimeDatasetMetadata = AnalyticsDatasetMetadata

export type WorkerProgressStage =
  'preparing_catalog' | 'generating_events' | 'preparing_analytics_storage'

interface WorkerRequestBase {
  requestId: number
}

export type AnalyticsWorkerRequest =
  | (WorkerRequestBase & { type: 'initialize'; profile: DatasetProfile })
  | (WorkerRequestBase & { type: 'execute_summary'; query: AnalyticsQuery })
  | (WorkerRequestBase & { type: 'execute_breakdown'; query: AnalyticsQuery })
  | (WorkerRequestBase & { type: 'execute_time_series'; query: AnalyticsQuery })
  | (WorkerRequestBase & { type: 'execute_temporal_heatmap'; query: AnalyticsQuery })
  | (WorkerRequestBase & {
      type: 'execute_funnel'
      query: AnalyticsQuery
      definition: FunnelDefinition
    })
  | (WorkerRequestBase & { type: 'execute_comparison'; query: AnalyticsQuery })
  | (WorkerRequestBase & { type: 'reset' })

export type AnalyticsWorkerResponse =
  | { requestId: number; type: 'progress'; stage: WorkerProgressStage }
  | { requestId: number; type: 'initialized'; metadata: RuntimeDatasetMetadata }
  | { requestId: number; type: 'summary_result'; result: SummaryResult }
  | { requestId: number; type: 'breakdown_result'; result: BreakdownResult }
  | { requestId: number; type: 'time_series_result'; result: TimeSeriesResult }
  | { requestId: number; type: 'temporal_heatmap_result'; result: TemporalHeatmapResult }
  | { requestId: number; type: 'funnel_result'; result: FunnelResult }
  | { requestId: number; type: 'comparison_result'; result: ComparisonResult }
  | { requestId: number; type: 'reset_complete' }
  | {
      requestId: number
      type: 'error'
      error: { name: string; message: string; code?: string }
    }
