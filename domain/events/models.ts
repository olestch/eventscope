import type { TimeRange, UTCDateTime } from '~/domain/shared/primitives'

export const eventTypes = [
  'page_view',
  'qr_scan',
  'registration',
  'check_in',
  'download',
  'conversion',
  'share'
] as const

export type EventType = (typeof eventTypes)[number]
export const conversionContextEventTypes = ['page_view', 'qr_scan'] as const

/**
 * A conversion is a `conversion` event, never a boolean copied onto other facts.
 * Future conversion rate uses distinct sessions with a page view or QR scan in
 * the selected query as its denominator. QR downstream conversion follows a
 * session from its QR scan to a later conversion event with the same session ID.
 */
export const conversionSemantics = {
  eventType: 'conversion',
  denominator: 'context_sessions',
  qrAttribution: 'same_session_after_scan'
} as const

export type DeviceType = 'mobile' | 'desktop' | 'tablet'
export type BrowserName = 'Chrome' | 'Safari' | 'Firefox' | 'Edge'
export type OperatingSystem = 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux'

/**
 * An immutable source fact. Sessions and visitors are reconstructable from IDs,
 * so Phase 2 does not duplicate them as separately persisted entity collections.
 */
export interface EventRecord {
  readonly id: string
  readonly timestamp: UTCDateTime
  readonly type: EventType
  readonly campaignId: string
  readonly channelId: string
  readonly sourceId: string
  readonly assetId?: string
  readonly locationId?: string
  readonly qrCodeId?: string
  readonly sessionId: string
  readonly visitorId: string
  readonly device: DeviceType
  readonly browser: BrowserName
  readonly operatingSystem: OperatingSystem
  readonly countryCode: string
  readonly region: string
}

export type DatasetProfile = 'test' | 'development'

export interface ReferenceCatalog {
  campaigns: import('~/domain/campaigns/models').Campaign[]
  channels: import('~/domain/campaigns/models').Channel[]
  sources: import('~/domain/campaigns/models').Source[]
  locations: import('~/domain/tracking/models').Location[]
  assets: import('~/domain/tracking/models').Asset[]
  qrCodes: import('~/domain/tracking/models').QRCodeDefinition[]
  countries: Array<{ code: string; name: string; regions: string[] }>
  devices: DeviceType[]
  browsers: BrowserName[]
  operatingSystems: OperatingSystem[]
}

export interface EventDataset {
  id: string
  generatorVersion: string
  scenarioVersion: string
  seed: string
  profile: DatasetProfile
  eventCount: number
  referencePeriod: TimeRange
  catalog: ReferenceCatalog
  events: EventRecord[]
  fingerprint: string
}
