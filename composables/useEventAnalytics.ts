import type { DatasetProfile } from '~/domain/events/models'
import type { AnalyticsEngine } from '~/domain/analytics/contracts'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'

const engineCache = new Map<DatasetProfile, AnalyticsEngine>()

export function useEventAnalytics(profile: DatasetProfile = 'development') {
  const dataset = eventDatasetProvider.getDataset(profile)
  const existing = engineCache.get(profile)
  const analytics = existing ?? createAnalyticsEngine(dataset)
  if (!existing) engineCache.set(profile, analytics)
  return { dataset, catalog: dataset.catalog, analytics }
}
