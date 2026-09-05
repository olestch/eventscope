import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { TimeRange } from '~/domain/shared/primitives'
import {
  buildExplorerQuery,
  parseExplorerRoute,
  serializeExplorerState,
  type ExplorerQueryState,
  type ExplorerRouteQuery
} from '~/features/explorer/queryState'

export const reportMeasures = [
  'events',
  'sessions',
  'conversions',
  'conversion_rate',
  'qr_scans'
] as const

export function buildReportAnalyticsQuery(state: ExplorerQueryState): AnalyticsQuery {
  return buildExplorerQuery(state, [...reportMeasures], { breakdown: state.breakdown })
}

export function serializeReportRouteState(state: ExplorerQueryState): Record<string, string> {
  const explorer = serializeExplorerState(state)
  const keys = [
    'profile',
    'start',
    'end',
    'campaign',
    'channel',
    'location',
    'qr',
    'device',
    'breakdown'
  ]
  return Object.fromEntries(keys.flatMap((key) => (explorer[key] ? [[key, explorer[key]!]] : [])))
}

export function parseReportRoute(
  query: ExplorerRouteQuery,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  return parseExplorerRoute(query, catalog, referencePeriod)
}

export const reportLocationForExplorerState = (state: ExplorerQueryState) => ({
  path: '/reports/new',
  query: serializeReportRouteState(state)
})
