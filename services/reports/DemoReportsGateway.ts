import type { CreateReportRequest, ReportJob, ReportsGateway } from '~/domain/reports/models'
import { normalizeCreateReportRequest } from '~/domain/reports/validation'

export const DEMO_REPORT_DOWNLOAD_URL = '/demo/eventscope-sample-report.pdf'

export class ReportJobNotFoundError extends Error {
  constructor(id: string) {
    super(`Report job ${id} was not found in this demo session.`)
    this.name = 'ReportJobNotFoundError'
  }
}

export interface DemoReportsGatewayOptions {
  now?: () => string
  idFactory?: () => string
  initialJobs?: ReportJob[]
}

const cloneJob = (job: ReportJob): ReportJob => structuredClone(job)

export class DemoReportsGateway implements ReportsGateway {
  private readonly jobs = new Map<string, ReportJob>()
  private readonly now: () => string
  private readonly idFactory: () => string

  constructor(options: DemoReportsGatewayOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString())
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID())
    for (const job of options.initialJobs ?? []) this.jobs.set(job.id, cloneJob(job))
  }

  async createReport(request: CreateReportRequest): Promise<ReportJob> {
    const normalized = normalizeCreateReportRequest(request)
    const timestamp = this.now()
    const job: ReportJob = {
      id: this.idFactory(),
      status: 'queued',
      createdAt: timestamp,
      updatedAt: timestamp,
      request: normalized
    }
    this.jobs.set(job.id, job)
    return cloneJob(job)
  }

  async getReportStatus(id: string): Promise<ReportJob> {
    const current = this.jobs.get(id)
    if (!current) throw new ReportJobNotFoundError(id)
    let next = current
    if (current.status === 'queued') {
      next = { ...current, status: 'processing', updatedAt: this.now() }
    } else if (current.status === 'processing') {
      next = {
        ...current,
        status: 'ready',
        updatedAt: this.now(),
        downloadUrl: DEMO_REPORT_DOWNLOAD_URL
      }
    }
    this.jobs.set(id, next)
    return cloneJob(next)
  }

  async listReports(): Promise<ReportJob[]> {
    return [...this.jobs.values()]
      .sort(
        (left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
      )
      .map(cloneJob)
  }

  async retryReport(id: string): Promise<ReportJob> {
    const failed = this.jobs.get(id)
    if (!failed) throw new ReportJobNotFoundError(id)
    if (failed.status !== 'failed' || !failed.error?.retryable) {
      throw new Error('Only retryable failed report jobs can be retried.')
    }
    return this.createReport(failed.request)
  }
}
