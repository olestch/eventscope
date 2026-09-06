import type { EChartsCoreOption } from 'echarts/core'
import { temporalWeekdays } from '~/domain/analytics/contracts'
import type {
  BreakdownResult,
  ComparisonResult,
  FunnelResult,
  Measure,
  TemporalHeatmapResult,
  TemporalWeekday,
  TimeSeriesResult
} from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import { primaryConversionFunnel } from '~/features/explorer/productFunnel'
import {
  deriveTemporalInsights,
  TEMPORAL_MIN_COMPARISON_TOTAL,
  TEMPORAL_RELATIVE_INSIGHT_THRESHOLD
} from '~/features/explorer/temporalInsights'
import {
  canDrillIntoTimelinePeriod,
  explorerBreakdownMeasures,
  type ExplorerBreakdown,
  type ExplorerBreakdownMeasure,
  type ExplorerQueryState,
  type ExplorerTemporalMeasure,
  type ExplorerView
} from '~/features/explorer/queryState'

export type PresentationLocale = 'en' | 'ru'
export type PresentationTranslate = (key: string, params?: Record<string, unknown>) => string
const intlLocale = (locale: PresentationLocale) => (locale === 'ru' ? 'ru-RU' : 'en-US')
const translated = (
  t: PresentationTranslate | undefined,
  key: string,
  fallback: string,
  params?: Record<string, unknown>
) => (t ? t(key, params) : fallback)

export const measureLabels: Record<ExplorerBreakdownMeasure, string> = {
  events: 'Events',
  sessions: 'Sessions',
  conversions: 'Conversions',
  conversion_rate: 'Conversion rate',
  qr_scans: 'QR scans'
}

export const breakdownLabels: Record<ExplorerBreakdown, string> = {
  campaign: 'Campaign',
  channel: 'Channel',
  location: 'Location',
  qr_code: 'QR code',
  device: 'Device'
}

export const workspaceLabels: Record<ExplorerView, string> = {
  breakdown: 'Breakdown',
  funnel: 'Funnel',
  temporal: 'Temporal'
}

export const temporalWeekdayLabels: Record<TemporalWeekday, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday'
}

export const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`
export const formatHourRange = (hour: number): string =>
  `${formatHour(hour)}–${formatHour((hour + 1) % 24)} UTC`

export const formatCount = (value = 0, locale: PresentationLocale = 'en'): string =>
  new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value)
export const formatCompactCount = (value = 0, locale: PresentationLocale = 'en'): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
export const formatPercentage = (value = 0, locale: PresentationLocale = 'en'): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)
export const formatDate = (value: string, locale: PresentationLocale = 'en'): string =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value))
export const formatDateOnly = (value: string, locale: PresentationLocale = 'en'): string =>
  formatDate(`${value}T00:00:00.000Z`, locale)
export const formatInclusiveRange = (
  start: string,
  end: string,
  locale: PresentationLocale = 'en'
): string => `${formatDateOnly(start, locale)} – ${formatDateOnly(end, locale)}`
export const formatBucketRange = (
  start: string,
  end: string,
  locale: PresentationLocale = 'en'
): string => `${formatDate(start, locale)} – ${formatDate(end, locale)} [start, end) UTC`

export function formatMeasure(
  value: number,
  measure: Measure,
  locale: PresentationLocale = 'en'
): string {
  return measure === 'conversion_rate' ? formatPercentage(value, locale) : formatCount(value, locale)
}

export const translatedMeasureLabel = (measure: ExplorerBreakdownMeasure, t?: PresentationTranslate) =>
  translated(t, `explorer.measures.${measure}`, measureLabels[measure])
export const translatedBreakdownLabel = (breakdown: ExplorerBreakdown, t?: PresentationTranslate) =>
  translated(t, `explorer.dimensions.${breakdown}`, breakdownLabels[breakdown])
export const translatedWorkspaceLabel = (view: ExplorerView, t?: PresentationTranslate) =>
  translated(t, `explorer.${view}`, workspaceLabels[view])

export interface TimelineViewPoint {
  label: string
  rangeLabel: string
  range: { start: string; end: string }
  drillable: boolean
  events: number
  qrScans: number
}

export interface TimelineViewModel {
  bucket: string
  points: TimelineViewPoint[]
}

export function buildTimelineViewModel(
  result: TimeSeriesResult,
  locale: PresentationLocale = 'en'
): TimelineViewModel {
  return {
    bucket: result.bucket,
    points: result.points.map((point) => ({
      label: formatDate(point.range.start, locale),
      rangeLabel: formatBucketRange(point.range.start, point.range.end, locale),
      range: { ...point.range },
      drillable: canDrillIntoTimelinePeriod(point.range),
      events: point.values.events ?? 0,
      qrScans: point.values.qr_scans ?? 0
    }))
  }
}

const labelFor = (
  dimension: ExplorerBreakdown,
  key: string,
  catalog: ReferenceCatalog,
  t?: PresentationTranslate
): string => {
  if (dimension === 'campaign') return catalog.campaigns.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'channel') return catalog.channels.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'location') return catalog.locations.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'qr_code') return catalog.qrCodes.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'device')
    return translated(t, `explorer.devices.${key}`, `${key.charAt(0).toUpperCase()}${key.slice(1)}`)
  return key
}

export interface BreakdownViewRow {
  key: string
  label: string
  value: number
  formattedValue: string
  secondaryValue?: number
  formattedSecondary?: string
}

export interface BreakdownViewModel {
  dimension: ExplorerBreakdown
  measure: ExplorerBreakdownMeasure
  measureLabel: string
  secondaryMeasure: Measure
  secondaryMeasureLabel: string
  rows: BreakdownViewRow[]
}

export function buildBreakdownViewModel(
  result: BreakdownResult,
  catalog: ReferenceCatalog,
  measure: ExplorerBreakdownMeasure,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): BreakdownViewModel {
  const secondaryMeasure: Measure = measure === 'sessions' ? 'conversion_rate' : 'sessions'
  const rows = result.rows
    .map((row) => ({
      key: row.key,
      label: labelFor(result.dimension as ExplorerBreakdown, row.key, catalog, t),
      value: row.values[measure] ?? 0,
      formattedValue: formatMeasure(row.values[measure] ?? 0, measure, locale),
      secondaryValue: row.values[secondaryMeasure],
      formattedSecondary:
        row.values[secondaryMeasure] === undefined
          ? undefined
          : formatMeasure(row.values[secondaryMeasure]!, secondaryMeasure, locale)
    }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
  return {
    dimension: result.dimension as ExplorerBreakdown,
    measure,
    measureLabel: translatedMeasureLabel(measure, t),
    secondaryMeasure,
    secondaryMeasureLabel: translatedMeasureLabel(secondaryMeasure as ExplorerBreakdownMeasure, t),
    rows
  }
}

export interface ActiveFilterChip {
  id: string
  group: 'campaignIds' | 'channelIds' | 'locationIds' | 'qrCodeIds' | 'devices'
  value: string
  label: string
}

export function buildActiveFilterChips(
  state: ExplorerQueryState,
  catalog: ReferenceCatalog,
  t?: PresentationTranslate
): ActiveFilterChip[] {
  const groups: Array<{
    group: ActiveFilterChip['group']
    values: string[]
    label(value: string): string
  }> = [
    {
      group: 'campaignIds',
      values: state.campaignIds,
      label: (value) => catalog.campaigns.find(({ id }) => id === value)?.name ?? value
    },
    {
      group: 'channelIds',
      values: state.channelIds,
      label: (value) => catalog.channels.find(({ id }) => id === value)?.name ?? value
    },
    {
      group: 'locationIds',
      values: state.locationIds,
      label: (value) => catalog.locations.find(({ id }) => id === value)?.name ?? value
    },
    {
      group: 'qrCodeIds',
      values: state.qrCodeIds,
      label: (value) => catalog.qrCodes.find(({ id }) => id === value)?.name ?? value
    },
    {
      group: 'devices',
      values: state.devices,
      label: (value) =>
        translated(t, `explorer.devices.${value}`, `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
    }
  ]
  return groups.flatMap(({ group, values, label }) =>
    values.map((value) => ({ id: `${group}:${value}`, group, value, label: label(value) }))
  )
}

type TooltipParameter = { dataIndex?: number; seriesName?: string; value?: number }
const tooltipParameters = (value: unknown): TooltipParameter[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is TooltipParameter => typeof item === 'object' && item !== null
  )

export function buildTimelineChartOption(
  model: TimelineViewModel,
  reducedMotion: boolean,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): EChartsCoreOption {
  return {
    animation: !reducedMotion,
    color: ['#5eead4', '#ff8066'],
    grid: { left: 52, right: 24, top: 42, bottom: 48 },
    legend: { top: 0, right: 0, textStyle: { color: '#aab9c5' } },
    tooltip: {
      trigger: 'axis',
      formatter: (value: unknown) => {
        const parameters = tooltipParameters(value)
        const index = parameters[0]?.dataIndex ?? 0
        const point = model.points[index]
        return point
          ? `<strong>${point.rangeLabel}</strong><br/>${translatedMeasureLabel('events', t)}: ${formatCount(point.events, locale)}<br/>${translatedMeasureLabel('qr_scans', t)}: ${formatCount(point.qrScans, locale)}${point.drillable ? `<br/><em>${translated(t, 'explorer.timeline.tooltipExplore', 'Click to explore this period')}</em>` : ''}`
          : ''
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: model.points.map(({ label }) => label),
      axisLine: { lineStyle: { color: '#314556' } },
      axisLabel: { color: '#8294a3', hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#8294a3',
        formatter: (value: number) => formatCompactCount(value, locale)
      },
      splitLine: { lineStyle: { color: 'rgba(170,185,197,.11)', type: 'dashed' } }
    },
    series: [
      {
        name: translatedMeasureLabel('events', t),
        type: 'line',
        symbol: 'circle',
        showSymbol: model.points.length < 32,
        lineStyle: { width: 3 },
        cursor: model.points.some(({ drillable }) => drillable) ? 'pointer' : 'default',
        areaStyle: { opacity: 0.12 },
        data: model.points.map(({ events }) => events)
      },
      {
        name: translatedMeasureLabel('qr_scans', t),
        type: 'line',
        symbol: 'diamond',
        showSymbol: model.points.length < 32,
        lineStyle: { width: 2, type: 'dashed' },
        cursor: model.points.some(({ drillable }) => drillable) ? 'pointer' : 'default',
        data: model.points.map(({ qrScans }) => qrScans)
      }
    ]
  }
}

export function buildBreakdownChartOption(
  model: BreakdownViewModel,
  reducedMotion: boolean,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): EChartsCoreOption {
  return {
    animation: !reducedMotion,
    color: ['#8ca6ff'],
    grid: { left: 18, right: 36, top: 8, bottom: 20, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: (value: unknown) => {
        const index = tooltipParameters(value)[0]?.dataIndex ?? 0
        const row = model.rows[index]
        return row
          ? `<strong>${row.label}</strong><br/>${model.measureLabel}: ${row.formattedValue}<br/><em>${translated(t, 'explorer.breakdownPanel.tooltipFilter', 'Click to add this filter')}</em>`
          : ''
      }
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#8294a3',
        formatter: (value: number) =>
          model.measure === 'conversion_rate'
            ? formatPercentage(value, locale)
            : formatCompactCount(value, locale)
      },
      splitLine: { lineStyle: { color: 'rgba(170,185,197,.1)', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: model.rows.map(({ label }) => label),
      axisLabel: { color: '#dce6ec', width: 150, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: model.measureLabel,
        type: 'bar',
        cursor: 'pointer',
        barMaxWidth: 22,
        data: model.rows.map(({ value }) => value),
        label: {
          show: true,
          position: 'right',
          color: '#dce6ec',
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            model.rows[dataIndex]?.formattedValue ?? ''
        },
        itemStyle: { borderRadius: [0, 5, 5, 0] }
      }
    ]
  }
}

export type ComparisonDisplayState = 'change' | 'new' | 'no_previous' | 'unchanged'

export interface ComparisonMetricView {
  measure: ExplorerBreakdownMeasure
  state: ComparisonDisplayState
  text: string
  direction: 'up' | 'down' | 'neutral'
}

export interface ComparisonViewModel {
  rangeLabel: string
  metrics: Partial<Record<ExplorerBreakdownMeasure, ComparisonMetricView>>
}

const formatSignedDelta = (value: number, locale: PresentationLocale): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatPercentage(Math.abs(value) / 100, locale)}`

export function buildComparisonViewModel(
  result: ComparisonResult,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): ComparisonViewModel {
  const metrics: ComparisonViewModel['metrics'] = {}
  const noPreviousData = result.comparison.metadata.matchedEventCount === 0
  for (const measure of explorerBreakdownMeasures) {
    const current = result.primary.values[measure] ?? 0
    const previous = result.comparison.values[measure] ?? 0
    const percentage = result.deltas[measure]?.percentage ?? null
    let metric: ComparisonMetricView
    if (noPreviousData) {
      metric = {
        measure,
        state: 'no_previous',
        text: translated(t, 'explorer.summary.noPrevious', 'No previous data'),
        direction: 'neutral'
      }
    } else if (previous === 0 && current > 0) {
      metric = {
        measure,
        state: 'new',
        text: translated(t, 'explorer.summary.newPrevious', 'New vs previous period'),
        direction: 'up'
      }
    } else if (percentage === null || percentage === 0) {
      metric = {
        measure,
        state: 'unchanged',
        text: translated(t, 'explorer.summary.noChange', 'No change vs previous period'),
        direction: 'neutral'
      }
    } else {
      metric = {
        measure,
        state: 'change',
        text: translated(
          t,
          'explorer.summary.changed',
          `${formatSignedDelta(percentage, locale)} vs previous period`,
          {
            change: formatSignedDelta(percentage, locale)
          }
        ),
        direction: percentage > 0 ? 'up' : 'down'
      }
    }
    metrics[measure] = metric
  }
  return {
    rangeLabel: formatBucketRange(
      result.comparisonDefinition.range.start,
      result.comparisonDefinition.range.end,
      locale
    ),
    metrics
  }
}

export interface FunnelStepView {
  eventType: string
  label: string
  sessions: number
  formattedSessions: string
  percentageFromFirst: string
  progressionFromPrevious: string
  dropOffFromPrevious: string
  width: number
}

export interface FunnelViewModel {
  name: string
  description: string
  empty: boolean
  steps: FunnelStepView[]
}

export function buildFunnelViewModel(
  result: FunnelResult,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): FunnelViewModel {
  return {
    name: translated(t, 'explorer.funnelPanel.name', primaryConversionFunnel.name),
    description: translated(t, 'explorer.funnelPanel.description', primaryConversionFunnel.description),
    empty: (result.steps[0]?.sessions ?? 0) === 0,
    steps: result.steps.map((step, index) => {
      const previous = result.steps[index - 1]?.sessions
      const progression = index === 0 ? undefined : previous ? (step.sessions / previous) * 100 : null
      return {
        eventType: step.eventType,
        label: translated(
          t,
          `explorer.funnelPanel.${step.eventType}`,
          primaryConversionFunnel.stepLabels[step.eventType]
        ),
        sessions: step.sessions,
        formattedSessions: formatCount(step.sessions, locale),
        percentageFromFirst: formatPercentage(step.percentageFromFirst / 100, locale),
        progressionFromPrevious:
          index === 0
            ? translated(t, 'explorer.funnelPanel.entrants', 'Entrants')
            : progression == null
              ? translated(t, 'explorer.funnelPanel.noPrior', 'No prior entrants')
              : formatPercentage(progression / 100, locale),
        dropOffFromPrevious:
          step.dropOffFromPrevious === null
            ? '—'
            : formatPercentage(Math.max(0, step.dropOffFromPrevious) / 100, locale),
        width: Math.max(step.sessions ? step.percentageFromFirst : 0, 2)
      }
    })
  }
}

export interface TemporalHeatmapCellView {
  weekday: TemporalWeekday
  weekdayLabel: string
  hour: number
  hourLabel: string
  hourRangeLabel: string
  value: number
  formattedValue: string
  coordinates: [number, number, number]
}

export interface TemporalInsightView {
  id: string
  title: string
  detail: string
}

export interface TemporalHeatmapViewModel {
  measure: ExplorerTemporalMeasure
  measureLabel: string
  empty: boolean
  cells: TemporalHeatmapCellView[]
  scale: {
    min: number
    max: number
    visualMax: number
    minLabel: string
    maxLabel: string
  }
  insights: TemporalInsightView[]
}

const intensityDirection = (value: number): string => (value >= 0 ? 'higher' : 'lower')
const countDirection = (value: number): string => (value >= 0 ? 'more' : 'fewer')

export function buildTemporalHeatmapViewModel(
  result: TemporalHeatmapResult,
  measure: ExplorerTemporalMeasure,
  locale: PresentationLocale = 'en',
  t?: PresentationTranslate
): TemporalHeatmapViewModel {
  const weekdayFormatter = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    timeZone: 'UTC'
  })
  const weekdayLabels = Object.fromEntries(
    temporalWeekdays.map((weekday) => [
      weekday,
      weekdayFormatter.format(new Date(Date.UTC(2026, 0, 5 + weekday)))
    ])
  ) as Record<TemporalWeekday, string>
  const cells = result.cells.map((cell) => {
    const value = cell.values[measure] ?? 0
    return {
      weekday: cell.weekday,
      weekdayLabel: weekdayLabels[cell.weekday],
      hour: cell.hour,
      hourLabel: formatHour(cell.hour),
      hourRangeLabel: formatHourRange(cell.hour),
      value,
      formattedValue: formatMeasure(value, measure, locale),
      coordinates: [cell.hour, cell.weekday, value] as [number, number, number]
    }
  })
  const values = cells.map(({ value }) => value)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const label = translatedMeasureLabel(measure, t)
  const insights = deriveTemporalInsights(result, measure).map<TemporalInsightView>((insight) => {
    if (insight.kind === 'peak_window') {
      return {
        id: insight.id,
        title: translated(t, 'explorer.temporalPanel.peakTitle', 'Peak temporal window'),
        detail: translated(
          t,
          'explorer.temporalPanel.peakDetail',
          `${weekdayLabels[insight.evidence.weekday]} · ${formatHourRange(insight.evidence.hour)} has the highest ${label.toLowerCase()} value at ${formatMeasure(insight.evidence.value, measure, locale)}.`,
          {
            weekday: weekdayLabels[insight.evidence.weekday],
            hour: formatHourRange(insight.evidence.hour),
            measure: label.toLowerCase(),
            value: formatMeasure(insight.evidence.value, measure, locale)
          }
        )
      }
    }
    if (insight.kind === 'weekday_weekend') {
      const difference = insight.evidence.relativeDifference
      return {
        id: insight.id,
        title: translated(t, 'explorer.temporalPanel.weekendTitle', 'Weekday / weekend balance'),
        detail: translated(
          t,
          'explorer.temporalPanel.weekendDetail',
          `Weekend-day heatmap intensity averages ${formatPercentage(Math.abs(difference), locale)} ${intensityDirection(difference)} than weekday intensity for ${label.toLowerCase()}.`,
          {
            difference: formatPercentage(Math.abs(difference), locale),
            direction: translated(
              t,
              `explorer.temporalPanel.${intensityDirection(difference)}`,
              intensityDirection(difference)
            ),
            measure: label.toLowerCase()
          }
        )
      }
    }
    const difference = insight.evidence.relativeDifference
    return {
      id: insight.id,
      title: translated(t, 'explorer.temporalPanel.daypartTitle', 'Morning / evening balance'),
      detail: translated(
        t,
        'explorer.temporalPanel.daypartDetail',
        `Evening cells (18:00–24:00 UTC) contain ${formatPercentage(Math.abs(difference), locale)} ${countDirection(difference)} ${label.toLowerCase()} than morning cells (06:00–12:00 UTC).`,
        {
          difference: formatPercentage(Math.abs(difference), locale),
          direction: translated(
            t,
            `explorer.temporalPanel.${countDirection(difference)}`,
            countDirection(difference)
          ),
          measure: label.toLowerCase()
        }
      )
    }
  })
  return {
    measure,
    measureLabel: label,
    empty: max === 0,
    cells,
    scale: {
      min,
      max,
      visualMax: max === min ? max + (measure === 'conversion_rate' ? 0.01 : 1) : max,
      minLabel: formatMeasure(min, measure, locale),
      maxLabel: formatMeasure(max, measure, locale)
    },
    insights
  }
}

export function buildTemporalHeatmapChartOption(
  model: TemporalHeatmapViewModel,
  reducedMotion: boolean
): EChartsCoreOption {
  const hours = Array.from({ length: 24 }, (_, hour) => formatHour(hour))
  return {
    animation: !reducedMotion,
    grid: { left: 78, right: 24, top: 18, bottom: 86 },
    tooltip: {
      trigger: 'item',
      formatter: (parameter: unknown) => {
        const value = (parameter as { value?: unknown } | undefined)?.value
        if (!Array.isArray(value)) return ''
        const hour = Number(value[0])
        const weekday = Number(value[1])
        const cell = model.cells.find(
          (candidate) => candidate.hour === hour && candidate.weekday === weekday
        )
        return cell
          ? `<strong>${cell.weekdayLabel}</strong><br/>${cell.hourRangeLabel}<br/>${model.measureLabel}: ${cell.formattedValue}`
          : ''
      }
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: { show: false },
      axisLine: { lineStyle: { color: '#314556' } },
      axisTick: { show: false },
      axisLabel: { color: '#8294a3', interval: 1 }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: temporalWeekdays.map(
        (weekday) => model.cells.find((cell) => cell.weekday === weekday)?.weekdayLabel ?? ''
      ),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#dce6ec' }
    },
    visualMap: {
      type: 'continuous',
      min: model.scale.min,
      max: model.scale.visualMax,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      calculable: false,
      text: [model.scale.maxLabel, model.scale.minLabel],
      textStyle: { color: '#aab9c5' },
      inRange: { color: ['#102a3c', '#315bb5', '#5eead4', '#f7c873'] }
    },
    series: [
      {
        name: model.measureLabel,
        type: 'heatmap',
        data: model.cells.map(({ coordinates }) => coordinates),
        emphasis: { itemStyle: { borderColor: '#ffffff', borderWidth: 1 } },
        itemStyle: { borderColor: '#07111c', borderWidth: 1 }
      }
    ],
    media: [
      { query: { maxWidth: 700 }, option: { xAxis: { axisLabel: { interval: 2 } } } },
      { query: { maxWidth: 440 }, option: { xAxis: { axisLabel: { interval: 3 } } } }
    ]
  }
}

export const temporalInsightRuleValues = (locale: PresentationLocale = 'en') => ({
  difference: formatPercentage(TEMPORAL_RELATIVE_INSIGHT_THRESHOLD, locale),
  count: formatCount(TEMPORAL_MIN_COMPARISON_TOTAL, locale)
})
