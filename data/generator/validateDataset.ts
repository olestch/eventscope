import { conversionContextEventTypes } from '~/domain/events/models'
import type { EventDataset, EventRecord, ReferenceCatalog } from '~/domain/events/models'

export interface IntegrityIssue {
  code: string
  entityId?: string
  message: string
}

const duplicateIds = (values: Array<{ id: string }>) => {
  const seen = new Set<string>()
  return values.filter(({ id }) => (seen.has(id) ? true : (seen.add(id), false))).map(({ id }) => id)
}

function validateCatalog(catalog: ReferenceCatalog, dataset: EventDataset): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const collections = [
    ['campaign', catalog.campaigns],
    ['channel', catalog.channels],
    ['source', catalog.sources],
    ['location', catalog.locations],
    ['asset', catalog.assets],
    ['qr_code', catalog.qrCodes]
  ] as const
  for (const [kind, values] of collections) {
    for (const id of duplicateIds(values)) {
      issues.push({ code: 'duplicate_id', entityId: id, message: `Duplicate ${kind} ID: ${id}` })
    }
  }

  const channelIds = new Set(catalog.channels.map(({ id }) => id))
  const campaignIds = new Set(catalog.campaigns.map(({ id }) => id))
  const locationIds = new Set(catalog.locations.map(({ id }) => id))
  const assetIds = new Set(catalog.assets.map(({ id }) => id))

  for (const campaign of catalog.campaigns) {
    const start = Date.parse(campaign.period.start)
    const end = Date.parse(campaign.period.end)
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start > end ||
      start < Date.parse(dataset.referencePeriod.start) ||
      end > Date.parse(dataset.referencePeriod.end)
    ) {
      issues.push({
        code: 'invalid_campaign_range',
        entityId: campaign.id,
        message: 'Campaign range is malformed or outside the dataset period.'
      })
    }
    for (const id of campaign.channelIds) {
      if (!channelIds.has(id))
        issues.push({
          code: 'invalid_foreign_key',
          entityId: campaign.id,
          message: `Unknown channel ${id}`
        })
    }
    for (const id of campaign.locationIds) {
      if (!locationIds.has(id))
        issues.push({
          code: 'invalid_foreign_key',
          entityId: campaign.id,
          message: `Unknown location ${id}`
        })
    }
    for (const id of campaign.assetIds) {
      if (!assetIds.has(id))
        issues.push({
          code: 'invalid_foreign_key',
          entityId: campaign.id,
          message: `Unknown asset ${id}`
        })
    }
  }

  for (const source of catalog.sources) {
    if (!channelIds.has(source.channelId))
      issues.push({
        code: 'invalid_foreign_key',
        entityId: source.id,
        message: `Unknown channel ${source.channelId}`
      })
  }
  for (const asset of catalog.assets) {
    const campaign = catalog.campaigns.find(({ id }) => id === asset.campaignId)
    const source = catalog.sources.find(({ id }) => id === asset.sourceId)
    if (!campaign || !channelIds.has(asset.channelId) || !source) {
      issues.push({
        code: 'invalid_foreign_key',
        entityId: asset.id,
        message: 'Asset references an unknown campaign, channel, or source.'
      })
    }
    if (asset.locationId && !locationIds.has(asset.locationId))
      issues.push({
        code: 'invalid_foreign_key',
        entityId: asset.id,
        message: `Unknown location ${asset.locationId}`
      })
    if (source && source.channelId !== asset.channelId)
      issues.push({
        code: 'incompatible_source_channel',
        entityId: asset.id,
        message: 'Asset source does not belong to its channel.'
      })
    if (
      campaign &&
      (!campaign.assetIds.includes(asset.id) ||
        !campaign.channelIds.includes(asset.channelId) ||
        (asset.locationId && !campaign.locationIds.includes(asset.locationId)))
    )
      issues.push({
        code: 'incompatible_asset_association',
        entityId: asset.id,
        message: 'Asset is not registered with its campaign associations.'
      })
  }
  for (const qr of catalog.qrCodes) {
    const asset = catalog.assets.find(({ id }) => id === qr.assetId)
    const source = catalog.sources.find(({ id }) => id === qr.sourceId)
    if (!asset || !source || !campaignIds.has(qr.campaignId) || !channelIds.has(qr.channelId)) {
      issues.push({
        code: 'invalid_foreign_key',
        entityId: qr.id,
        message: 'QR definition references an unknown catalog entity.'
      })
    } else if (
      asset.campaignId !== qr.campaignId ||
      asset.channelId !== qr.channelId ||
      asset.sourceId !== qr.sourceId ||
      asset.locationId !== qr.locationId
    ) {
      issues.push({
        code: 'incompatible_qr_association',
        entityId: qr.id,
        message: 'QR and asset associations do not match.'
      })
    }
    try {
      const destination = new URL(qr.destination)
      if (destination.protocol !== 'https:') throw new Error('Only HTTPS destinations are valid')
    } catch {
      issues.push({
        code: 'malformed_destination',
        entityId: qr.id,
        message: 'QR destination must be a valid HTTPS URL.'
      })
    }
  }
  return issues
}

function validateEvent(event: EventRecord, dataset: EventDataset): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const { catalog } = dataset
  const campaign = catalog.campaigns.find(({ id }) => id === event.campaignId)
  const channel = catalog.channels.find(({ id }) => id === event.channelId)
  const source = catalog.sources.find(({ id }) => id === event.sourceId)
  const asset = event.assetId ? catalog.assets.find(({ id }) => id === event.assetId) : undefined
  const location = event.locationId
    ? catalog.locations.find(({ id }) => id === event.locationId)
    : undefined
  const timestamp = Date.parse(event.timestamp)

  if (!campaign || !channel || !source || (event.assetId && !asset) || (event.locationId && !location)) {
    issues.push({
      code: 'invalid_foreign_key',
      entityId: event.id,
      message: 'Event references an unknown catalog entity.'
    })
  }
  if (
    !Number.isFinite(timestamp) ||
    timestamp < Date.parse(dataset.referencePeriod.start) ||
    timestamp > Date.parse(dataset.referencePeriod.end)
  ) {
    issues.push({
      code: 'event_outside_dataset_range',
      entityId: event.id,
      message: 'Event timestamp is outside the dataset range.'
    })
  }
  if (
    campaign &&
    (timestamp < Date.parse(campaign.period.start) || timestamp > Date.parse(campaign.period.end))
  ) {
    issues.push({
      code: 'event_outside_campaign_range',
      entityId: event.id,
      message: 'Event timestamp is outside its campaign range.'
    })
  }
  if (source && source.channelId !== event.channelId) {
    issues.push({
      code: 'incompatible_source_channel',
      entityId: event.id,
      message: 'Event source does not belong to its channel.'
    })
  }
  if (asset && (asset.campaignId !== event.campaignId || asset.channelId !== event.channelId)) {
    issues.push({
      code: 'incompatible_asset_association',
      entityId: event.id,
      message: 'Event asset does not belong to its campaign/channel.'
    })
  }
  if (asset?.locationId !== event.locationId) {
    issues.push({
      code: 'incompatible_location_association',
      entityId: event.id,
      message: 'Event location does not match its asset.'
    })
  }
  if (event.type === 'qr_scan' && !event.qrCodeId) {
    issues.push({
      code: 'qr_scan_missing_qr_id',
      entityId: event.id,
      message: 'QR scans require a QR definition ID.'
    })
  }
  if (event.qrCodeId) {
    const qr = catalog.qrCodes.find(({ id }) => id === event.qrCodeId)
    if (!qr) {
      issues.push({
        code: 'invalid_foreign_key',
        entityId: event.id,
        message: `Unknown QR definition ${event.qrCodeId}`
      })
    } else if (
      qr.campaignId !== event.campaignId ||
      qr.channelId !== event.channelId ||
      qr.sourceId !== event.sourceId ||
      qr.assetId !== event.assetId ||
      qr.locationId !== event.locationId
    ) {
      issues.push({
        code: 'incompatible_qr_association',
        entityId: event.id,
        message: 'QR scan associations do not match the QR definition.'
      })
    }
  }
  return issues
}

export function validateDataset(dataset: EventDataset): IntegrityIssue[] {
  const issues = validateCatalog(dataset.catalog, dataset)
  const eventIds = new Set<string>()
  const sessions = new Map<
    string,
    { lastTimestamp: number; visitorId: string; hasJourneyContext: boolean }
  >()

  for (const event of dataset.events) {
    if (eventIds.has(event.id)) {
      issues.push({
        code: 'duplicate_id',
        entityId: event.id,
        message: `Duplicate event ID: ${event.id}`
      })
    }
    eventIds.add(event.id)
    issues.push(...validateEvent(event, dataset))

    const timestamp = Date.parse(event.timestamp)
    const state = sessions.get(event.sessionId)
    if (state && timestamp < state.lastTimestamp) {
      issues.push({
        code: 'invalid_session_order',
        entityId: event.id,
        message: 'Session events are not chronologically ordered.'
      })
    }
    if (state && state.visitorId !== event.visitorId) {
      issues.push({
        code: 'inconsistent_session_identity',
        entityId: event.id,
        message: 'A session references multiple visitors.'
      })
    }
    if (event.type === 'conversion' && !state?.hasJourneyContext) {
      issues.push({
        code: 'conversion_without_context',
        entityId: event.id,
        message: 'Conversion requires an earlier page view or QR scan in the session.'
      })
    }
    sessions.set(event.sessionId, {
      lastTimestamp: Math.max(timestamp, state?.lastTimestamp ?? timestamp),
      visitorId: event.visitorId,
      hasJourneyContext:
        state?.hasJourneyContext ||
        conversionContextEventTypes.includes(event.type as 'page_view' | 'qr_scan')
    })
  }

  if (dataset.eventCount !== dataset.events.length) {
    issues.push({
      code: 'event_count_mismatch',
      entityId: dataset.id,
      message: 'Dataset metadata does not match its event collection.'
    })
  }
  return issues
}
