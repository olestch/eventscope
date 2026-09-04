import type { Campaign, Channel, Source } from '~/domain/campaigns/models'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { Asset, AssetKind, Location, QRCodeDefinition } from '~/domain/tracking/models'

export const channels: Channel[] = [
  { id: 'chn-physical', name: 'Physical', kind: 'physical' },
  { id: 'chn-partner', name: 'Partner', kind: 'partner' },
  { id: 'chn-social', name: 'Social', kind: 'social' },
  { id: 'chn-email', name: 'Email', kind: 'email' },
  { id: 'chn-paid', name: 'Paid media', kind: 'paid' },
  { id: 'chn-web', name: 'Web', kind: 'web' }
]

export const sources: Source[] = [
  {
    id: 'src-entrance-poster',
    name: 'Entrance poster',
    channelId: 'chn-physical',
    description: 'Venue entry signage'
  },
  {
    id: 'src-registration-desk',
    name: 'Registration desk',
    channelId: 'chn-physical',
    description: 'Check-in counter placement'
  },
  {
    id: 'src-stage-sign',
    name: 'Stage sign',
    channelId: 'chn-physical',
    description: 'Session-stage signage'
  },
  {
    id: 'src-partner-newsletter',
    name: 'Partner newsletter',
    channelId: 'chn-partner',
    description: 'Editorial partner email'
  },
  {
    id: 'src-partner-portal',
    name: 'Partner portal',
    channelId: 'chn-partner',
    description: 'Partner resource hub'
  },
  {
    id: 'src-organic-social',
    name: 'Organic social',
    channelId: 'chn-social',
    description: 'Owned social post'
  },
  {
    id: 'src-community-post',
    name: 'Community post',
    channelId: 'chn-social',
    description: 'Community amplification'
  },
  {
    id: 'src-invitation-email',
    name: 'Invitation email',
    channelId: 'chn-email',
    description: 'Campaign invitation'
  },
  {
    id: 'src-reminder-email',
    name: 'Reminder email',
    channelId: 'chn-email',
    description: 'Attendance reminder'
  },
  {
    id: 'src-paid-social',
    name: 'Paid social creative',
    channelId: 'chn-paid',
    description: 'Paid social placement'
  },
  {
    id: 'src-display-network',
    name: 'Display network',
    channelId: 'chn-paid',
    description: 'Display campaign creative'
  },
  {
    id: 'src-campaign-page',
    name: 'Campaign landing page',
    channelId: 'chn-web',
    description: 'Primary campaign page'
  },
  {
    id: 'src-resource-page',
    name: 'Resource page',
    channelId: 'chn-web',
    description: 'Post-event resources'
  },
  {
    id: 'src-registration-page',
    name: 'Registration page',
    channelId: 'chn-web',
    description: 'Registration flow entry'
  }
]

export const locations: Location[] = [
  {
    id: 'loc-harbor',
    name: 'Harbor Hall',
    kind: 'physical',
    city: 'Portland',
    region: 'Northwest',
    countryCode: 'US'
  },
  {
    id: 'loc-river',
    name: 'Riverfront Lab',
    kind: 'physical',
    city: 'Austin',
    region: 'South',
    countryCode: 'US'
  },
  {
    id: 'loc-summit',
    name: 'Summit Annex',
    kind: 'physical',
    city: 'Denver',
    region: 'Mountain',
    countryCode: 'US'
  },
  {
    id: 'loc-forge',
    name: 'Forge House',
    kind: 'physical',
    city: 'Toronto',
    region: 'Ontario',
    countryCode: 'CA'
  },
  {
    id: 'loc-canvas',
    name: 'Canvas Rooms',
    kind: 'physical',
    city: 'London',
    region: 'England',
    countryCode: 'GB'
  },
  {
    id: 'loc-licht',
    name: 'Lichtwerk',
    kind: 'physical',
    city: 'Berlin',
    region: 'Berlin',
    countryCode: 'DE'
  },
  {
    id: 'loc-grove',
    name: 'Grove Pavilion',
    kind: 'physical',
    city: 'Seattle',
    region: 'Northwest',
    countryCode: 'US'
  },
  {
    id: 'loc-union',
    name: 'Union Workshop',
    kind: 'physical',
    city: 'Chicago',
    region: 'Midwest',
    countryCode: 'US'
  },
  {
    id: 'loc-atlas',
    name: 'Atlas Loft',
    kind: 'physical',
    city: 'New York',
    region: 'Northeast',
    countryCode: 'US'
  }
]

const campaignBlueprints = [
  {
    id: 'cmp-aurora',
    name: 'Aurora Field Sessions',
    start: '2025-07-08T00:00:00.000Z',
    end: '2025-08-22T23:59:59.000Z',
    status: 'complete',
    locations: ['loc-grove', 'loc-forge']
  },
  {
    id: 'cmp-waypoint',
    name: 'Waypoint Community Tour',
    start: '2025-09-05T00:00:00.000Z',
    end: '2025-10-24T23:59:59.000Z',
    status: 'complete',
    locations: ['loc-union', 'loc-atlas']
  },
  {
    id: 'cmp-orbit',
    name: 'Orbit Partner Preview',
    start: '2026-01-12T00:00:00.000Z',
    end: '2026-02-21T23:59:59.000Z',
    status: 'complete',
    locations: ['loc-harbor', 'loc-river']
  },
  {
    id: 'cmp-northstar',
    name: 'Northstar Launch',
    start: '2026-03-04T00:00:00.000Z',
    end: '2026-03-18T23:59:59.000Z',
    status: 'active',
    locations: ['loc-harbor', 'loc-river', 'loc-summit']
  },
  {
    id: 'cmp-skyline',
    name: 'Skyline Product Forum',
    start: '2026-04-06T00:00:00.000Z',
    end: '2026-04-28T23:59:59.000Z',
    status: 'planned',
    locations: ['loc-canvas', 'loc-licht']
  },
  {
    id: 'cmp-horizon',
    name: 'Horizon Learning Series',
    start: '2026-05-04T00:00:00.000Z',
    end: '2026-06-19T23:59:59.000Z',
    status: 'planned',
    locations: ['loc-forge', 'loc-grove']
  }
] as const

interface PlacementBlueprint {
  id: string
  name: string
  campaignId: string
  channelId: string
  sourceId: string
  kind: AssetKind
  locationId?: string
}

const northstarPlacements: PlacementBlueprint[] = [
  {
    id: 'harbor-entry',
    name: 'Harbor entry card',
    campaignId: 'cmp-northstar',
    channelId: 'chn-physical',
    sourceId: 'src-entrance-poster',
    kind: 'poster',
    locationId: 'loc-harbor'
  },
  {
    id: 'river-stage',
    name: 'Riverfront stage sign',
    campaignId: 'cmp-northstar',
    channelId: 'chn-physical',
    sourceId: 'src-stage-sign',
    kind: 'stage_sign',
    locationId: 'loc-river'
  },
  {
    id: 'summit-lounge',
    name: 'Summit lounge placard',
    campaignId: 'cmp-northstar',
    channelId: 'chn-physical',
    sourceId: 'src-registration-desk',
    kind: 'kiosk',
    locationId: 'loc-summit'
  },
  {
    id: 'northstar-partner',
    name: 'Northstar partner placement',
    campaignId: 'cmp-northstar',
    channelId: 'chn-partner',
    sourceId: 'src-partner-newsletter',
    kind: 'partner_placement'
  },
  {
    id: 'northstar-paid',
    name: 'Northstar paid creative',
    campaignId: 'cmp-northstar',
    channelId: 'chn-paid',
    sourceId: 'src-paid-social',
    kind: 'landing_page'
  },
  {
    id: 'northstar-web',
    name: 'Northstar launch page',
    campaignId: 'cmp-northstar',
    channelId: 'chn-web',
    sourceId: 'src-campaign-page',
    kind: 'landing_page'
  }
]

const defaultSourceByChannel: Record<string, string> = {
  'chn-physical': 'src-entrance-poster',
  'chn-partner': 'src-partner-portal',
  'chn-social': 'src-organic-social',
  'chn-email': 'src-invitation-email',
  'chn-paid': 'src-display-network',
  'chn-web': 'src-registration-page'
}

const kindByChannel: Record<string, AssetKind> = {
  'chn-physical': 'poster',
  'chn-partner': 'partner_placement',
  'chn-social': 'landing_page',
  'chn-email': 'email_creative',
  'chn-paid': 'landing_page',
  'chn-web': 'landing_page'
}

const supportingPlacements: PlacementBlueprint[] = campaignBlueprints
  .filter(({ id }) => id !== 'cmp-northstar')
  .flatMap((campaign, campaignIndex) =>
    channels.map((channel, channelIndex) => ({
      id: `${campaign.id.replace('cmp-', '')}-${channel.kind}`,
      name: `${campaign.name} · ${channel.name}`,
      campaignId: campaign.id,
      channelId: channel.id,
      sourceId: defaultSourceByChannel[channel.id]!,
      kind: kindByChannel[channel.id]!,
      locationId:
        channel.kind === 'physical'
          ? campaign.locations[(campaignIndex + channelIndex) % campaign.locations.length]
          : undefined
    }))
  )

const placements = [...supportingPlacements, ...northstarPlacements]

export const assets: Asset[] = placements.map((placement) => ({
  id: `asset-${placement.id}`,
  name: placement.name,
  kind: placement.kind,
  campaignId: placement.campaignId,
  channelId: placement.channelId,
  sourceId: placement.sourceId,
  ...(placement.locationId ? { locationId: placement.locationId } : {})
}))

export const qrCodes: QRCodeDefinition[] = placements.map((placement, index) => ({
  id: `qr-${placement.id}`,
  name: placement.name,
  trackingKey: `es-${String(index + 1).padStart(3, '0')}-${placement.id}`,
  destination: `https://demo.eventscope.dev/${placement.campaignId.replace('cmp-', '')}/${placement.id}`,
  campaignId: placement.campaignId,
  channelId: placement.channelId,
  sourceId: placement.sourceId,
  assetId: `asset-${placement.id}`,
  ...(placement.locationId ? { locationId: placement.locationId } : {}),
  status: placement.id === 'summit-lounge' ? 'paused' : 'active'
}))

export const campaigns: Campaign[] = campaignBlueprints.map((campaign) => ({
  id: campaign.id,
  name: campaign.name,
  period: { start: campaign.start, end: campaign.end },
  status: campaign.status,
  goal: { eventType: 'conversion', label: 'Completed registration or requested follow-up' },
  channelIds: [
    ...new Set(
      assets.filter(({ campaignId }) => campaignId === campaign.id).map(({ channelId }) => channelId)
    )
  ],
  locationIds: [...campaign.locations],
  assetIds: assets.filter(({ campaignId }) => campaignId === campaign.id).map(({ id }) => id)
}))

export const referenceCatalog: ReferenceCatalog = {
  campaigns,
  channels,
  sources,
  locations,
  assets,
  qrCodes,
  countries: [
    {
      code: 'US',
      name: 'United States',
      regions: ['Northwest', 'South', 'Mountain', 'Midwest', 'Northeast']
    },
    { code: 'CA', name: 'Canada', regions: ['Ontario', 'British Columbia'] },
    { code: 'GB', name: 'United Kingdom', regions: ['England', 'Scotland'] },
    { code: 'DE', name: 'Germany', regions: ['Berlin', 'Bavaria'] }
  ],
  devices: ['mobile', 'desktop', 'tablet'],
  browsers: ['Chrome', 'Safari', 'Firefox', 'Edge'],
  operatingSystems: ['iOS', 'Android', 'Windows', 'macOS', 'Linux']
}
