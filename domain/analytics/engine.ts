import {
  breakdownDimensions,
  measures,
  type AnalyticsEngine,
  type AnalyticsQuery,
  type BreakdownDimension,
  type BreakdownResult,
  type ComparisonResult,
  type FunnelDefinition,
  type FunnelResult,
  type Measure,
  type MeasureValues,
  type ResultMetadata,
  type SummaryResult,
  type TemporalHeatmapResult,
  type TimeSeriesResult
} from '~/domain/analytics/contracts'
import { assertValidRange, floorBucket, nextBucket, resolveBucket } from '~/domain/analytics/buckets'
import { AnalyticsError } from '~/domain/analytics/errors'
import { normalizeAnalyticsQuery } from '~/domain/analytics/normalizeQuery'
import {
  TEMPORAL_CELLS,
  TEMPORAL_HOURS,
  temporalCellIndex,
  temporalCoordinates
} from '~/domain/analytics/temporal'
import { conversionContextEventTypes, eventTypes } from '~/domain/events/models'
import type { EventDataset, EventRecord } from '~/domain/events/models'

interface ScopeResult {
  matchedEvents: EventRecord[]
  eligibleSessions: Map<string, number>
  convertedSessions: Set<string>
}

const includes = <T>(values: readonly T[] | undefined, value: T) => !values || values.includes(value)

function matchesQuery(
  event: EventRecord,
  query: AnalyticsQuery,
  options: { includeEventType?: boolean; includeQrCode?: boolean } = {}
): boolean {
  const timestamp = Date.parse(event.timestamp)
  const start = Date.parse(query.range.start)
  const end = Date.parse(query.range.end)
  return (
    timestamp >= start &&
    timestamp < end &&
    (options.includeEventType === false || includes(query.eventTypes, event.type)) &&
    includes(query.campaignIds, event.campaignId) &&
    includes(query.channelIds, event.channelId) &&
    includes(query.sourceIds, event.sourceId) &&
    includes(query.locationIds, event.locationId ?? '') &&
    includes(query.assetIds, event.assetId ?? '') &&
    (options.includeQrCode === false || includes(query.qrCodeIds, event.qrCodeId ?? '')) &&
    includes(query.devices, event.device) &&
    includes(query.browsers, event.browser) &&
    includes(query.operatingSystems, event.operatingSystem) &&
    includes(query.countryCodes, event.countryCode) &&
    includes(query.regions, event.region)
  )
}

function validateQuery(query: AnalyticsQuery): AnalyticsQuery {
  const normalized = normalizeAnalyticsQuery(query)
  assertValidRange(normalized.range)

  for (const measure of normalized.measures) {
    if (!measures.includes(measure)) {
      throw new AnalyticsError('unsupported_measure', `Unsupported measure: ${String(measure)}`)
    }
  }
  if (normalized.breakdown && !breakdownDimensions.includes(normalized.breakdown)) {
    throw new AnalyticsError(
      'unsupported_breakdown',
      `Unsupported breakdown: ${String(normalized.breakdown)}`
    )
  }
  if (normalized.bucket) resolveBucket(normalized.range, normalized.bucket)
  return normalized
}

function selectScope(dataset: EventDataset, query: AnalyticsQuery): ScopeResult {
  const matchedEvents = dataset.events.filter((event) => matchesQuery(event, query))
  const eligibleSessions = new Map<string, number>()

  for (const event of dataset.events) {
    if (
      conversionContextEventTypes.some((type) => type === event.type) &&
      matchesQuery(event, query, { includeEventType: false })
    ) {
      const timestamp = Date.parse(event.timestamp)
      eligibleSessions.set(
        event.sessionId,
        Math.min(timestamp, eligibleSessions.get(event.sessionId) ?? timestamp)
      )
    }
  }

  const convertedSessions = new Set<string>()
  for (const event of dataset.events) {
    const eligibleAt = eligibleSessions.get(event.sessionId)
    if (
      eligibleAt !== undefined &&
      event.type === 'conversion' &&
      Date.parse(event.timestamp) >= eligibleAt &&
      matchesQuery(event, query, { includeEventType: false, includeQrCode: false })
    ) {
      convertedSessions.add(event.sessionId)
    }
  }
  return { matchedEvents, eligibleSessions, convertedSessions }
}

function valuesFor(scope: ScopeResult, requested: Measure[]): MeasureValues {
  const values: MeasureValues = {}
  const sessions = new Set(scope.matchedEvents.map(({ sessionId }) => sessionId))
  const visitors = new Set(scope.matchedEvents.map(({ visitorId }) => visitorId))

  for (const measure of requested) {
    if (measure === 'events') values.events = scope.matchedEvents.length
    if (measure === 'sessions') values.sessions = sessions.size
    if (measure === 'visitors') values.visitors = visitors.size
    if (measure === 'conversions') values.conversions = scope.convertedSessions.size
    if (measure === 'conversion_rate') {
      values.conversion_rate = scope.eligibleSessions.size
        ? scope.convertedSessions.size / scope.eligibleSessions.size
        : 0
    }
    if (measure === 'qr_scans') {
      values.qr_scans = scope.matchedEvents.filter(({ type }) => type === 'qr_scan').length
    }
  }
  return values
}

function metadataFor(dataset: EventDataset, query: AnalyticsQuery, scope: ScopeResult): ResultMetadata {
  const matchedSessions = new Set(scope.matchedEvents.map(({ sessionId }) => sessionId)).size
  const metadata: ResultMetadata = {
    datasetId: dataset.id,
    datasetFingerprint: dataset.fingerprint,
    query,
    matchedEventCount: scope.matchedEvents.length,
    matchedSessionCount: matchedSessions
  }
  if (!scope.matchedEvents.length) metadata.emptyReason = 'no_matching_events'
  else if (!scope.eligibleSessions.size) metadata.emptyReason = 'no_eligible_sessions'
  return metadata
}

function summaryFor(dataset: EventDataset, query: AnalyticsQuery): SummaryResult {
  const normalized = validateQuery(query)
  const scope = selectScope(dataset, normalized)
  return {
    kind: 'summary',
    values: valuesFor(scope, normalized.measures),
    metadata: metadataFor(dataset, normalized, scope)
  }
}

const dimensionValue = (event: EventRecord, dimension: BreakdownDimension): string | undefined => {
  if (dimension === 'campaign') return event.campaignId
  if (dimension === 'channel') return event.channelId
  if (dimension === 'source') return event.sourceId
  if (dimension === 'location') return event.locationId
  if (dimension === 'asset') return event.assetId
  if (dimension === 'qr_code') return event.qrCodeId
  if (dimension === 'device') return event.device
  if (dimension === 'browser') return event.browser
  if (dimension === 'operating_system') return event.operatingSystem
  if (dimension === 'country') return event.countryCode
  return event.region
}

function queryForDimension(
  query: AnalyticsQuery,
  dimension: BreakdownDimension,
  key: string
): AnalyticsQuery {
  const dimensionFilters: Record<BreakdownDimension, Partial<AnalyticsQuery>> = {
    campaign: { campaignIds: [key] },
    channel: { channelIds: [key] },
    source: { sourceIds: [key] },
    location: { locationIds: [key] },
    asset: { assetIds: [key] },
    qr_code: { qrCodeIds: [key] },
    device: { devices: [key as EventRecord['device']] },
    browser: { browsers: [key as EventRecord['browser']] },
    operating_system: { operatingSystems: [key as EventRecord['operatingSystem']] },
    country: { countryCodes: [key] },
    region: { regions: [key] }
  }
  return { ...query, ...dimensionFilters[dimension] }
}

function breakdownFor(dataset: EventDataset, query: AnalyticsQuery): BreakdownResult {
  const normalized = validateQuery(query)
  if (!normalized.breakdown) {
    throw new AnalyticsError('missing_breakdown', 'A breakdown dimension is required.')
  }

  const contextEvents = dataset.events.filter((event) => matchesQuery(event, normalized))
  const keys = [
    ...new Set(
      contextEvents
        .map((event) => dimensionValue(event, normalized.breakdown!))
        .filter((key): key is string => key !== undefined)
    )
  ]
  const primaryMeasure = normalized.measures[0]
  const rows = keys.map((key) => {
    const scopedQuery = queryForDimension(normalized, normalized.breakdown!, key)
    const scope = selectScope(dataset, scopedQuery)
    return { key, values: valuesFor(scope, normalized.measures) }
  })
  rows.sort((left, right) => {
    const difference = primaryMeasure
      ? (right.values[primaryMeasure] ?? 0) - (left.values[primaryMeasure] ?? 0)
      : 0
    return difference || left.key.localeCompare(right.key)
  })

  const overallScope = selectScope(dataset, normalized)
  return {
    kind: 'breakdown',
    dimension: normalized.breakdown,
    rows,
    metadata: metadataFor(dataset, normalized, overallScope)
  }
}

function timeSeriesFor(dataset: EventDataset, query: AnalyticsQuery): TimeSeriesResult {
  const normalized = validateQuery(query)
  const bucket = resolveBucket(normalized.range, normalized.bucket)
  const { startMs, endMs } = assertValidRange(normalized.range)
  const points: TimeSeriesResult['points'] = []
  let cursor = floorBucket(startMs, bucket)

  while (cursor < endMs) {
    const next = nextBucket(cursor, bucket)
    const pointRange = {
      start: new Date(Math.max(cursor, startMs)).toISOString(),
      end: new Date(Math.min(next, endMs)).toISOString()
    }
    const scope = selectScope(dataset, { ...normalized, range: pointRange })
    points.push({
      timestamp: new Date(cursor).toISOString(),
      range: pointRange,
      values: valuesFor(scope, normalized.measures)
    })
    cursor = next
  }

  const overallScope = selectScope(dataset, normalized)
  return {
    kind: 'time_series',
    bucket,
    points,
    metadata: { ...metadataFor(dataset, normalized, overallScope), bucket }
  }
}

function temporalHeatmapFor(dataset: EventDataset, query: AnalyticsQuery): TemporalHeatmapResult {
  const normalized = validateQuery(query)
  const overall = {
    matchedEvents: [],
    eligibleSessions: new Map(),
    convertedSessions: new Set()
  } as ScopeResult
  const cells = Array.from(
    { length: TEMPORAL_CELLS },
    () =>
      ({ matchedEvents: [], eligibleSessions: new Map(), convertedSessions: new Set() }) as ScopeResult
  )

  for (const event of dataset.events) {
    const timestamp = Date.parse(event.timestamp)
    const cell = cells[temporalCellIndex(temporalCoordinates(timestamp))]!
    if (matchesQuery(event, normalized)) {
      overall.matchedEvents.push(event)
      cell.matchedEvents.push(event)
    }
    if (
      conversionContextEventTypes.some((type) => type === event.type) &&
      matchesQuery(event, normalized, { includeEventType: false })
    ) {
      overall.eligibleSessions.set(
        event.sessionId,
        Math.min(timestamp, overall.eligibleSessions.get(event.sessionId) ?? timestamp)
      )
      cell.eligibleSessions.set(
        event.sessionId,
        Math.min(timestamp, cell.eligibleSessions.get(event.sessionId) ?? timestamp)
      )
    }
  }

  for (const event of dataset.events) {
    if (
      event.type !== 'conversion' ||
      !matchesQuery(event, normalized, { includeEventType: false, includeQrCode: false })
    ) {
      continue
    }
    const timestamp = Date.parse(event.timestamp)
    const cell = cells[temporalCellIndex(temporalCoordinates(timestamp))]!
    const overallEligibleAt = overall.eligibleSessions.get(event.sessionId)
    if (overallEligibleAt !== undefined && timestamp >= overallEligibleAt) {
      overall.convertedSessions.add(event.sessionId)
    }
    const cellEligibleAt = cell.eligibleSessions.get(event.sessionId)
    if (cellEligibleAt !== undefined && timestamp >= cellEligibleAt) {
      cell.convertedSessions.add(event.sessionId)
    }
  }

  return {
    kind: 'temporal_heatmap',
    cells: cells.map((scope, index) => ({
      weekday: Math.floor(index / TEMPORAL_HOURS) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      hour: index % TEMPORAL_HOURS,
      values: valuesFor(scope, normalized.measures)
    })),
    metadata: metadataFor(dataset, normalized, overall)
  }
}

function funnelFor(
  dataset: EventDataset,
  query: AnalyticsQuery,
  definition: FunnelDefinition
): FunnelResult {
  const normalized = validateQuery(query)
  if (
    definition.steps.length < 2 ||
    new Set(definition.steps).size !== definition.steps.length ||
    definition.steps.some((step) => !eventTypes.includes(step))
  ) {
    throw new AnalyticsError(
      'malformed_funnel',
      'A funnel requires at least two distinct, supported event-type steps.'
    )
  }

  const indexedEvents = dataset.events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => matchesQuery(event, normalized))
  const sessions = new Map<string, typeof indexedEvents>()
  for (const item of indexedEvents) {
    const journey = sessions.get(item.event.sessionId) ?? []
    journey.push(item)
    sessions.set(item.event.sessionId, journey)
  }

  const reached = definition.steps.map(() => 0)
  for (const journey of sessions.values()) {
    journey.sort(
      (left, right) =>
        Date.parse(left.event.timestamp) - Date.parse(right.event.timestamp) || left.index - right.index
    )
    let stepIndex = 0
    for (const { event } of journey) {
      if (event.type === definition.steps[stepIndex]) {
        reached[stepIndex]! += 1
        stepIndex += 1
        if (stepIndex === definition.steps.length) break
      }
    }
  }

  const first = reached[0] ?? 0
  const steps = definition.steps.map((eventType, index) => ({
    eventType,
    sessions: reached[index]!,
    percentageFromFirst: first ? (reached[index]! / first) * 100 : 0,
    dropOffFromPrevious:
      index === 0 || !reached[index - 1]
        ? null
        : ((reached[index - 1]! - reached[index]!) / reached[index - 1]!) * 100
  }))
  const scope = selectScope(dataset, normalized)
  return { kind: 'funnel', steps, metadata: metadataFor(dataset, normalized, scope) }
}

function compareSummaryFor(dataset: EventDataset, query: AnalyticsQuery): ComparisonResult {
  const normalized = validateQuery(query)
  if (!normalized.comparison) {
    throw new AnalyticsError('missing_comparison', 'A comparison definition is required.')
  }
  const { comparison, ...primaryQuery } = normalized
  const { startMs, endMs } = assertValidRange(primaryQuery.range)
  const comparisonRange =
    comparison.kind === 'previous_period'
      ? {
          start: new Date(startMs - (endMs - startMs)).toISOString(),
          end: new Date(startMs).toISOString()
        }
      : comparison.range
  assertValidRange(comparisonRange)

  const primary = summaryFor(dataset, primaryQuery)
  const comparisonResult = summaryFor(dataset, { ...primaryQuery, range: comparisonRange })
  const deltas: ComparisonResult['deltas'] = {}
  for (const measure of primaryQuery.measures) {
    const primaryValue = primary.values[measure] ?? 0
    const comparisonValue = comparisonResult.values[measure] ?? 0
    const absolute = primaryValue - comparisonValue
    deltas[measure] = {
      absolute,
      percentage: comparisonValue === 0 ? null : (absolute / comparisonValue) * 100
    }
  }
  return {
    kind: 'comparison',
    primary,
    comparison: comparisonResult,
    deltas,
    comparisonDefinition: { kind: comparison.kind, range: comparisonRange }
  }
}

/**
 * Pure synchronous baseline engine. It scans immutable source events and uses
 * exact Sets for distinct counts; later adapters may change execution/storage
 * without changing these analytical contracts.
 */
export function createAnalyticsEngine(dataset: EventDataset): AnalyticsEngine {
  const engine: AnalyticsEngine = {
    summary: (query) => summaryFor(dataset, query),
    breakdown: (query) => breakdownFor(dataset, query),
    timeSeries: (query) => timeSeriesFor(dataset, query),
    temporalHeatmap: (query) => temporalHeatmapFor(dataset, query),
    funnel: (query, definition) => funnelFor(dataset, query, definition),
    compareSummary: (query) => compareSummaryFor(dataset, query)
  }
  return Object.freeze(engine)
}
