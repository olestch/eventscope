import type { TemporalWeekday } from '~/domain/analytics/contracts'

export const TEMPORAL_HOURS = 24
export const TEMPORAL_CELLS = 7 * TEMPORAL_HOURS

export interface TemporalCoordinates {
  weekday: TemporalWeekday
  hour: number
}

export function temporalCoordinates(timestamp: number): TemporalCoordinates {
  const date = new Date(timestamp)
  return {
    weekday: ((date.getUTCDay() + 6) % 7) as TemporalWeekday,
    hour: date.getUTCHours()
  }
}

export const temporalCellIndex = ({ weekday, hour }: TemporalCoordinates): number =>
  weekday * TEMPORAL_HOURS + hour
