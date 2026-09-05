import type { ReferenceCatalog } from '~/domain/events/models'
import type { QrStudioDraft, QrSvgArtifact } from '~/domain/qr/models'
import { validateQrDefinition } from '~/domain/qr/validation'
import type { QRCodeDefinition } from '~/domain/tracking/models'
import { encodeQrMatrix } from '~/services/qr/encodeMatrix'
import { createQrSvgArtifact } from '~/services/qr/renderSvg'

export const defaultQrDesign: QrStudioDraft['design'] = {
  foreground: '#07111c',
  background: '#f3f5f2',
  moduleStyle: 'rounded',
  finderStyle: 'rounded',
  margin: 4,
  gradient: {
    enabled: true,
    startColor: '#163f3e',
    endColor: '#07111c',
    direction: 'diagonal'
  },
  logo: { enabled: true, size: 0.16 }
}

export function cloneQrStudioDraft(draft: QrStudioDraft): QrStudioDraft {
  return {
    ...draft,
    design: {
      ...draft.design,
      gradient: { ...draft.design.gradient },
      logo: { ...draft.design.logo }
    }
  }
}

export function createDefaultQrStudioDraft(catalog: ReferenceCatalog): QrStudioDraft {
  const campaign = catalog.campaigns.find(({ id }) => id === 'cmp-northstar') ?? catalog.campaigns[0]!
  const channel =
    catalog.channels.find(({ id }) => id === 'chn-physical' && campaign.channelIds.includes(id)) ??
    catalog.channels.find(({ id }) => campaign.channelIds.includes(id)) ??
    catalog.channels[0]!
  const location =
    catalog.locations.find(({ id }) => id === 'loc-harbor' && campaign.locationIds.includes(id)) ??
    catalog.locations.find(({ id }) => campaign.locationIds.includes(id))

  return {
    id: 'qr-studio-northstar-harbor',
    name: 'Northstar Harbor invitation',
    campaignId: campaign.id,
    channelId: channel.id,
    ...(location ? { locationId: location.id } : {}),
    destination: 'https://demo.eventscope.dev/northstar/harbor-entry',
    design: {
      ...defaultQrDesign,
      gradient: { ...defaultQrDesign.gradient },
      logo: { ...defaultQrDesign.logo }
    }
  }
}

export function createQrStudioDraftFromTracked(
  definition: QRCodeDefinition,
  catalog: ReferenceCatalog
): QrStudioDraft {
  const fallback = createDefaultQrStudioDraft(catalog)
  return {
    ...fallback,
    id: definition.id,
    name: definition.name,
    campaignId: definition.campaignId,
    channelId: definition.channelId,
    locationId: definition.locationId,
    destination: definition.destination
  }
}

export function buildQrArtifact(definition: QrStudioDraft): QrSvgArtifact | undefined {
  const validation = validateQrDefinition(definition)
  if (!validation.valid || !validation.normalizedDestination) return undefined
  const encodedDestination = new URL(validation.normalizedDestination).href
  return createQrSvgArtifact(encodeQrMatrix(encodedDestination), definition)
}

export function updateDraftCampaign(
  draft: QrStudioDraft,
  campaignId: string,
  catalog: ReferenceCatalog
): QrStudioDraft {
  const campaign = catalog.campaigns.find(({ id }) => id === campaignId)
  if (!campaign) return draft
  const channelId = campaign.channelIds.includes(draft.channelId)
    ? draft.channelId
    : (campaign.channelIds[0] ?? draft.channelId)
  const locationId =
    draft.locationId && campaign.locationIds.includes(draft.locationId)
      ? draft.locationId
      : campaign.locationIds[0]
  return {
    ...draft,
    campaignId,
    channelId,
    ...(locationId ? { locationId } : { locationId: undefined })
  }
}

export function qrContextLabels(definition: QrStudioDraft, catalog: ReferenceCatalog) {
  return {
    campaign:
      catalog.campaigns.find(({ id }) => id === definition.campaignId)?.name ?? definition.campaignId,
    channel:
      catalog.channels.find(({ id }) => id === definition.channelId)?.name ?? definition.channelId,
    location: definition.locationId
      ? (catalog.locations.find(({ id }) => id === definition.locationId)?.name ?? definition.locationId)
      : 'No location'
  }
}
