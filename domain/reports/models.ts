import type { AnalyticsQuery } from '~/domain/analytics/contracts'

export const reportFormats = ['pdf'] as const
export type ReportFormat = (typeof reportFormats)[number]

export const reportSections = [
  'executive_summary',
  'timeline',
  'breakdown',
  'funnel',
  'temporal_heatmap',
  'qr_performance'
] as const
export type ReportSection = (typeof reportSections)[number]

export const REPORT_TITLE_MAX_LENGTH = 100

export interface CreateReportRequest {
  title: string
  format: ReportFormat
  query: AnalyticsQuery
  sections: ReportSection[]
}

export type ReportJobStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface ReportJobError {
  code: 'generation_failed'
  message: string
  retryable: boolean
}

export interface ReportJob {
  id: string
  status: ReportJobStatus
  createdAt: string
  updatedAt: string
  request: CreateReportRequest
  downloadUrl?: string
  error?: ReportJobError
}

export interface ReportsGateway {
  createReport(request: CreateReportRequest): Promise<ReportJob>
  getReportStatus(id: string): Promise<ReportJob>
  listReports(): Promise<ReportJob[]>
  retryReport(id: string): Promise<ReportJob>
}
