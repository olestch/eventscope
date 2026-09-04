import type { DatasetProfile, EventDataset, ReferenceCatalog } from '~/domain/events/models'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { generateDataset } from '~/data/generator/generateDataset'

export interface EventDatasetProvider {
  getCatalog(): ReferenceCatalog
  getDataset(profile: DatasetProfile): EventDataset
}

const datasetCache = new Map<DatasetProfile, EventDataset>()

export const eventDatasetProvider: EventDatasetProvider = {
  getCatalog() {
    return referenceCatalog
  },
  getDataset(profile) {
    const existing = datasetCache.get(profile)
    if (existing) return existing
    const dataset = generateDataset({ profile })
    datasetCache.set(profile, dataset)
    return dataset
  }
}
