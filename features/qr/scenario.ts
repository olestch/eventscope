import type { ReferenceCatalog } from '~/domain/events/models'
import type { QRCodeDefinition } from '~/domain/tracking/models'
import {
  createDefaultExplorerState,
  serializeExplorerState,
  utcDatePart
} from '~/features/explorer/queryState'
import { createQrStudioDraftFromTracked } from '~/features/qr/studio'

export const scenarioQrToDraft = (qr: QRCodeDefinition, catalog: ReferenceCatalog) =>
  createQrStudioDraftFromTracked(qr, catalog)

export function scenarioQrAnalyticsLocation(qr: QRCodeDefinition, catalog: ReferenceCatalog) {
  const campaign = catalog.campaigns.find(({ id }) => id === qr.campaignId)
  const defaults = createDefaultExplorerState(catalog)
  const state = {
    ...defaults,
    campaignIds: [qr.campaignId],
    qrCodeIds: [qr.id],
    ...(campaign
      ? { startDate: utcDatePart(campaign.period.start), endDate: utcDatePart(campaign.period.end) }
      : {})
  }
  return { path: '/explore', query: serializeExplorerState(state) }
}
