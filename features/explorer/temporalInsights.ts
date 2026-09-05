import type { Measure, TemporalHeatmapResult, TemporalWeekday } from '~/domain/analytics/contracts'

export const TEMPORAL_RELATIVE_INSIGHT_THRESHOLD = 0.1
export const TEMPORAL_MIN_COMPARISON_TOTAL = 20

export type TemporalInsight =
  | {
      id: 'peak-window'
      kind: 'peak_window'
      evidence: { weekday: TemporalWeekday; hour: number; value: number }
    }
  | {
      id: 'weekday-weekend'
      kind: 'weekday_weekend'
      evidence: { weekdayAverage: number; weekendAverage: number; relativeDifference: number }
    }
  | {
      id: 'morning-evening'
      kind: 'morning_evening'
      evidence: { morningTotal: number; eveningTotal: number; relativeDifference: number }
    }

const valueFor = (result: TemporalHeatmapResult, measure: Measure, index: number): number =>
  result.cells[index]?.values[measure] ?? 0

const millisecondsPerDay = 24 * 60 * 60 * 1000

function weekdayOccurrences(result: TemporalHeatmapResult): number[] {
  const occurrences = Array.from({ length: 7 }, () => 0)
  const start = Date.parse(result.metadata.query.range.start)
  const end = Date.parse(result.metadata.query.range.end)
  for (let cursor = start; cursor < end; cursor += millisecondsPerDay) {
    const weekday = (new Date(cursor).getUTCDay() + 6) % 7
    occurrences[weekday]! += 1
  }
  return occurrences
}

/** Pure, deterministic summaries of the returned aggregate. No raw events or anomaly scoring. */
export function deriveTemporalInsights(
  result: TemporalHeatmapResult,
  measure: Measure
): TemporalInsight[] {
  const insights: TemporalInsight[] = []
  let peakIndex = 0
  for (let index = 1; index < result.cells.length; index += 1) {
    if (valueFor(result, measure, index) > valueFor(result, measure, peakIndex)) peakIndex = index
  }
  const peak = result.cells[peakIndex]
  const peakValue = valueFor(result, measure, peakIndex)
  if (peak && peakValue > 0) {
    insights.push({
      id: 'peak-window',
      kind: 'peak_window',
      evidence: { weekday: peak.weekday, hour: peak.hour, value: peakValue }
    })
  }

  // Rates are not additive. Comparing their cell sums or averages would invent semantics.
  if (measure === 'conversion_rate') return insights

  let weekdayTotal = 0
  let weekendTotal = 0
  let morningTotal = 0
  let eveningTotal = 0
  for (let index = 0; index < result.cells.length; index += 1) {
    const cell = result.cells[index]!
    const value = valueFor(result, measure, index)
    if (cell.weekday < 5) weekdayTotal += value
    else weekendTotal += value
    if (cell.hour >= 6 && cell.hour < 12) morningTotal += value
    if (cell.hour >= 18) eveningTotal += value
  }

  const occurrences = weekdayOccurrences(result)
  const weekdayDays = occurrences.slice(0, 5).reduce((total, count) => total + count, 0)
  const weekendDays = occurrences.slice(5).reduce((total, count) => total + count, 0)
  const weekdayAverage = weekdayDays ? weekdayTotal / weekdayDays : 0
  const weekendAverage = weekendDays ? weekendTotal / weekendDays : 0
  if (
    weekdayDays > 0 &&
    weekendDays > 0 &&
    weekdayAverage > 0 &&
    weekdayTotal + weekendTotal >= TEMPORAL_MIN_COMPARISON_TOTAL
  ) {
    const relativeDifference = (weekendAverage - weekdayAverage) / weekdayAverage
    if (
      Number.isFinite(relativeDifference) &&
      Math.abs(relativeDifference) >= TEMPORAL_RELATIVE_INSIGHT_THRESHOLD
    ) {
      insights.push({
        id: 'weekday-weekend',
        kind: 'weekday_weekend',
        evidence: { weekdayAverage, weekendAverage, relativeDifference }
      })
    }
  }

  if (morningTotal > 0 && morningTotal + eveningTotal >= TEMPORAL_MIN_COMPARISON_TOTAL) {
    const relativeDifference = (eveningTotal - morningTotal) / morningTotal
    if (
      Number.isFinite(relativeDifference) &&
      Math.abs(relativeDifference) >= TEMPORAL_RELATIVE_INSIGHT_THRESHOLD
    ) {
      insights.push({
        id: 'morning-evening',
        kind: 'morning_evening',
        evidence: { morningTotal, eveningTotal, relativeDifference }
      })
    }
  }
  return insights
}
