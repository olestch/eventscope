import type { DatasetProfile, EventDataset } from '~/domain/events/models'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { fingerprintDataset } from '~/data/generator/fingerprint'
import { generateEventRecords } from '~/data/generator/journeys'
import { createRandomStream } from '~/data/generator/prng'
import { generateSessionBlueprints } from '~/data/generator/sessions'
import { validateDataset } from '~/data/generator/validateDataset'
import { northstarScenarioV1, type ScenarioDefinition } from '~/data/scenarios/northstarV1'

export const GENERATOR_VERSION = 'event-generator-v1'
export const datasetProfiles: Record<DatasetProfile, { eventCount: number }> = {
  test: { eventCount: 320 },
  development: { eventCount: 10_000 }
}

export interface GenerateDatasetOptions {
  profile: DatasetProfile
  seed?: string
  scenario?: ScenarioDefinition
}

export function generateDataset(options: GenerateDatasetOptions): EventDataset {
  const scenario = options.scenario ?? northstarScenarioV1
  const seed = options.seed ?? scenario.defaultSeed
  const targetEventCount = datasetProfiles[options.profile].eventCount
  const streams = {
    traffic: createRandomStream(seed, 'traffic'),
    sessions: createRandomStream(seed, 'sessions'),
    dimensions: createRandomStream(seed, 'dimensions'),
    conversion: createRandomStream(seed, 'conversion')
  }
  const sessions = generateSessionBlueprints(targetEventCount, referenceCatalog, scenario, streams)
  const events = generateEventRecords(sessions, targetEventCount, scenario, streams.conversion)
  const identity = {
    generatorVersion: GENERATOR_VERSION,
    scenarioVersion: scenario.scenarioVersion,
    seed,
    profile: options.profile,
    referencePeriod: scenario.referencePeriod,
    events
  }
  const fingerprint = fingerprintDataset(identity)
  const dataset: EventDataset = {
    id: `events-${options.profile}-${fingerprint}`,
    ...identity,
    eventCount: events.length,
    catalog: referenceCatalog,
    fingerprint
  }
  const issues = validateDataset(dataset)
  if (issues.length) {
    const summary = issues.slice(0, 5).map(({ code, entityId }) => `${code}:${entityId ?? 'dataset'}`)
    throw new Error(`Generated dataset failed integrity validation: ${summary.join(', ')}`)
  }
  return dataset
}
