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
import type { TimeRange } from '~/domain/shared/primitives'

export interface AnalyticsDatasetMetadata {
  datasetId: string
  fingerprint: string
  profile: DatasetProfile
  eventCount: number
  referencePeriod: TimeRange
  analyticalStorageBytes: number
  generationMs: number
  compilationMs: number
}

/** Stable UI-facing boundary; the current demo implementation happens to use a Worker. */
export interface AnalyticsGateway {
  initialize(profile: DatasetProfile): Promise<AnalyticsDatasetMetadata>
  summary(query: AnalyticsQuery): Promise<SummaryResult>
  breakdown(query: AnalyticsQuery): Promise<BreakdownResult>
  timeSeries(query: AnalyticsQuery): Promise<TimeSeriesResult>
  temporalHeatmap(query: AnalyticsQuery): Promise<TemporalHeatmapResult>
  funnel(query: AnalyticsQuery, definition: FunnelDefinition): Promise<FunnelResult>
  compareSummary(query: AnalyticsQuery): Promise<ComparisonResult>
  reset(): Promise<void>
}

export class SupersededAnalyticsRequestError extends Error {
  override readonly name = 'SupersededAnalyticsRequestError'
}

export class AnalyticsGatewayProtocolError extends Error {
  override readonly name = 'AnalyticsGatewayProtocolError'
}

export class AnalyticsGatewayRuntimeError extends Error {
  override readonly name = 'AnalyticsGatewayRuntimeError'
}
