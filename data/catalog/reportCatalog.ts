import type { ReportSection } from '~/domain/reports/models'

export interface ReportSectionOption {
  id: ReportSection
  title: string
  summary: string
}

// Phase 1's deterministic narrative definitions remain catalog data even though
// Phase 9 replaces their placeholder UI with real report-job orchestration.
export const reportCatalog = [
  { id: 'report-northstar-week-one', campaignId: 'cmp-northstar' },
  { id: 'report-activation-notes', campaignId: 'cmp-northstar' }
] as const

export const reportSectionOptions: ReportSectionOption[] = [
  {
    id: 'executive_summary',
    title: 'Executive summary',
    summary: 'Headline sessions, conversions, conversion rate and QR scan measures.'
  },
  {
    id: 'timeline',
    title: 'Timeline',
    summary: 'The selected scope over time using the existing analytics definitions.'
  },
  {
    id: 'breakdown',
    title: 'Breakdown',
    summary: 'A ranked view of the selected Explorer breakdown dimension.'
  },
  {
    id: 'funnel',
    title: 'Funnel',
    summary: 'The established page view to registration to conversion journey.'
  },
  {
    id: 'temporal_heatmap',
    title: 'Temporal heatmap',
    summary: 'Monday-first UTC weekday and hour activity distribution.'
  },
  {
    id: 'qr_performance',
    title: 'QR performance',
    summary: 'Scenario QR performance, either filtered or broken down across the scope.'
  }
]
