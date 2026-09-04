import type { EventDataset, EventRecord } from '~/domain/events/models'

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
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
  return `es2-${hashText(`${header}\n${dataset.events.map(serializeEvent).join('\n')}`)}`
}
