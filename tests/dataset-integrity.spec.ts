import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { reportCatalog } from '~/data/catalog/reportCatalog'
import { generateDataset } from '~/data/generator/generateDataset'
import { validateDataset } from '~/data/generator/validateDataset'

describe('reference catalog', () => {
  it('has the intended inspectable scale and unique IDs', () => {
    expect(referenceCatalog.campaigns).toHaveLength(6)
    expect(referenceCatalog.channels).toHaveLength(6)
    expect(referenceCatalog.sources).toHaveLength(14)
    expect(referenceCatalog.locations).toHaveLength(9)
    expect(referenceCatalog.assets).toHaveLength(36)
    expect(referenceCatalog.qrCodes).toHaveLength(36)

    for (const entities of [
      referenceCatalog.campaigns,
      referenceCatalog.channels,
      referenceCatalog.sources,
      referenceCatalog.locations,
      referenceCatalog.assets,
      referenceCatalog.qrCodes
    ]) {
      expect(new Set(entities.map(({ id }) => id)).size).toBe(entities.length)
    }
  })

  it('keeps report and QR relationships connected', () => {
    const campaignIds = new Set(referenceCatalog.campaigns.map(({ id }) => id))
    const assetIds = new Set(referenceCatalog.assets.map(({ id }) => id))

    expect(reportCatalog.every(({ campaignId }) => campaignIds.has(campaignId))).toBe(true)
    expect(referenceCatalog.qrCodes.every(({ assetId }) => assetIds.has(assetId))).toBe(true)
  })
})

describe('dataset integrity validation', () => {
  it('accepts generated test and development datasets', () => {
    expect(validateDataset(generateDataset({ profile: 'test' }))).toEqual([])
    expect(validateDataset(generateDataset({ profile: 'development' }))).toEqual([])
  })

  it('reports malformed foreign keys, QR scans and destinations as structured issues', () => {
    const dataset = structuredClone(generateDataset({ profile: 'test' }))
    dataset.events[0]!.campaignId = 'cmp-missing'
    dataset.events[1]!.type = 'qr_scan'
    delete dataset.events[1]!.qrCodeId
    dataset.catalog.qrCodes[0]!.destination = 'javascript:alert(1)'

    const issues = validateDataset(dataset)
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_foreign_key' }),
        expect.objectContaining({ code: 'qr_scan_missing_qr_id' }),
        expect.objectContaining({ code: 'malformed_destination' })
      ])
    )
    expect(issues.every(({ message }) => message.length > 0)).toBe(true)
  })

  it('reports duplicate event IDs, impossible ordering and conversion without context', () => {
    const dataset = structuredClone(generateDataset({ profile: 'test' }))
    const first = dataset.events[0]!
    const second = dataset.events[1]!
    second.id = first.id
    second.sessionId = 'ses-invalid'
    second.type = 'conversion'

    const third = dataset.events[2]!
    const fourth = dataset.events[3]!
    fourth.sessionId = third.sessionId
    fourth.visitorId = third.visitorId
    fourth.timestamp = new Date(Date.parse(third.timestamp) - 1_000).toISOString()

    const codes = validateDataset(dataset).map(({ code }) => code)
    expect(codes).toContain('duplicate_id')
    expect(codes).toContain('conversion_without_context')
    expect(codes).toContain('invalid_session_order')
  })
})
