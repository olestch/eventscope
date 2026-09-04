import type { EventType } from '~/domain/events/models'
import type { TimeRange } from '~/domain/shared/primitives'

export type BreakdownDimension =
  'campaign' | 'channel' | 'source' | 'location' | 'qr_code' | 'device' | 'browser'

export type Measure = 'events' | 'sessions' | 'visitors' | 'conversions'

export interface AnalyticsQuery {
  range: TimeRange
  eventTypes?: EventType[]
  campaignIds?: string[]
  channelIds?: string[]
  locationIds?: string[]
  qrCodeIds?: string[]
  devices?: string[]
  browsers?: string[]
  breakdown?: BreakdownDimension
  measures: Measure[]
  comparison?: { kind: 'previous_period' } | { kind: 'custom'; range: TimeRange }
}

export interface SummaryResult {
  kind: 'summary'
  values: Partial<Record<Measure, number>>
}

export interface TimeSeriesPoint {
  timestamp: string
  values: Partial<Record<Measure, number>>
}

export interface TimeSeriesResult {
  kind: 'time_series'
  points: TimeSeriesPoint[]
}

export interface BreakdownResult {
  kind: 'breakdown'
  dimension: BreakdownDimension
  rows: Array<{ key: string; values: Partial<Record<Measure, number>> }>
}

export interface FunnelResult {
  kind: 'funnel'
  steps: Array<{ eventType: EventType; sessions: number }>
}

export type AnalyticsResult = SummaryResult | TimeSeriesResult | BreakdownResult | FunnelResult
