import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { ReportJobStatus, ReportSection } from '~/domain/reports/models'
import { reportSectionOptions } from '~/data/catalog/reportCatalog'
import {
  formatDate,
  type PresentationLocale,
  type PresentationTranslate
} from '~/features/explorer/presentation'
import type { ExplorerQueryState } from '~/features/explorer/queryState'
import { REPORT_TITLE_MAX_LENGTH } from '~/domain/reports/models'

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

export function buildReportScope(
  query: AnalyticsQuery,
  catalog: ReferenceCatalog,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): ReportScopeItem[] {
  const label = (key: string, fallback: string) => (t ? t(key) : fallback)
  const items: ReportScopeItem[] = [
    {
      label: label('reports.scope.date', 'Date range'),
      value: `${formatDate(query.range.start, locale)} – ${formatDate(
        new Date(Date.parse(query.range.end) - 1).toISOString(),
        locale
      )}`
    }
  ]
  const dimensions: Array<[string, string | undefined]> = [
    [label('reports.scope.campaign', 'Campaign'), names(query.campaignIds, catalog.campaigns)],
    [label('reports.scope.channel', 'Channel'), names(query.channelIds, catalog.channels)],
    [label('reports.scope.location', 'Location'), names(query.locationIds, catalog.locations)],
    [label('reports.scope.qr', 'Scenario QR'), names(query.qrCodeIds, catalog.qrCodes)],
    [
      label('reports.scope.device', 'Device'),
      query.devices
        ?.map((device) =>
          t ? t(`explorer.devices.${device}`) : `${device[0]!.toUpperCase()}${device.slice(1)}`
        )
        .join(', ')
    ]
  ]
  for (const [label, value] of dimensions) if (value) items.push({ label, value })
  return items
}

export const reportSectionLabel = (section: ReportSection, t?: PresentationTranslate): string =>
  t
    ? t(`reports.sections.${section}`)
    : (reportSectionOptions.find(({ id }) => id === section)?.title ?? section)

export const reportStatusCopy: Record<ReportJobStatus, string> = {
  queued: 'Report queued.',
  processing: 'Generating report.',
  ready: 'Report ready.',
  failed: 'Report generation failed.'
}

export function translateReportIssues(issues: string[], t: PresentationTranslate): string[] {
  return issues.map((issue) => {
    if (issue === 'Report title is required.') return t('reports.validation.titleRequired')
    if (issue.startsWith('Report title must be'))
      return t('reports.validation.titleLong', { count: REPORT_TITLE_MAX_LENGTH })
    if (issue === 'Only PDF reports are supported.') return t('reports.validation.pdfOnly')
    if (issue === 'Select at least one report section.') return t('reports.validation.sectionRequired')
    if (issue === 'The report contains an unsupported section.')
      return t('reports.validation.sectionUnsupported')
    if (issue === 'The analytics scope is invalid.') return t('reports.validation.scopeInvalid')
    return issue
  })
}
