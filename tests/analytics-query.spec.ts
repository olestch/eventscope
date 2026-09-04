import { describe, expect, it } from 'vitest'
import { analyticsQueryKey, normalizeAnalyticsQuery } from '~/domain/analytics/normalizeQuery'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'

const range = { start: '2026-03-04T00:00:00.000Z', end: '2026-03-18T23:59:59.000Z' }

describe('analytics query normalization', () => {
  it('sorts and de-duplicates filters and measures', () => {
    const normalized = normalizeAnalyticsQuery({
      range,
      campaignIds: ['cmp-northstar', 'cmp-aurora', 'cmp-northstar'],
      eventTypes: ['conversion', 'page_view', 'conversion'],
      measures: ['sessions', 'events', 'sessions']
    })

    expect(normalized.campaignIds).toEqual(['cmp-aurora', 'cmp-northstar'])
    expect(normalized.eventTypes).toEqual(['conversion', 'page_view'])
    expect(normalized.measures).toEqual(['events', 'sessions'])
  })

  it('removes empty optional filters', () => {
    expect(
      normalizeAnalyticsQuery({ range, campaignIds: [], browsers: [], measures: ['events'] })
    ).toEqual({ range, measures: ['events'] })
  })

  it('creates the same key regardless of selected-value order', () => {
    const first: AnalyticsQuery = {
      range,
      campaignIds: ['cmp-northstar', 'cmp-aurora'],
      channelIds: ['chn-web', 'chn-paid'],
      measures: ['sessions', 'events']
    }
    const second: AnalyticsQuery = {
      range,
      campaignIds: ['cmp-aurora', 'cmp-northstar'],
      channelIds: ['chn-paid', 'chn-web'],
      measures: ['events', 'sessions']
    }

    expect(analyticsQueryKey(second)).toBe(analyticsQueryKey(first))
  })
})
