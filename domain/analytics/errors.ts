export type AnalyticsErrorCode =
  | 'invalid_range'
  | 'invalid_bucket'
  | 'missing_breakdown'
  | 'unsupported_breakdown'
  | 'unsupported_measure'
  | 'malformed_funnel'
  | 'missing_comparison'

export class AnalyticsError extends Error {
  override readonly name = 'AnalyticsError'

  constructor(
    readonly code: AnalyticsErrorCode,
    message: string
  ) {
    super(message)
  }
}
