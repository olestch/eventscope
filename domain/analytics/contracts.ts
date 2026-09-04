import type { BrowserName, DeviceType, EventType, OperatingSystem } from '~/domain/events/models'
import type { TimeRange } from '~/domain/shared/primitives'

export const breakdownDimensions = [
  'campaign',
  'channel',
  'source',
  'location',
  'asset',
  'qr_code',
  'device',
  'browser',
  'operating_system',
  'country',
  'region'
] as const

export type BreakdownDimension = (typeof breakdownDimensions)[number]

export const measures = [
  'events',
  'sessions',
  'visitors',
  'conversions',
  'conversion_rate',
  'qr_scans'
] as const

export type Measure = (typeof measures)[number]
export type MeasureValues = Partial<Record<Measure, number>>

export const bucketSizes = ['5m', '15m', '1h', '6h', '1d', '1w', '1mo'] as const
export type BucketSize = (typeof bucketSizes)[number]
export type BucketRequest = { kind: 'fixed'; size: BucketSize } | { kind: 'adaptive'; maxPoints: number }

export type ComparisonDefinition = { kind: 'previous_period' } | { kind: 'custom'; range: TimeRange }

export interface AnalyticsQuery {
  /** All engine ranges use UTC half-open semantics: [start, end). */
  range: TimeRange
  eventTypes?: EventType[]
  campaignIds?: string[]
  channelIds?: string[]
  sourceIds?: string[]
  locationIds?: string[]
  assetIds?: string[]
  qrCodeIds?: string[]
  devices?: DeviceType[]
  browsers?: BrowserName[]
  operatingSystems?: OperatingSystem[]
  countryCodes?: string[]
  regions?: string[]
  breakdown?: BreakdownDimension
  measures: Measure[]
  bucket?: BucketRequest
  comparison?: ComparisonDefinition
}

export type EmptyResultReason = 'no_matching_events' | 'no_eligible_sessions'

export interface ResultMetadata {
  datasetId: string
  datasetFingerprint: string
  query: AnalyticsQuery
  matchedEventCount: number
  matchedSessionCount: number
  emptyReason?: EmptyResultReason
}

export interface SummaryResult {
  kind: 'summary'
  values: MeasureValues
  metadata: ResultMetadata
}

export interface TimeSeriesPoint {
  timestamp: string
  range: TimeRange
  values: MeasureValues
}

export interface TimeSeriesResult {
  kind: 'time_series'
  bucket: BucketSize
  points: TimeSeriesPoint[]
  metadata: ResultMetadata & { bucket: BucketSize }
}

export interface BreakdownResult {
  kind: 'breakdown'
  dimension: BreakdownDimension
  rows: Array<{ key: string; values: MeasureValues }>
  metadata: ResultMetadata
}

export interface FunnelDefinition {
  /** Step ordering is semantically meaningful and is never normalized. */
  steps: EventType[]
}

export interface FunnelStepResult {
  eventType: EventType
  sessions: number
  percentageFromFirst: number
  dropOffFromPrevious: number | null
}

export interface FunnelResult {
  kind: 'funnel'
  steps: FunnelStepResult[]
  metadata: ResultMetadata
}

export interface MeasureDelta {
  absolute: number
  percentage: number | null
}

export interface ComparisonResult {
  kind: 'comparison'
  primary: SummaryResult
  comparison: SummaryResult
  deltas: Partial<Record<Measure, MeasureDelta>>
  comparisonDefinition: { kind: ComparisonDefinition['kind']; range: TimeRange }
}

export type AnalyticsResult =
  SummaryResult | TimeSeriesResult | BreakdownResult | FunnelResult | ComparisonResult

export interface AnalyticsEngine {
  summary(query: AnalyticsQuery): SummaryResult
  breakdown(query: AnalyticsQuery): BreakdownResult
  timeSeries(query: AnalyticsQuery): TimeSeriesResult
  funnel(query: AnalyticsQuery, definition: FunnelDefinition): FunnelResult
  compareSummary(query: AnalyticsQuery): ComparisonResult
}
