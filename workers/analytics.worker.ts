import type { AnalyticsWorkerRequest, AnalyticsWorkerResponse } from '~/workers/analyticsProtocol'
import { createAnalyticsWorkerHandler } from '~/workers/analyticsWorkerHandler'

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyticsWorkerRequest>) => void) | null
  postMessage(message: AnalyticsWorkerResponse): void
}

const workerScope = self as unknown as WorkerScope
const handleRequest = createAnalyticsWorkerHandler((response) => workerScope.postMessage(response))
workerScope.onmessage = ({ data }) => handleRequest(data)
