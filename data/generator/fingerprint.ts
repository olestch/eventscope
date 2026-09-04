import type { EventDataset, EventRecord } from '~/domain/events/models'

function updateHash(hash: number, value: string): number {
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash
}

const serializeEvent = (event: EventRecord) =>
  [
    event.id,
    event.timestamp,
    event.type,
    event.campaignId,
    event.channelId,
    event.sourceId,
    event.assetId ?? '',
    event.locationId ?? '',
    event.qrCodeId ?? '',
    event.sessionId,
    event.visitorId,
    event.device,
    event.browser,
    event.operatingSystem,
    event.countryCode,
    event.region
  ].join('|')

export function fingerprintDataset(
  dataset: Pick<
    EventDataset,
    'generatorVersion' | 'scenarioVersion' | 'seed' | 'profile' | 'referencePeriod' | 'events'
  >
): string {
  const header = [
    dataset.generatorVersion,
    dataset.scenarioVersion,
    dataset.seed,
    dataset.profile,
    dataset.referencePeriod.start,
    dataset.referencePeriod.end
  ].join('|')
  let hash = updateHash(2166136261, header)
  hash = updateHash(hash, '\n')
  for (let index = 0; index < dataset.events.length; index += 1) {
    if (index) hash = updateHash(hash, '\n')
    hash = updateHash(hash, serializeEvent(dataset.events[index]!))
  }
  return `es2-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
