import type { AnalyticsQuery } from '~/domain/analytics/contracts'

const normalizeValues = <T extends string>(values?: T[]) =>
  values?.length ? [...new Set(values)].sort() : undefined

export function normalizeAnalyticsQuery(query: AnalyticsQuery): AnalyticsQuery {
  const normalized: AnalyticsQuery = {
    range: { start: query.range.start, end: query.range.end },
    measures: [...new Set(query.measures)].sort()
  }

  const filters = {
    eventTypes: normalizeValues(query.eventTypes),
    campaignIds: normalizeValues(query.campaignIds),
    channelIds: normalizeValues(query.channelIds),
    sourceIds: normalizeValues(query.sourceIds),
    locationIds: normalizeValues(query.locationIds),
    assetIds: normalizeValues(query.assetIds),
    qrCodeIds: normalizeValues(query.qrCodeIds),
    devices: normalizeValues(query.devices),
    browsers: normalizeValues(query.browsers),
    operatingSystems: normalizeValues(query.operatingSystems),
    countryCodes: normalizeValues(query.countryCodes),
    regions: normalizeValues(query.regions)
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value) Object.assign(normalized, { [key]: value })
  }
  if (query.breakdown) normalized.breakdown = query.breakdown
  if (query.bucket) {
    normalized.bucket =
      query.bucket.kind === 'fixed'
        ? { kind: 'fixed', size: query.bucket.size }
        : { kind: 'adaptive', maxPoints: query.bucket.maxPoints }
  }
  if (query.comparison) {
    normalized.comparison =
      query.comparison.kind === 'custom'
        ? {
            kind: 'custom',
            range: { start: query.comparison.range.start, end: query.comparison.range.end }
          }
        : { kind: 'previous_period' }
  }
  return normalized
}

export function analyticsQueryKey(query: AnalyticsQuery): string {
  return JSON.stringify(normalizeAnalyticsQuery(query))
}
