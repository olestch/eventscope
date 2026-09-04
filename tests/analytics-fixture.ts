import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import type { EventDataset, EventRecord } from '~/domain/events/models'

const baseEvent: EventRecord = {
  id: 'event-base',
  timestamp: '2026-01-01T00:00:00.000Z',
  type: 'page_view',
  campaignId: 'cmp-northstar',
  channelId: 'chn-physical',
  sourceId: 'src-entrance-poster',
  assetId: 'asset-harbor-entry',
  locationId: 'loc-harbor',
  sessionId: 'session-1',
  visitorId: 'visitor-1',
  device: 'mobile',
  browser: 'Safari',
  operatingSystem: 'iOS',
  countryCode: 'US',
  region: 'Northwest'
}

const event = (overrides: Partial<EventRecord>): EventRecord => ({ ...baseEvent, ...overrides })

export const analyticsFixtureEvents: EventRecord[] = [
  event({ id: 'event-1', type: 'page_view' }),
  event({
    id: 'event-2',
    timestamp: '2026-01-01T00:05:00.000Z',
    type: 'qr_scan',
    qrCodeId: 'qr-harbor-entry'
  }),
  event({ id: 'event-3', timestamp: '2026-01-01T00:10:00.000Z', type: 'conversion' }),
  event({ id: 'event-4', timestamp: '2026-01-01T00:12:00.000Z', type: 'conversion' }),
  event({
    id: 'event-5',
    timestamp: '2026-01-01T01:00:00.000Z',
    sessionId: 'session-2',
    visitorId: 'visitor-1',
    device: 'desktop',
    browser: 'Chrome',
    operatingSystem: 'Windows',
    region: 'South',
    locationId: 'loc-river',
    assetId: 'asset-river-stage',
    sourceId: 'src-stage-sign'
  }),
  event({
    id: 'event-6',
    timestamp: '2026-01-01T01:05:00.000Z',
    type: 'qr_scan',
    sessionId: 'session-2',
    visitorId: 'visitor-1',
    device: 'desktop',
    browser: 'Chrome',
    operatingSystem: 'Windows',
    region: 'South',
    locationId: 'loc-river',
    assetId: 'asset-river-stage',
    channelId: 'chn-physical',
    sourceId: 'src-stage-sign',
    qrCodeId: 'qr-river-stage'
  }),
  event({
    id: 'event-7',
    timestamp: '2026-01-02T00:00:00.000Z',
    campaignId: 'cmp-orbit',
    channelId: 'chn-partner',
    sourceId: 'src-partner-newsletter',
    assetId: 'asset-orbit-partner',
    sessionId: 'session-3',
    visitorId: 'visitor-2',
    device: 'desktop',
    browser: 'Firefox',
    operatingSystem: 'Linux',
    countryCode: 'DE',
    region: 'Berlin'
  }),
  event({
    id: 'event-8',
    timestamp: '2026-01-02T00:01:00.000Z',
    type: 'download',
    campaignId: 'cmp-orbit',
    channelId: 'chn-partner',
    sourceId: 'src-partner-newsletter',
    assetId: 'asset-orbit-partner',
    sessionId: 'session-3',
    visitorId: 'visitor-2',
    device: 'desktop',
    browser: 'Firefox',
    operatingSystem: 'Linux',
    countryCode: 'DE',
    region: 'Berlin'
  }),
  event({
    id: 'event-9',
    timestamp: '2026-01-02T00:02:00.000Z',
    type: 'conversion',
    campaignId: 'cmp-orbit',
    channelId: 'chn-partner',
    sourceId: 'src-partner-newsletter',
    assetId: 'asset-orbit-partner',
    sessionId: 'session-3',
    visitorId: 'visitor-2',
    device: 'desktop',
    browser: 'Firefox',
    operatingSystem: 'Linux',
    countryCode: 'DE',
    region: 'Berlin'
  }),
  event({
    id: 'event-10',
    timestamp: '2026-01-03T00:00:00.000Z',
    sessionId: 'session-4',
    visitorId: 'visitor-3'
  })
]

export const createAnalyticsFixture = (
  events: EventRecord[] = analyticsFixtureEvents
): EventDataset => ({
  id: 'analytics-fixture',
  generatorVersion: 'fixture-v1',
  scenarioVersion: 'fixture-v1',
  seed: 'fixture',
  profile: 'test',
  eventCount: events.length,
  referencePeriod: {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-03-01T00:00:00.000Z'
  },
  catalog: referenceCatalog,
  events,
  fingerprint: 'fixture-fingerprint'
})

export const fixtureRange = {
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-03T00:00:00.000Z'
}
