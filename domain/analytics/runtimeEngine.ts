import { assertValidRange, floorBucket, nextBucket, resolveBucket } from '~/domain/analytics/buckets'
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
import { AnalyticsError } from '~/domain/analytics/errors'
import { normalizeAnalyticsQuery } from '~/domain/analytics/normalizeQuery'
import {
  TEMPORAL_CELLS,
  TEMPORAL_HOURS,
  temporalCellIndex,
  temporalCoordinates
} from '~/domain/analytics/temporal'
import type { AnalyticsStorage, DictionaryColumn } from '~/domain/analytics/storage'
import { eventTypes as supportedEventTypes } from '~/domain/events/models'

interface CompiledQuery {
  query: AnalyticsQuery
  startMs: number
  endMs: number
  eventTypes?: Set<number>
  campaigns?: Set<number>
  channels?: Set<number>
  sources?: Set<number>
  locations?: Set<number>
  assets?: Set<number>
  qrCodes?: Set<number>
  devices?: Set<number>
  browsers?: Set<number>
  operatingSystems?: Set<number>
  countries?: Set<number>
  regions?: Set<number>
}

interface RuntimeScope {
  matchedEventCount: number
  matchedSessions: Set<number>
  matchedVisitors: Set<number>
  eligibleSessions: Map<number, number>
  convertedSessions: Set<number>
  qrScanCount: number
}

const createScope = (): RuntimeScope => ({
  matchedEventCount: 0,
  matchedSessions: new Set(),
  matchedVisitors: new Set(),
  eligibleSessions: new Map(),
  convertedSessions: new Set(),
  qrScanCount: 0
})

const encodeFilter = (values: string[] | undefined, column: DictionaryColumn) =>
  values ? new Set(values.map((value) => column.codeByValue.get(value) ?? -1)) : undefined

function validateAndCompile(storage: AnalyticsStorage, query: AnalyticsQuery): CompiledQuery {
  const normalized = normalizeAnalyticsQuery(query)
  const { startMs, endMs } = assertValidRange(normalized.range)
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

  return {
    query: normalized,
    startMs,
    endMs,
    eventTypes: encodeFilter(normalized.eventTypes, storage.eventTypes),
    campaigns: encodeFilter(normalized.campaignIds, storage.campaigns),
    channels: encodeFilter(normalized.channelIds, storage.channels),
    sources: encodeFilter(normalized.sourceIds, storage.sources),
    locations: encodeFilter(normalized.locationIds, storage.locations),
    assets: encodeFilter(normalized.assetIds, storage.assets),
    qrCodes: encodeFilter(normalized.qrCodeIds, storage.qrCodes),
    devices: encodeFilter(normalized.devices, storage.devices),
    browsers: encodeFilter(normalized.browsers, storage.browsers),
    operatingSystems: encodeFilter(normalized.operatingSystems, storage.operatingSystems),
    countries: encodeFilter(normalized.countryCodes, storage.countries),
    regions: encodeFilter(normalized.regions, storage.regions)
  }
}

const includesCode = (filter: Set<number> | undefined, value: number) =>
  filter === undefined || filter.has(value)

function matchesBaseRow(
  storage: AnalyticsStorage,
  query: CompiledQuery,
  index: number,
  includeQrCode = true
): boolean {
  const timestamp = storage.timestamps[index]!
  return (
    timestamp >= query.startMs &&
    timestamp < query.endMs &&
    includesCode(query.campaigns, storage.campaigns.codes[index]!) &&
    includesCode(query.channels, storage.channels.codes[index]!) &&
    includesCode(query.sources, storage.sources.codes[index]!) &&
    includesCode(query.locations, storage.locations.codes[index]!) &&
    includesCode(query.assets, storage.assets.codes[index]!) &&
    (!includeQrCode || includesCode(query.qrCodes, storage.qrCodes.codes[index]!)) &&
    includesCode(query.devices, storage.devices.codes[index]!) &&
    includesCode(query.browsers, storage.browsers.codes[index]!) &&
    includesCode(query.operatingSystems, storage.operatingSystems.codes[index]!) &&
    includesCode(query.countries, storage.countries.codes[index]!) &&
    includesCode(query.regions, storage.regions.codes[index]!)
  )
}

function selectScope(storage: AnalyticsStorage, compiled: CompiledQuery): RuntimeScope {
  const scope = createScope()
  const pageView = storage.eventTypes.codeByValue.get('page_view')
  const qrScan = storage.eventTypes.codeByValue.get('qr_scan')
  const conversion = storage.eventTypes.codeByValue.get('conversion')

  for (let index = 0; index < storage.eventCount; index += 1) {
    if (!matchesBaseRow(storage, compiled, index)) continue
    const eventType = storage.eventTypes.codes[index]!
    const session = storage.sessions[index]!
    if (includesCode(compiled.eventTypes, eventType)) {
      scope.matchedEventCount += 1
      scope.matchedSessions.add(session)
      scope.matchedVisitors.add(storage.visitors[index]!)
      if (eventType === qrScan) scope.qrScanCount += 1
    }
    if (eventType === pageView || eventType === qrScan) {
      const timestamp = storage.timestamps[index]!
      scope.eligibleSessions.set(
        session,
        Math.min(timestamp, scope.eligibleSessions.get(session) ?? timestamp)
      )
    }
  }

  if (conversion !== undefined && scope.eligibleSessions.size) {
    for (let index = 0; index < storage.eventCount; index += 1) {
      if (
        storage.eventTypes.codes[index] !== conversion ||
        !matchesBaseRow(storage, compiled, index, false)
      ) {
        continue
      }
      const session = storage.sessions[index]!
      const eligibleAt = scope.eligibleSessions.get(session)
      if (eligibleAt !== undefined && storage.timestamps[index]! >= eligibleAt) {
        scope.convertedSessions.add(session)
      }
    }
  }
  return scope
}

function valuesFor(scope: RuntimeScope, requested: Measure[]): MeasureValues {
  const values: MeasureValues = {}
  for (const measure of requested) {
    if (measure === 'events') values.events = scope.matchedEventCount
    if (measure === 'sessions') values.sessions = scope.matchedSessions.size
    if (measure === 'visitors') values.visitors = scope.matchedVisitors.size
    if (measure === 'conversions') values.conversions = scope.convertedSessions.size
    if (measure === 'conversion_rate') {
      values.conversion_rate = scope.eligibleSessions.size
        ? scope.convertedSessions.size / scope.eligibleSessions.size
        : 0
    }
    if (measure === 'qr_scans') values.qr_scans = scope.qrScanCount
  }
  return values
}

function metadataFor(
  storage: AnalyticsStorage,
  query: AnalyticsQuery,
  scope: RuntimeScope
): ResultMetadata {
  const metadata: ResultMetadata = {
    datasetId: storage.datasetId,
    datasetFingerprint: storage.datasetFingerprint,
    query,
    matchedEventCount: scope.matchedEventCount,
    matchedSessionCount: scope.matchedSessions.size
  }
  if (!scope.matchedEventCount) metadata.emptyReason = 'no_matching_events'
  else if (!scope.eligibleSessions.size) metadata.emptyReason = 'no_eligible_sessions'
  return metadata
}

function summaryFor(storage: AnalyticsStorage, query: AnalyticsQuery): SummaryResult {
  const compiled = validateAndCompile(storage, query)
  const scope = selectScope(storage, compiled)
  return {
    kind: 'summary',
    values: valuesFor(scope, compiled.query.measures),
    metadata: metadataFor(storage, compiled.query, scope)
  }
}

function dimensionColumn(storage: AnalyticsStorage, dimension: BreakdownDimension): DictionaryColumn {
  if (dimension === 'campaign') return storage.campaigns
  if (dimension === 'channel') return storage.channels
  if (dimension === 'source') return storage.sources
  if (dimension === 'location') return storage.locations
  if (dimension === 'asset') return storage.assets
  if (dimension === 'qr_code') return storage.qrCodes
  if (dimension === 'device') return storage.devices
  if (dimension === 'browser') return storage.browsers
  if (dimension === 'operating_system') return storage.operatingSystems
  if (dimension === 'country') return storage.countries
  return storage.regions
}

function queryForDimension(
  query: AnalyticsQuery,
  dimension: BreakdownDimension,
  key: string
): AnalyticsQuery {
  const filters: Record<BreakdownDimension, Partial<AnalyticsQuery>> = {
    campaign: { campaignIds: [key] },
    channel: { channelIds: [key] },
    source: { sourceIds: [key] },
    location: { locationIds: [key] },
    asset: { assetIds: [key] },
    qr_code: { qrCodeIds: [key] },
    device: { devices: [key as NonNullable<AnalyticsQuery['devices']>[number]] },
    browser: { browsers: [key as NonNullable<AnalyticsQuery['browsers']>[number]] },
    operating_system: {
      operatingSystems: [key as NonNullable<AnalyticsQuery['operatingSystems']>[number]]
    },
    country: { countryCodes: [key] },
    region: { regions: [key] }
  }
  return { ...query, ...filters[dimension] }
}

function breakdownFor(storage: AnalyticsStorage, query: AnalyticsQuery): BreakdownResult {
  const compiled = validateAndCompile(storage, query)
  if (!compiled.query.breakdown) {
    throw new AnalyticsError('missing_breakdown', 'A breakdown dimension is required.')
  }
  const column = dimensionColumn(storage, compiled.query.breakdown)
  const keys = new Set<number>()
  for (let index = 0; index < storage.eventCount; index += 1) {
    if (
      matchesBaseRow(storage, compiled, index) &&
      includesCode(compiled.eventTypes, storage.eventTypes.codes[index]!) &&
      column.codes[index]
    ) {
      keys.add(column.codes[index]!)
    }
  }

  const primaryMeasure = compiled.query.measures[0]
  const rows = [...keys].map((code) => {
    const key = column.values[code - 1]!
    const scopedQuery = queryForDimension(compiled.query, compiled.query.breakdown!, key)
    const scoped = validateAndCompile(storage, scopedQuery)
    return { key, values: valuesFor(selectScope(storage, scoped), compiled.query.measures) }
  })
  rows.sort((left, right) => {
    const difference = primaryMeasure
      ? (right.values[primaryMeasure] ?? 0) - (left.values[primaryMeasure] ?? 0)
      : 0
    return difference || left.key.localeCompare(right.key)
  })
  const overall = selectScope(storage, compiled)
  return {
    kind: 'breakdown',
    dimension: compiled.query.breakdown,
    rows,
    metadata: metadataFor(storage, compiled.query, overall)
  }
}

interface BucketScope extends RuntimeScope {
  timestamp: number
  startMs: number
  endMs: number
}

function findBucket(timestamp: number, buckets: BucketScope[]): BucketScope | undefined {
  let low = 0
  let high = buckets.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const bucket = buckets[middle]!
    if (timestamp < bucket.startMs) high = middle - 1
    else if (timestamp >= bucket.endMs) low = middle + 1
    else return bucket
  }
}

function timeSeriesFor(storage: AnalyticsStorage, query: AnalyticsQuery): TimeSeriesResult {
  const compiled = validateAndCompile(storage, query)
  const bucket = resolveBucket(compiled.query.range, compiled.query.bucket)
  const buckets: BucketScope[] = []
  let cursor = floorBucket(compiled.startMs, bucket)
  while (cursor < compiled.endMs) {
    const next = nextBucket(cursor, bucket)
    buckets.push({
      ...createScope(),
      timestamp: cursor,
      startMs: Math.max(cursor, compiled.startMs),
      endMs: Math.min(next, compiled.endMs)
    })
    cursor = next
  }

  const pageView = storage.eventTypes.codeByValue.get('page_view')
  const qrScan = storage.eventTypes.codeByValue.get('qr_scan')
  const conversion = storage.eventTypes.codeByValue.get('conversion')
  for (let index = 0; index < storage.eventCount; index += 1) {
    if (!matchesBaseRow(storage, compiled, index)) continue
    const target = findBucket(storage.timestamps[index]!, buckets)
    if (!target) continue
    const eventType = storage.eventTypes.codes[index]!
    const session = storage.sessions[index]!
    if (includesCode(compiled.eventTypes, eventType)) {
      target.matchedEventCount += 1
      target.matchedSessions.add(session)
      target.matchedVisitors.add(storage.visitors[index]!)
      if (eventType === qrScan) target.qrScanCount += 1
    }
    if (eventType === pageView || eventType === qrScan) {
      const timestamp = storage.timestamps[index]!
      target.eligibleSessions.set(
        session,
        Math.min(timestamp, target.eligibleSessions.get(session) ?? timestamp)
      )
    }
  }
  if (conversion !== undefined) {
    for (let index = 0; index < storage.eventCount; index += 1) {
      if (
        storage.eventTypes.codes[index] !== conversion ||
        !matchesBaseRow(storage, compiled, index, false)
      ) {
        continue
      }
      const target = findBucket(storage.timestamps[index]!, buckets)
      const eligibleAt = target?.eligibleSessions.get(storage.sessions[index]!)
      if (target && eligibleAt !== undefined && storage.timestamps[index]! >= eligibleAt) {
        target.convertedSessions.add(storage.sessions[index]!)
      }
    }
  }

  const overall = selectScope(storage, compiled)
  return {
    kind: 'time_series',
    bucket,
    points: buckets.map((point) => ({
      timestamp: new Date(point.timestamp).toISOString(),
      range: {
        start: new Date(point.startMs).toISOString(),
        end: new Date(point.endMs).toISOString()
      },
      values: valuesFor(point, compiled.query.measures)
    })),
    metadata: { ...metadataFor(storage, compiled.query, overall), bucket }
  }
}

function addMatchedRow(
  scope: RuntimeScope,
  storage: AnalyticsStorage,
  index: number,
  eventType: number,
  qrScan: number | undefined
) {
  scope.matchedEventCount += 1
  scope.matchedSessions.add(storage.sessions[index]!)
  scope.matchedVisitors.add(storage.visitors[index]!)
  if (eventType === qrScan) scope.qrScanCount += 1
}

function addEligibleRow(scope: RuntimeScope, session: number, timestamp: number) {
  scope.eligibleSessions.set(
    session,
    Math.min(timestamp, scope.eligibleSessions.get(session) ?? timestamp)
  )
}

function temporalHeatmapFor(storage: AnalyticsStorage, query: AnalyticsQuery): TemporalHeatmapResult {
  const compiled = validateAndCompile(storage, query)
  const overall = createScope()
  const cells = Array.from({ length: TEMPORAL_CELLS }, createScope)
  const pageView = storage.eventTypes.codeByValue.get('page_view')
  const qrScan = storage.eventTypes.codeByValue.get('qr_scan')
  const conversion = storage.eventTypes.codeByValue.get('conversion')

  for (let index = 0; index < storage.eventCount; index += 1) {
    if (!matchesBaseRow(storage, compiled, index)) continue
    const timestamp = storage.timestamps[index]!
    const cell = cells[temporalCellIndex(temporalCoordinates(timestamp))]!
    const eventType = storage.eventTypes.codes[index]!
    const session = storage.sessions[index]!
    if (includesCode(compiled.eventTypes, eventType)) {
      addMatchedRow(overall, storage, index, eventType, qrScan)
      addMatchedRow(cell, storage, index, eventType, qrScan)
    }
    if (eventType === pageView || eventType === qrScan) {
      addEligibleRow(overall, session, timestamp)
      addEligibleRow(cell, session, timestamp)
    }
  }

  if (conversion !== undefined) {
    for (let index = 0; index < storage.eventCount; index += 1) {
      if (
        storage.eventTypes.codes[index] !== conversion ||
        !matchesBaseRow(storage, compiled, index, false)
      ) {
        continue
      }
      const timestamp = storage.timestamps[index]!
      const session = storage.sessions[index]!
      const cell = cells[temporalCellIndex(temporalCoordinates(timestamp))]!
      const overallEligibleAt = overall.eligibleSessions.get(session)
      if (overallEligibleAt !== undefined && timestamp >= overallEligibleAt) {
        overall.convertedSessions.add(session)
      }
      const cellEligibleAt = cell.eligibleSessions.get(session)
      if (cellEligibleAt !== undefined && timestamp >= cellEligibleAt) {
        cell.convertedSessions.add(session)
      }
    }
  }

  return {
    kind: 'temporal_heatmap',
    cells: cells.map((scope, index) => ({
      weekday: Math.floor(index / TEMPORAL_HOURS) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      hour: index % TEMPORAL_HOURS,
      values: valuesFor(scope, compiled.query.measures)
    })),
    metadata: metadataFor(storage, compiled.query, overall)
  }
}

function funnelFor(
  storage: AnalyticsStorage,
  query: AnalyticsQuery,
  definition: FunnelDefinition
): FunnelResult {
  const compiled = validateAndCompile(storage, query)
  if (
    definition.steps.length < 2 ||
    new Set(definition.steps).size !== definition.steps.length ||
    definition.steps.some((step) => !supportedEventTypes.includes(step))
  ) {
    throw new AnalyticsError(
      'malformed_funnel',
      'A funnel requires at least two distinct, supported event-type steps.'
    )
  }
  const stepCodes = definition.steps.map((step) => storage.eventTypes.codeByValue.get(step) ?? -1)
  const qrEligibleSessions = new Map<number, number>()
  if (compiled.qrCodes) {
    for (let index = 0; index < storage.eventCount; index += 1) {
      if (!matchesBaseRow(storage, compiled, index)) continue
      const session = storage.sessions[index]!
      const timestamp = storage.timestamps[index]!
      qrEligibleSessions.set(session, Math.min(timestamp, qrEligibleSessions.get(session) ?? timestamp))
    }
  }
  const sessionState = new Map<number, { nextStep: number; matchedAt: number }>()
  const reached = definition.steps.map(() => 0)
  for (let position = 0; position < storage.eventCount; position += 1) {
    const index = storage.funnelOrder?.[position] ?? position
    if (
      !matchesBaseRow(storage, compiled, index, !compiled.qrCodes) ||
      !includesCode(compiled.eventTypes, storage.eventTypes.codes[index]!)
    ) {
      continue
    }
    const session = storage.sessions[index]!
    const qrEligibleAt = compiled.qrCodes ? qrEligibleSessions.get(session) : undefined
    if (compiled.qrCodes && (qrEligibleAt === undefined || storage.timestamps[index]! < qrEligibleAt)) {
      continue
    }
    const state = sessionState.get(session)
    const nextStep = state?.nextStep ?? 0
    const timestamp = storage.timestamps[index]!
    if (
      storage.eventTypes.codes[index] === stepCodes[nextStep] &&
      timestamp >= (state?.matchedAt ?? -Infinity)
    ) {
      reached[nextStep]! += 1
      sessionState.set(session, { nextStep: nextStep + 1, matchedAt: timestamp })
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
  const scope = selectScope(storage, compiled)
  return { kind: 'funnel', steps, metadata: metadataFor(storage, compiled.query, scope) }
}

function compareSummaryFor(storage: AnalyticsStorage, query: AnalyticsQuery): ComparisonResult {
  const compiled = validateAndCompile(storage, query)
  if (!compiled.query.comparison) {
    throw new AnalyticsError('missing_comparison', 'A comparison definition is required.')
  }
  const { comparison, ...primaryQuery } = compiled.query
  const comparisonRange =
    comparison.kind === 'previous_period'
      ? {
          start: new Date(compiled.startMs - (compiled.endMs - compiled.startMs)).toISOString(),
          end: new Date(compiled.startMs).toISOString()
        }
      : comparison.range
  assertValidRange(comparisonRange)
  const primary = summaryFor(storage, primaryQuery)
  const comparisonResult = summaryFor(storage, { ...primaryQuery, range: comparisonRange })
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

/** Optimized pure engine over internal columnar storage; semantics mirror the Phase 3 reference engine. */
export function createRuntimeAnalyticsEngine(storage: AnalyticsStorage): AnalyticsEngine {
  const engine: AnalyticsEngine = {
    summary: (query) => summaryFor(storage, query),
    breakdown: (query) => breakdownFor(storage, query),
    timeSeries: (query) => timeSeriesFor(storage, query),
    temporalHeatmap: (query) => temporalHeatmapFor(storage, query),
    funnel: (query, definition) => funnelFor(storage, query, definition),
    compareSummary: (query) => compareSummaryFor(storage, query)
  }
  return Object.freeze(engine)
}
