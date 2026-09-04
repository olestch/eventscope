import type { NamedEntity, TimeRange } from '~/domain/shared/primitives'

export type CampaignStatus = 'planned' | 'active' | 'complete'

export interface Campaign extends NamedEntity {
  period: TimeRange
  status: CampaignStatus
  goal: {
    eventType: 'conversion'
    label: string
  }
  channelIds: string[]
  locationIds: string[]
  assetIds: string[]
}

export interface Channel extends NamedEntity {
  kind: 'physical' | 'partner' | 'social' | 'email' | 'paid' | 'web'
}

export interface Source extends NamedEntity {
  channelId: string
  description: string
}
