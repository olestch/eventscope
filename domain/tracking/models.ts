import type { NamedEntity } from '~/domain/shared/primitives'

export interface Location extends NamedEntity {
  kind: 'physical' | 'logical'
  city: string
  region: string
  countryCode: string
}

export type AssetKind =
  'poster' | 'landing_page' | 'email_creative' | 'stage_sign' | 'kiosk' | 'partner_placement'

export interface Asset extends NamedEntity {
  kind: AssetKind
  campaignId: string
  channelId: string
  sourceId: string
  locationId?: string
}

export interface QRCodeDefinition extends NamedEntity {
  trackingKey: string
  destination: string
  campaignId: string
  channelId: string
  sourceId: string
  assetId: string
  locationId?: string
  status: 'active' | 'paused' | 'draft'
}
