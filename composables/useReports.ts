import { computed, getCurrentScope, onScopeDispose, readonly, ref, type Ref } from 'vue'
import type { CreateReportRequest, ReportJob, ReportsGateway } from '~/domain/reports/models'
import { reportsGateway } from '~/services/reports/reportsGateway'

const POLL_INTERVAL_MS = 450

const replaceJob = (jobs: Ref<ReportJob[]>, job: ReportJob) => {
  const remaining = jobs.value.filter(({ id }) => id !== job.id)
  jobs.value = [job, ...remaining].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
  )
}

export function useReports(gateway: ReportsGateway = reportsGateway) {
  const jobs = ref<ReportJob[]>([])
  const busy = ref(false)
  const error = ref<string>()
  const pollingTokens = new Map<string, symbol>()
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>()
  let disposed = false

  const pause = () =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        resolve()
      }, POLL_INTERVAL_MS)
      timers.set(timer, resolve)
    })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      pollingTokens.clear()
      for (const [timer, resolve] of timers) {
        clearTimeout(timer)
        resolve()
      }
      timers.clear()
    })
  }

  const poll = async (initial: ReportJob) => {
    const token = Symbol(initial.id)
    pollingTokens.set(initial.id, token)
    let current = initial
    while (
      !disposed &&
      pollingTokens.get(initial.id) === token &&
      (current.status === 'queued' || current.status === 'processing')
    ) {
      await pause()
      if (disposed || pollingTokens.get(initial.id) !== token) return
      try {
        current = await gateway.getReportStatus(initial.id)
        replaceJob(jobs, current)
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Report status could not be refreshed.'
        pollingTokens.delete(initial.id)
        return
      }
    }
    pollingTokens.delete(initial.id)
  }

  const load = async () => {
    try {
      jobs.value = await gateway.listReports()
      error.value = undefined
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Reports could not be loaded.'
    }
  }

  const create = async (request: CreateReportRequest): Promise<ReportJob | undefined> => {
    busy.value = true
    error.value = undefined
    try {
      const job = await gateway.createReport(request)
      replaceJob(jobs, job)
      void poll(job)
      return job
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'The report request was rejected.'
      return undefined
    } finally {
      busy.value = false
    }
  }

  const retry = async (id: string): Promise<ReportJob | undefined> => {
    busy.value = true
    error.value = undefined
    try {
      const job = await gateway.retryReport(id)
      replaceJob(jobs, job)
      void poll(job)
      return job
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'The report could not be retried.'
      return undefined
    } finally {
      busy.value = false
    }
  }

  const get = async (id: string) => {
    try {
      const job = await gateway.getReportStatus(id)
      replaceJob(jobs, job)
      if (job.status === 'queued' || job.status === 'processing') void poll(job)
      return job
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'The report job was not found.'
      return undefined
    }
  }

  return {
    jobs: computed<ReportJob[]>(() => jobs.value),
    busy: readonly(busy),
    error: readonly(error),
    load,
    create,
    retry,
    get
  }
}
