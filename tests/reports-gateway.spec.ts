import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CreateReportRequest, ReportJob } from '~/domain/reports/models'
import { normalizeCreateReportRequest } from '~/domain/reports/validation'
import {
  DEMO_REPORT_DOWNLOAD_URL,
  DemoReportsGateway,
  ReportJobNotFoundError
} from '~/services/reports/DemoReportsGateway'

const request: CreateReportRequest = {
  title: 'Northstar report',
  format: 'pdf',
  query: {
    range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
    qrCodeIds: ['qr-harbor-entry'],
    measures: ['sessions', 'qr_scans']
  },
  sections: ['executive_summary', 'qr_performance']
}

const sequence = <T>(values: T[]) => {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]!
}

describe('DemoReportsGateway', () => {
  it('advances deterministically from queued to processing to ready', async () => {
    const gateway = new DemoReportsGateway({
      idFactory: () => 'job-1',
      now: sequence(['2026-09-05T10:00:00.000Z', '2026-09-05T10:00:01.000Z', '2026-09-05T10:00:02.000Z'])
    })
    const queued = await gateway.createReport(request)
    expect(queued).toMatchObject({ id: 'job-1', status: 'queued' })
    expect(queued.request).toEqual(normalizeCreateReportRequest(request))
    expect(queued.downloadUrl).toBeUndefined()

    const processing = await gateway.getReportStatus(queued.id)
    expect(processing.status).toBe('processing')
    expect(processing.downloadUrl).toBeUndefined()

    const ready = await gateway.getReportStatus(queued.id)
    expect(ready).toMatchObject({ status: 'ready', downloadUrl: DEMO_REPORT_DOWNLOAD_URL })
    expect(await gateway.getReportStatus(queued.id)).toEqual(ready)
    expect(await gateway.listReports()).toEqual([ready])
  })

  it('reports unknown jobs explicitly', async () => {
    const gateway = new DemoReportsGateway()
    await expect(gateway.getReportStatus('missing')).rejects.toBeInstanceOf(ReportJobNotFoundError)
    await expect(gateway.retryReport('missing')).rejects.toBeInstanceOf(ReportJobNotFoundError)
  })

  it('points ready jobs at one small, real static PDF fixture', () => {
    const path = resolve('public/demo/eventscope-sample-report.pdf')
    expect(readFileSync(path).subarray(0, 5).toString()).toBe('%PDF-')
    expect(statSync(path).size).toBeLessThan(10_000)
  })

  it('retries a controlled failed fixture as a new queued attempt', async () => {
    const failed: ReportJob = {
      id: 'failed-1',
      status: 'failed',
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
      request,
      error: { code: 'generation_failed', message: 'Controlled failure.', retryable: true }
    }
    const gateway = new DemoReportsGateway({
      initialJobs: [failed],
      idFactory: () => 'retry-1',
      now: () => '2026-09-05T10:01:00.000Z'
    })
    const retry = await gateway.retryReport(failed.id)
    expect(retry).toMatchObject({ id: 'retry-1', status: 'queued' })
    expect(retry.request).toEqual(normalizeCreateReportRequest(request))
    expect((await gateway.listReports()).map(({ id }) => id)).toEqual(['retry-1', 'failed-1'])
  })
})
