import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { ReportJobStatus, ReportSection } from '~/domain/reports/models'
import { reportSectionOptions } from '~/data/catalog/reportCatalog'
import { formatDate } from '~/features/explorer/presentation'
import type { ExplorerQueryState } from '~/features/explorer/queryState'

export interface ReportScopeItem {
  label: string
  value: string
}

const names = (ids: string[] | undefined, lookup: Array<{ id: string; name: string }>) =>
  ids?.map((id) => lookup.find((item) => item.id === id)?.name ?? id).join(', ')

export function defaultReportTitle(state: ExplorerQueryState, catalog: ReferenceCatalog): string {
  if (state.qrCodeIds.length === 1) {
    const qr = catalog.qrCodes.find(({ id }) => id === state.qrCodeIds[0])
    if (qr) return `${qr.name} performance report`
  }
  if (state.campaignIds.length === 1) {
    const campaign = catalog.campaigns.find(({ id }) => id === state.campaignIds[0])
    if (campaign) return `${campaign.name} performance report`
  }
  return 'EventScope analytics report'
}

export function buildReportScope(query: AnalyticsQuery, catalog: ReferenceCatalog): ReportScopeItem[] {
  const items: ReportScopeItem[] = [
    {
      label: 'Date range',
      value: `${formatDate(query.range.start)} – ${formatDate(
        new Date(Date.parse(query.range.end) - 1).toISOString()
      )}`
    }
  ]
  const dimensions: Array<[string, string | undefined]> = [
    ['Campaign', names(query.campaignIds, catalog.campaigns)],
    ['Channel', names(query.channelIds, catalog.channels)],
    ['Location', names(query.locationIds, catalog.locations)],
    ['Scenario QR', names(query.qrCodeIds, catalog.qrCodes)],
    [
      'Device',
      query.devices?.map((device) => `${device[0]!.toUpperCase()}${device.slice(1)}`).join(', ')
    ]
  ]
  for (const [label, value] of dimensions) if (value) items.push({ label, value })
  return items
}

export const reportSectionLabel = (section: ReportSection): string =>
  reportSectionOptions.find(({ id }) => id === section)?.title ?? section

export const reportStatusCopy: Record<ReportJobStatus, string> = {
  queued: 'Report queued.',
  processing: 'Generating report.',
  ready: 'Report ready.',
  failed: 'Report generation failed.'
}
