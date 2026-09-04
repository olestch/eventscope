import type { DatasetProfile, EventDataset, EventRecord } from '~/domain/events/models'
import type { TimeRange } from '~/domain/shared/primitives'

export interface DictionaryColumn {
  readonly codes: Uint16Array
  readonly values: readonly string[]
  readonly codeByValue: ReadonlyMap<string, number>
}

export interface AnalyticsStorage {
  readonly datasetId: string
  readonly datasetFingerprint: string
  readonly profile: DatasetProfile
  readonly eventCount: number
  readonly referencePeriod: TimeRange
  readonly timestamps: Float64Array
  readonly eventTypes: DictionaryColumn
  readonly campaigns: DictionaryColumn
  readonly channels: DictionaryColumn
  readonly sources: DictionaryColumn
  readonly locations: DictionaryColumn
  readonly assets: DictionaryColumn
  readonly qrCodes: DictionaryColumn
  readonly devices: DictionaryColumn
  readonly browsers: DictionaryColumn
  readonly operatingSystems: DictionaryColumn
  readonly countries: DictionaryColumn
  readonly regions: DictionaryColumn
  readonly sessions: Uint32Array
  readonly visitors: Uint32Array
  /** Allocated only when source rows are not chronological within each session. */
  readonly funnelOrder?: Uint32Array
}

type OptionalStringKey =
  | 'type'
  | 'campaignId'
  | 'channelId'
  | 'sourceId'
  | 'locationId'
  | 'assetId'
  | 'qrCodeId'
  | 'device'
  | 'browser'
  | 'operatingSystem'
  | 'countryCode'
  | 'region'

function encodeDictionary(events: readonly EventRecord[], key: OptionalStringKey): DictionaryColumn {
  const codes = new Uint16Array(events.length)
  const values: string[] = []
  const codeByValue = new Map<string, number>()
  for (let index = 0; index < events.length; index += 1) {
    const value = events[index]![key]
    if (!value) continue
    let code = codeByValue.get(value)
    if (code === undefined) {
      code = values.length + 1
      if (code > 65_535) throw new Error(`Dictionary ${String(key)} exceeds Uint16 capacity.`)
      codeByValue.set(value, code)
      values.push(value)
    }
    codes[index] = code
  }
  return { codes, values, codeByValue }
}

function encodeIdentity(events: readonly EventRecord[], key: 'sessionId' | 'visitorId'): Uint32Array {
  const codes = new Uint32Array(events.length)
  const codeByValue = new Map<string, number>()
  for (let index = 0; index < events.length; index += 1) {
    const value = events[index]![key]
    let code = codeByValue.get(value)
    if (code === undefined) {
      code = codeByValue.size + 1
      codeByValue.set(value, code)
    }
    codes[index] = code
  }
  return codes
}

function createFunnelOrder(timestamps: Float64Array, sessions: Uint32Array): Uint32Array | undefined {
  const lastTimestampBySession = new Float64Array(
    sessions.reduce((highest, session) => Math.max(highest, session), 0) + 1
  )
  lastTimestampBySession.fill(Number.NEGATIVE_INFINITY)
  let requiresOrdering = false
  for (let index = 0; index < timestamps.length; index += 1) {
    const session = sessions[index]!
    if (timestamps[index]! < lastTimestampBySession[session]!) {
      requiresOrdering = true
      break
    }
    lastTimestampBySession[session] = timestamps[index]!
  }
  if (!requiresOrdering) return undefined

  const order = Uint32Array.from({ length: timestamps.length }, (_, index) => index)
  order.sort(
    (left, right) =>
      sessions[left]! - sessions[right]! || timestamps[left]! - timestamps[right]! || left - right
  )
  return order
}

export function compileAnalyticsStorage(dataset: EventDataset): AnalyticsStorage {
  const timestamps = new Float64Array(dataset.eventCount)
  for (let index = 0; index < dataset.events.length; index += 1) {
    timestamps[index] = Date.parse(dataset.events[index]!.timestamp)
  }
  const sessions = encodeIdentity(dataset.events, 'sessionId')

  return {
    datasetId: dataset.id,
    datasetFingerprint: dataset.fingerprint,
    profile: dataset.profile,
    eventCount: dataset.eventCount,
    referencePeriod: dataset.referencePeriod,
    timestamps,
    eventTypes: encodeDictionary(dataset.events, 'type'),
    campaigns: encodeDictionary(dataset.events, 'campaignId'),
    channels: encodeDictionary(dataset.events, 'channelId'),
    sources: encodeDictionary(dataset.events, 'sourceId'),
    locations: encodeDictionary(dataset.events, 'locationId'),
    assets: encodeDictionary(dataset.events, 'assetId'),
    qrCodes: encodeDictionary(dataset.events, 'qrCodeId'),
    devices: encodeDictionary(dataset.events, 'device'),
    browsers: encodeDictionary(dataset.events, 'browser'),
    operatingSystems: encodeDictionary(dataset.events, 'operatingSystem'),
    countries: encodeDictionary(dataset.events, 'countryCode'),
    regions: encodeDictionary(dataset.events, 'region'),
    sessions,
    visitors: encodeIdentity(dataset.events, 'visitorId'),
    funnelOrder: createFunnelOrder(timestamps, sessions)
  }
}

export function estimateAnalyticsStorageBytes(storage: AnalyticsStorage): number {
  return (
    storage.timestamps.byteLength +
    storage.eventTypes.codes.byteLength +
    storage.campaigns.codes.byteLength +
    storage.channels.codes.byteLength +
    storage.sources.codes.byteLength +
    storage.locations.codes.byteLength +
    storage.assets.codes.byteLength +
    storage.qrCodes.codes.byteLength +
    storage.devices.codes.byteLength +
    storage.browsers.codes.byteLength +
    storage.operatingSystems.codes.byteLength +
    storage.countries.codes.byteLength +
    storage.regions.codes.byteLength +
    storage.sessions.byteLength +
    storage.visitors.byteLength +
    (storage.funnelOrder?.byteLength ?? 0)
  )
}
