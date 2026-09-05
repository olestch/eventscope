import type {
  BreakdownResult,
  ComparisonResult,
  FunnelResult,
  SummaryResult,
  TimeSeriesResult
} from '~/domain/analytics/contracts'
import { primaryConversionFunnel } from '~/features/explorer/productFunnel'
import {
  buildComparisonQuery,
  buildExplorerQuery,
  cloneExplorerState,
  type ExplorerQueryState
} from '~/features/explorer/queryState'
import type { AnalyticsGateway } from '~/services/analytics/AnalyticsGateway'

export interface ExplorerResultSet {
  version: number
  state: ExplorerQueryState
  summary: SummaryResult
  timeline: TimeSeriesResult
  breakdown: BreakdownResult
  comparison?: ComparisonResult
  funnel?: FunnelResult
}

type ExplorerGateway = Pick<
  AnalyticsGateway,
  'summary' | 'timeSeries' | 'breakdown' | 'compareSummary' | 'funnel'
>

export class StaleExplorerResultError extends Error {
  override readonly name = 'StaleExplorerResultError'
}

export class ExplorerQueryCoordinator {
  private currentVersion = 0

  constructor(private readonly gateway: ExplorerGateway) {}

  invalidate(): void {
    this.currentVersion += 1
  }

  async execute(state: ExplorerQueryState): Promise<ExplorerResultSet> {
    const version = ++this.currentVersion
    const secondaryMeasure = state.breakdownMeasure === 'sessions' ? 'conversion_rate' : 'sessions'
    const summaryMeasures = ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans'] as const
    const summaryPromise =
      state.comparison === 'previous'
        ? this.gateway
            .compareSummary(buildComparisonQuery(state, [...summaryMeasures]))
            .then((result) => ({
              summary: result.primary,
              comparison: result
            }))
        : this.gateway
            .summary(buildExplorerQuery(state, [...summaryMeasures]))
            .then((summary) => ({ summary, comparison: undefined }))
    const funnelPromise =
      state.view === 'funnel'
        ? this.gateway.funnel(
            buildExplorerQuery(state, ['sessions']),
            primaryConversionFunnel.definition
          )
        : Promise.resolve(undefined)
    const [summaryBundle, timeline, breakdown, funnel] = await Promise.all([
      summaryPromise,
      this.gateway.timeSeries(
        buildExplorerQuery(state, ['events', 'qr_scans'], { adaptiveTimeline: true })
      ),
      this.gateway.breakdown(
        buildExplorerQuery(state, [state.breakdownMeasure, secondaryMeasure], {
          breakdown: state.breakdown
        })
      ),
      funnelPromise
    ])
    if (version !== this.currentVersion) {
      throw new StaleExplorerResultError('A newer Explorer query replaced this result.')
    }
    return {
      version,
      state: cloneExplorerState(state),
      summary: summaryBundle.summary,
      timeline,
      breakdown,
      ...(summaryBundle.comparison ? { comparison: summaryBundle.comparison } : {}),
      ...(funnel ? { funnel } : {})
    }
  }
}
