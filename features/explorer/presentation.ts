import type { EChartsCoreOption } from 'echarts/core'
import type { BreakdownResult, Measure, TimeSeriesResult } from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import type {
  ExplorerBreakdown,
  ExplorerBreakdownMeasure,
  ExplorerQueryState
} from '~/features/explorer/queryState'

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
})
const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
})

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
  device: 'Device'
}

export const formatCount = (value = 0): string => integerFormatter.format(value)
export const formatCompactCount = (value = 0): string => compactFormatter.format(value)
export const formatPercentage = (value = 0): string => `${(value * 100).toFixed(1)}%`
export const formatDate = (value: string): string => dateFormatter.format(new Date(value))
export const formatDateOnly = (value: string): string =>
  dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
export const formatInclusiveRange = (start: string, end: string): string =>
  `${formatDateOnly(start)} – ${formatDateOnly(end)}`
export const formatBucketRange = (start: string, end: string): string =>
  `${formatDate(start)} – ${formatDate(end)} [start, end) UTC`

export function formatMeasure(value: number, measure: Measure): string {
  return measure === 'conversion_rate' ? formatPercentage(value) : formatCount(value)
}

export interface TimelineViewPoint {
  label: string
  rangeLabel: string
  events: number
  qrScans: number
}

export interface TimelineViewModel {
  bucket: string
  points: TimelineViewPoint[]
}

export function buildTimelineViewModel(result: TimeSeriesResult): TimelineViewModel {
  return {
    bucket: result.bucket,
    points: result.points.map((point) => ({
      label: formatDate(point.range.start),
      rangeLabel: formatBucketRange(point.range.start, point.range.end),
      events: point.values.events ?? 0,
      qrScans: point.values.qr_scans ?? 0
    }))
  }
}

const labelFor = (dimension: ExplorerBreakdown, key: string, catalog: ReferenceCatalog): string => {
  if (dimension === 'campaign') return catalog.campaigns.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'channel') return catalog.channels.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'location') return catalog.locations.find(({ id }) => id === key)?.name ?? key
  if (dimension === 'device') return `${key.charAt(0).toUpperCase()}${key.slice(1)}`
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
  measure: ExplorerBreakdownMeasure
): BreakdownViewModel {
  const secondaryMeasure: Measure = measure === 'sessions' ? 'conversion_rate' : 'sessions'
  const rows = result.rows
    .map((row) => ({
      key: row.key,
      label: labelFor(result.dimension as ExplorerBreakdown, row.key, catalog),
      value: row.values[measure] ?? 0,
      formattedValue: formatMeasure(row.values[measure] ?? 0, measure),
      secondaryValue: row.values[secondaryMeasure],
      formattedSecondary:
        row.values[secondaryMeasure] === undefined
          ? undefined
          : formatMeasure(row.values[secondaryMeasure]!, secondaryMeasure)
    }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
  return {
    dimension: result.dimension as ExplorerBreakdown,
    measure,
    measureLabel: measureLabels[measure],
    secondaryMeasure,
    secondaryMeasureLabel: secondaryMeasure === 'conversion_rate' ? 'Conversion rate' : 'Sessions',
    rows
  }
}

export interface ActiveFilterChip {
  id: string
  group: 'campaignIds' | 'channelIds' | 'locationIds' | 'devices'
  value: string
  label: string
}

export function buildActiveFilterChips(
  state: ExplorerQueryState,
  catalog: ReferenceCatalog
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
      group: 'devices',
      values: state.devices,
      label: (value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`
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
  reducedMotion: boolean
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
          ? `<strong>${point.rangeLabel}</strong><br/>Events: ${formatCount(point.events)}<br/>QR scans: ${formatCount(point.qrScans)}`
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
      axisLabel: { color: '#8294a3', formatter: (value: number) => formatCompactCount(value) },
      splitLine: { lineStyle: { color: 'rgba(170,185,197,.11)', type: 'dashed' } }
    },
    series: [
      {
        name: 'Events',
        type: 'line',
        symbol: 'circle',
        showSymbol: model.points.length < 32,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.12 },
        data: model.points.map(({ events }) => events)
      },
      {
        name: 'QR scans',
        type: 'line',
        symbol: 'diamond',
        showSymbol: model.points.length < 32,
        lineStyle: { width: 2, type: 'dashed' },
        data: model.points.map(({ qrScans }) => qrScans)
      }
    ]
  }
}

export function buildBreakdownChartOption(
  model: BreakdownViewModel,
  reducedMotion: boolean
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
          ? `<strong>${row.label}</strong><br/>${model.measureLabel}: ${row.formattedValue}`
          : ''
      }
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#8294a3',
        formatter: (value: number) =>
          model.measure === 'conversion_rate' ? formatPercentage(value) : formatCompactCount(value)
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
