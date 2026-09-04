import type { BreakdownResult, SummaryResult, TimeSeriesResult } from '~/domain/analytics/contracts'
import { buildExplorerQuery, type ExplorerQueryState } from '~/features/explorer/queryState'
import type { AnalyticsGateway } from '~/services/analytics/AnalyticsGateway'

export interface ExplorerResultSet {
  version: number
  state: ExplorerQueryState
  summary: SummaryResult
  timeline: TimeSeriesResult
  breakdown: BreakdownResult
}

type ExplorerGateway = Pick<AnalyticsGateway, 'summary' | 'timeSeries' | 'breakdown'>

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
    const [summary, timeline, breakdown] = await Promise.all([
      this.gateway.summary(
        buildExplorerQuery(state, ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans'])
      ),
      this.gateway.timeSeries(
        buildExplorerQuery(state, ['events', 'qr_scans'], { adaptiveTimeline: true })
      ),
      this.gateway.breakdown(
        buildExplorerQuery(state, [state.breakdownMeasure, secondaryMeasure], {
          breakdown: state.breakdown
        })
      )
    ])
    if (version !== this.currentVersion) {
      throw new StaleExplorerResultError('A newer Explorer query replaced this result.')
    }
    return {
      version,
      state: {
        ...state,
        campaignIds: [...state.campaignIds],
        channelIds: [...state.channelIds],
        locationIds: [...state.locationIds],
        devices: [...state.devices]
      },
      summary,
      timeline,
      breakdown
    }
  }
}
