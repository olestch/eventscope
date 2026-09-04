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
