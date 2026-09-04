export type UTCDateTime = string
export type EntityId = string

export interface TimeRange {
  start: UTCDateTime
  end: UTCDateTime
}

export interface NamedEntity {
  id: EntityId
  name: string
}
