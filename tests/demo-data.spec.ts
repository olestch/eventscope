import { describe, expect, it } from 'vitest'
import { campaigns, explorerSnapshot, locations, qrAssets, reports } from '~/data/demo'

describe('fictional demo dataset', () => {
  it('keeps every relation connected', () => {
    const campaignIds = new Set(campaigns.map(({ id }) => id))
    const locationIds = new Set(locations.map(({ id }) => id))

    expect(qrAssets.every(({ campaignId }) => campaignIds.has(campaignId))).toBe(true)
    expect(qrAssets.every(({ locationId }) => locationIds.has(locationId))).toBe(true)
    expect(reports.every(({ campaignId }) => campaignIds.has(campaignId))).toBe(true)
    expect(campaignIds.has(explorerSnapshot.campaignId)).toBe(true)
  })

  it('uses fixed ISO dates for asset updates', () => {
    expect(qrAssets.map(({ updatedAt }) => updatedAt)).toEqual([
      '2026-03-12',
      '2026-03-11',
      '2026-03-09'
    ])
    expect(qrAssets.every(({ updatedAt }) => /^\d{4}-\d{2}-\d{2}$/.test(updatedAt))).toBe(true)
  })

  it('keeps campaign location references unique', () => {
    expect(campaigns.every(({ locationIds: ids }) => new Set(ids).size === ids.length)).toBe(true)
  })
})
