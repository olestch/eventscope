import type { AnalyticsQuery, BreakdownDimension, Measure } from '~/domain/analytics/contracts'
import type { DeviceType, ReferenceCatalog } from '~/domain/events/models'
import type { TimeRange } from '~/domain/shared/primitives'

export const explorerProfiles = ['large', 'showcase'] as const
export type ExplorerProfile = (typeof explorerProfiles)[number]

export const explorerBreakdowns = ['campaign', 'channel', 'location', 'device'] as const
export type ExplorerBreakdown = (typeof explorerBreakdowns)[number]

export const explorerBreakdownMeasures = [
  'events',
  'sessions',
  'conversions',
  'conversion_rate',
  'qr_scans'
] as const
export type ExplorerBreakdownMeasure = (typeof explorerBreakdownMeasures)[number]
export type ExplorerDatePreset = '7d' | '30d' | '90d' | 'full'
export const explorerComparisons = ['none', 'previous'] as const
export type ExplorerComparison = (typeof explorerComparisons)[number]
export const explorerViews = ['breakdown', 'funnel', 'temporal'] as const
export type ExplorerView = (typeof explorerViews)[number]
export const explorerTemporalMeasures = explorerBreakdownMeasures
export type ExplorerTemporalMeasure = ExplorerBreakdownMeasure

export interface ExplorerQueryState {
  profile: ExplorerProfile
  startDate: string
  endDate: string
  campaignIds: string[]
  channelIds: string[]
  locationIds: string[]
  devices: DeviceType[]
  breakdown: ExplorerBreakdown
  breakdownMeasure: ExplorerBreakdownMeasure
  temporalMeasure: ExplorerTemporalMeasure
  comparison: ExplorerComparison
  view: ExplorerView
}

export type ExplorerFilterGroup = keyof Pick<
  ExplorerQueryState,
  'campaignIds' | 'channelIds' | 'locationIds' | 'devices'
>

export type ExplorerRouteQuery = Record<string, string | null | undefined | Array<string | null>>

const routeKeys = {
  campaignIds: 'campaign',
  channelIds: 'channel',
  locationIds: 'location',
  devices: 'device'
} as const

const utcDate = /^\d{4}-\d{2}-\d{2}$/

function isDateOnly(value: string): boolean {
  if (!utcDate.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year!, month! - 1, day!))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month! - 1 &&
    parsed.getUTCDate() === day
  )
}

export const utcDatePart = (value: string): string => value.slice(0, 10)

export function addUtcDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10)
}

const scalar = (value: ExplorerRouteQuery[string]): string | undefined => {
  if (Array.isArray(value)) return value.find((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? value : undefined
}

const list = (value: ExplorerRouteQuery[string]): string[] => {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.flatMap((item) => (typeof item === 'string' ? item.split(',') : [])))]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort()
}

const validIds = (values: string[], allowed: readonly string[]) =>
  values.filter((value) => allowed.includes(value))

export function createDefaultExplorerState(catalog: ReferenceCatalog): ExplorerQueryState {
  const campaign = catalog.campaigns.find(({ id }) => id === 'cmp-northstar') ?? catalog.campaigns[0]!
  return {
    profile: 'large',
    startDate: utcDatePart(campaign.period.start),
    endDate: utcDatePart(campaign.period.end),
    campaignIds: [campaign.id],
    channelIds: [],
    locationIds: [],
    devices: [],
    breakdown: 'location',
    breakdownMeasure: 'sessions',
    temporalMeasure: 'events',
    comparison: 'none',
    view: 'breakdown'
  }
}

export function normalizeExplorerState(
  state: ExplorerQueryState,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  const defaults = createDefaultExplorerState(catalog)
  const minimum = utcDatePart(referencePeriod.start)
  const maximum = utcDatePart(referencePeriod.end)
  const startDate = isDateOnly(state.startDate)
    ? state.startDate < minimum
      ? minimum
      : state.startDate > maximum
        ? maximum
        : state.startDate
    : defaults.startDate
  const endDate = isDateOnly(state.endDate)
    ? state.endDate < minimum
      ? minimum
      : state.endDate > maximum
        ? maximum
        : state.endDate
    : defaults.endDate
  const validRange = startDate <= endDate

  return {
    profile: explorerProfiles.includes(state.profile) ? state.profile : defaults.profile,
    startDate: validRange ? startDate : defaults.startDate,
    endDate: validRange ? endDate : defaults.endDate,
    campaignIds: validIds(
      [...new Set(state.campaignIds)].sort(),
      catalog.campaigns.map(({ id }) => id)
    ),
    channelIds: validIds(
      [...new Set(state.channelIds)].sort(),
      catalog.channels.map(({ id }) => id)
    ),
    locationIds: validIds(
      [...new Set(state.locationIds)].sort(),
      catalog.locations.map(({ id }) => id)
    ),
    devices: validIds([...new Set(state.devices)].sort(), catalog.devices) as DeviceType[],
    breakdown: explorerBreakdowns.includes(state.breakdown) ? state.breakdown : defaults.breakdown,
    breakdownMeasure: explorerBreakdownMeasures.includes(state.breakdownMeasure)
      ? state.breakdownMeasure
      : defaults.breakdownMeasure,
    temporalMeasure: explorerTemporalMeasures.includes(state.temporalMeasure)
      ? state.temporalMeasure
      : defaults.temporalMeasure,
    comparison: explorerComparisons.includes(state.comparison) ? state.comparison : defaults.comparison,
    view: explorerViews.includes(state.view) ? state.view : defaults.view
  }
}

export function parseExplorerRoute(
  query: ExplorerRouteQuery,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  const defaults = createDefaultExplorerState(catalog)
  const valueFor = <Key extends keyof typeof routeKeys>(key: Key, fallback: string[]) =>
    Object.hasOwn(query, routeKeys[key]) ? list(query[routeKeys[key]]) : fallback

  return normalizeExplorerState(
    {
      profile: (scalar(query.profile) ?? defaults.profile) as ExplorerProfile,
      startDate: scalar(query.start) ?? defaults.startDate,
      endDate: scalar(query.end) ?? defaults.endDate,
      campaignIds: valueFor('campaignIds', defaults.campaignIds),
      channelIds: valueFor('channelIds', defaults.channelIds),
      locationIds: valueFor('locationIds', defaults.locationIds),
      devices: valueFor('devices', defaults.devices) as DeviceType[],
      breakdown: (scalar(query.breakdown) ?? defaults.breakdown) as ExplorerBreakdown,
      breakdownMeasure: (scalar(query.measure) ?? defaults.breakdownMeasure) as ExplorerBreakdownMeasure,
      temporalMeasure: (scalar(query.temporalMeasure) ??
        defaults.temporalMeasure) as ExplorerTemporalMeasure,
      comparison: (scalar(query.compare) ?? defaults.comparison) as ExplorerComparison,
      view: (scalar(query.view) ?? defaults.view) as ExplorerView
    },
    catalog,
    referencePeriod
  )
}

export function serializeExplorerState(state: ExplorerQueryState): Record<string, string> {
  const query: Record<string, string> = {
    profile: state.profile,
    start: state.startDate,
    end: state.endDate,
    breakdown: state.breakdown,
    measure: state.breakdownMeasure,
    temporalMeasure: state.temporalMeasure,
    view: state.view
  }
  if (state.comparison === 'previous') query.compare = 'previous'
  for (const [key, routeKey] of Object.entries(routeKeys) as Array<[keyof typeof routeKeys, string]>) {
    if (state[key].length) query[routeKey] = [...state[key]].sort().join(',')
  }
  return query
}

export function routeQuerySignature(query: ExplorerRouteQuery): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(query)
        .filter((entry): entry is [string, string | Array<string | null>] => entry[1] != null)
        .sort(([left], [right]) => left.localeCompare(right))
    )
  )
}

export function cloneExplorerState(state: ExplorerQueryState): ExplorerQueryState {
  return {
    ...state,
    campaignIds: [...state.campaignIds],
    channelIds: [...state.channelIds],
    locationIds: [...state.locationIds],
    devices: [...state.devices]
  }
}

export function removeExplorerFilter(
  state: ExplorerQueryState,
  group: ExplorerFilterGroup,
  value: string
): ExplorerQueryState {
  const next = cloneExplorerState(state)
  next[group] = next[group].filter((item) => item !== value) as never
  return next
}

export interface BreakdownSelectionIntent {
  dimension: ExplorerBreakdown
  value: string
}

export interface TimelinePeriodIntent {
  start: string
  end: string
}

const breakdownFilterGroups: Record<ExplorerBreakdown, ExplorerFilterGroup> = {
  campaign: 'campaignIds',
  channel: 'channelIds',
  location: 'locationIds',
  device: 'devices'
}

export function addBreakdownFilter(
  state: ExplorerQueryState,
  intent: BreakdownSelectionIntent,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  const next = cloneExplorerState(state)
  const group = breakdownFilterGroups[intent.dimension]
  next[group] = [...next[group], intent.value] as never
  return normalizeExplorerState(next, catalog, referencePeriod)
}

export function canDrillIntoTimelinePeriod(intent: TimelinePeriodIntent): boolean {
  return intent.start.endsWith('T00:00:00.000Z') && intent.end.endsWith('T00:00:00.000Z')
}

export function drillIntoTimelinePeriod(
  state: ExplorerQueryState,
  intent: TimelinePeriodIntent,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  if (!canDrillIntoTimelinePeriod(intent) || Date.parse(intent.start) >= Date.parse(intent.end)) {
    return cloneExplorerState(state)
  }
  return normalizeExplorerState(
    {
      ...cloneExplorerState(state),
      startDate: utcDatePart(intent.start),
      endDate: utcDatePart(new Date(Date.parse(intent.end) - 1).toISOString())
    },
    catalog,
    referencePeriod
  )
}

export function inclusiveDatesToAnalyticsRange(startDate: string, endDate: string): TimeRange {
  if (!isDateOnly(startDate) || !isDateOnly(endDate) || startDate > endDate) {
    throw new Error('Explorer dates must be valid UTC calendar dates with start before end.')
  }
  return {
    start: `${startDate}T00:00:00.000Z`,
    end: `${addUtcDays(endDate, 1)}T00:00:00.000Z`
  }
}

export function buildExplorerQuery(
  state: ExplorerQueryState,
  measures: Measure[],
  options: { breakdown?: BreakdownDimension; adaptiveTimeline?: boolean } = {}
): AnalyticsQuery {
  return {
    range: inclusiveDatesToAnalyticsRange(state.startDate, state.endDate),
    measures,
    ...(state.campaignIds.length ? { campaignIds: [...state.campaignIds] } : {}),
    ...(state.channelIds.length ? { channelIds: [...state.channelIds] } : {}),
    ...(state.locationIds.length ? { locationIds: [...state.locationIds] } : {}),
    ...(state.devices.length ? { devices: [...state.devices] } : {}),
    ...(options.breakdown ? { breakdown: options.breakdown } : {}),
    ...(options.adaptiveTimeline ? { bucket: { kind: 'adaptive' as const, maxPoints: 48 } } : {})
  }
}

export function buildComparisonQuery(state: ExplorerQueryState, measures: Measure[]): AnalyticsQuery {
  return {
    ...buildExplorerQuery(state, measures),
    comparison: { kind: 'previous_period' }
  }
}

export function applyDatePreset(
  state: ExplorerQueryState,
  preset: ExplorerDatePreset,
  catalog: ReferenceCatalog,
  referencePeriod: TimeRange
): ExplorerQueryState {
  const selectedCampaign =
    state.campaignIds.length === 1
      ? catalog.campaigns.find(({ id }) => id === state.campaignIds[0])
      : undefined
  const scope = selectedCampaign?.period ?? referencePeriod
  const endDate = utcDatePart(scope.end)
  const days = { '7d': 7, '30d': 30, '90d': 90 }[preset as Exclude<ExplorerDatePreset, 'full'>]
  return normalizeExplorerState(
    {
      ...cloneExplorerState(state),
      startDate: preset === 'full' ? utcDatePart(scope.start) : addUtcDays(endDate, -(days! - 1)),
      endDate
    },
    catalog,
    referencePeriod
  )
}
