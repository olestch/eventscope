import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import { createDefaultExplorerState } from '~/features/explorer/queryState'
import { buildReportScope, defaultReportTitle } from '~/features/reports/presentation'
import {
  buildReportAnalyticsQuery,
  parseReportRoute,
  reportLocationForExplorerState,
  serializeReportRouteState
} from '~/features/reports/routeState'

const referencePeriod = northstarScenarioV1.referencePeriod

describe('Reports route and Explorer integration', () => {
  it('carries an equivalent QR-filtered AnalyticsQuery from Explorer', () => {
    const explorer = {
      ...createDefaultExplorerState(referenceCatalog),
      channelIds: ['chn-physical'],
      qrCodeIds: ['qr-harbor-entry'],
      devices: ['mobile' as const],
      breakdown: 'qr_code' as const,
      view: 'temporal' as const
    }
    const location = reportLocationForExplorerState(explorer)
    expect(location.path).toBe('/reports/new')
    expect(location.query).toMatchObject({
      campaign: 'cmp-northstar',
      channel: 'chn-physical',
      qr: 'qr-harbor-entry',
      device: 'mobile',
      breakdown: 'qr_code'
    })
    expect(location.query.view).toBeUndefined()
    const restored = parseReportRoute(location.query, referenceCatalog, referencePeriod)
    expect(buildReportAnalyticsQuery(restored)).toMatchObject({
      campaignIds: ['cmp-northstar'],
      channelIds: ['chn-physical'],
      qrCodeIds: ['qr-harbor-entry'],
      devices: ['mobile'],
      breakdown: 'qr_code'
    })
    expect(defaultReportTitle(restored, referenceCatalog)).toBe('Harbor entry card performance report')
    expect(buildReportScope(buildReportAnalyticsQuery(restored), referenceCatalog)).toEqual(
      expect.arrayContaining([
        { label: 'Campaign', value: 'Northstar Launch' },
        { label: 'Scenario QR', value: 'Harbor entry card' },
        { label: 'Device', value: 'Mobile' }
      ])
    )
  })

  it('provides a valid direct-entry default and canonicalizes malformed scope', () => {
    const direct = parseReportRoute({}, referenceCatalog, referencePeriod)
    expect(serializeReportRouteState(direct)).toMatchObject({
      profile: 'large',
      campaign: 'cmp-northstar'
    })
    const malformed = parseReportRoute(
      { profile: 'unknown', start: 'bad', campaign: 'missing', qr: 'missing' },
      referenceCatalog,
      referencePeriod
    )
    expect(malformed).toMatchObject({ profile: 'large', campaignIds: [], qrCodeIds: [] })
  })
})
