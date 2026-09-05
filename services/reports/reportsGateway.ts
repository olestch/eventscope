import type { ReportJob } from '~/domain/reports/models'
import { DemoReportsGateway } from '~/services/reports/DemoReportsGateway'

const failedAt = new Date().toISOString()

const failedDemoJob: ReportJob = {
  id: 'demo-failed-report',
  status: 'failed',
  createdAt: failedAt,
  updatedAt: failedAt,
  request: {
    title: 'Field operations exception demo',
    format: 'pdf',
    query: {
      range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
      campaignIds: ['cmp-northstar'],
      measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
    },
    sections: ['executive_summary', 'timeline']
  },
  error: {
    code: 'generation_failed',
    message: 'Controlled demo failure: the renderer fixture rejected this job.',
    retryable: true
  }
}

export const reportsGateway = new DemoReportsGateway({ initialJobs: [failedDemoJob] })
