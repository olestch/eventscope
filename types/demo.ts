export type StatusTone = 'positive' | 'attention' | 'neutral' | 'draft'

export interface Campaign {
  id: string
  name: string
  dateRange: string
  status: 'Live' | 'Complete' | 'Draft'
  locationIds: string[]
}

export interface Location {
  id: string
  name: string
  city: string
  region: string
}

export interface QrAsset {
  id: string
  name: string
  campaignId: string
  locationId: string
  destination: string
  scans: number
  status: 'Active' | 'Paused' | 'Draft'
  updatedAt: string
}

export interface ReportSection {
  id: string
  title: string
  summary: string
}

export interface ReportDefinition {
  id: string
  name: string
  campaignId: string
  status: 'Ready' | 'Draft'
  period: string
  owner: string
  sections: ReportSection[]
}

export interface TimelinePoint {
  label: string
  visits: number
  scans: number
}

export interface ExplorerSnapshot {
  campaignId: string
  period: string
  previousPeriod: string
  metrics: Array<{ label: string; value: string; change: string; tone: StatusTone }>
  filters: string[]
  timeline: TimelinePoint[]
  insight: string
}
