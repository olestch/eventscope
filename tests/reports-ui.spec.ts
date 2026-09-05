import { mount, RouterLinkStub } from '@vue/test-utils'
import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import ReportPreview from '~/components/reports/ReportPreview.vue'
import { useReports } from '~/composables/useReports'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import type { CreateReportRequest, ReportJob } from '~/domain/reports/models'
import { DEMO_REPORT_DOWNLOAD_URL, DemoReportsGateway } from '~/services/reports/DemoReportsGateway'

const request: CreateReportRequest = {
  title: 'Harbor entry card performance report',
  format: 'pdf',
  query: {
    range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
    campaignIds: ['cmp-northstar'],
    qrCodeIds: ['qr-harbor-entry'],
    measures: ['sessions', 'qr_scans']
  },
  sections: ['executive_summary', 'qr_performance']
}

const job = (status: ReportJob['status']): ReportJob => ({
  id: `job-${status}`,
  status,
  createdAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:00.000Z',
  request,
  ...(status === 'ready' ? { downloadUrl: DEMO_REPORT_DOWNLOAD_URL } : {}),
  ...(status === 'failed'
    ? {
        error: { code: 'generation_failed' as const, message: 'Controlled failure.', retryable: true }
      }
    : {})
})

afterEach(() => vi.useRealTimers())

describe('Reports UI workflow', () => {
  it('renders a structural, human-readable preview without fake metrics or charts', () => {
    const wrapper = mount(ReportPreview, {
      props: {
        title: request.title,
        query: request.query,
        sections: request.sections,
        catalog: referenceCatalog
      }
    })
    expect(wrapper.text()).toContain('Harbor entry card')
    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Executive summary')
    expect(wrapper.text()).toContain('not a rendered PDF preview')
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it.each(['queued', 'processing'] as const)('does not offer download while %s', (status) => {
    const wrapper = mount(ReportJobCard, {
      props: { job: job(status), catalog: referenceCatalog },
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    expect(wrapper.text()).toContain(status === 'queued' ? 'Report queued.' : 'Generating report.')
    expect(wrapper.find('a[download]').exists()).toBe(false)
  })

  it('offers the real static PDF only when ready', () => {
    const wrapper = mount(ReportJobCard, {
      props: { job: job('ready'), catalog: referenceCatalog },
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    expect(wrapper.get('a[download]').attributes('href')).toBe(DEMO_REPORT_DOWNLOAD_URL)
  })

  it('announces a controlled failure and emits an explicit retry', async () => {
    const wrapper = mount(ReportJobCard, {
      props: { job: job('failed'), catalog: referenceCatalog },
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    expect(wrapper.get('[role="alert"]').text()).toContain('Controlled failure')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toEqual([['job-failed']])
  })

  it('polls one job through queued, processing and ready', async () => {
    vi.useFakeTimers()
    const gateway = new DemoReportsGateway({ idFactory: () => 'job-1' })
    const reports = useReports(gateway)
    await reports.create(request)
    expect(reports.jobs.value[0]?.status).toBe('queued')
    await vi.advanceTimersByTimeAsync(450)
    expect(reports.jobs.value[0]?.status).toBe('processing')
    await vi.advanceTimersByTimeAsync(450)
    expect(reports.jobs.value[0]).toMatchObject({
      status: 'ready',
      downloadUrl: DEMO_REPORT_DOWNLOAD_URL
    })
  })

  it('keeps concurrent status updates keyed by job ID', async () => {
    vi.useFakeTimers()
    const ids = ['job-older', 'job-newer']
    const gateway = new DemoReportsGateway({ idFactory: () => ids.shift()! })
    const reports = useReports(gateway)
    await reports.create({ ...request, title: 'Older report' })
    await reports.create({ ...request, title: 'Newer report' })
    await vi.advanceTimersByTimeAsync(900)
    expect(reports.jobs.value).toHaveLength(2)
    expect(reports.jobs.value.map(({ id, status, request: item }) => [id, status, item.title])).toEqual(
      expect.arrayContaining([
        ['job-older', 'ready', 'Older report'],
        ['job-newer', 'ready', 'Newer report']
      ])
    )
  })

  it('cancels pending status polling when its Vue scope is disposed', async () => {
    vi.useFakeTimers()
    const getReportStatus = vi.fn()
    const gateway = new DemoReportsGateway({ idFactory: () => 'job-disposed' })
    const originalStatus = gateway.getReportStatus.bind(gateway)
    gateway.getReportStatus = async (id) => {
      getReportStatus(id)
      return originalStatus(id)
    }
    const scope = effectScope()
    const reports = scope.run(() => useReports(gateway))!
    await reports.create(request)
    scope.stop()
    await vi.runAllTimersAsync()
    expect(getReportStatus).not.toHaveBeenCalled()
    expect(reports.jobs.value[0]?.status).toBe('queued')
  })
})
