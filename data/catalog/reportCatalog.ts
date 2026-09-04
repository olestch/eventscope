import type { ReportDefinition } from '~/domain/reports/models'

export const reportCatalog: ReportDefinition[] = [
  {
    id: 'report-northstar-week-one',
    name: 'Northstar launch pulse',
    campaignId: 'cmp-northstar',
    status: 'Ready',
    period: '04–10 Mar 2026',
    owner: 'Maya Chen',
    sections: [
      {
        id: 'overview',
        title: 'Executive overview',
        summary: 'Attendance and scan signals across all launch locations.'
      },
      {
        id: 'locations',
        title: 'Location comparison',
        summary: 'A structured comparison of Harbor, Riverfront and Summit.'
      },
      {
        id: 'next',
        title: 'Next actions',
        summary: 'Questions for the event team to validate in the next cycle.'
      }
    ]
  },
  {
    id: 'report-activation-notes',
    name: 'Activation working notes',
    campaignId: 'cmp-northstar',
    status: 'Draft',
    period: '04–18 Mar 2026',
    owner: 'Theo Grant',
    sections: [
      {
        id: 'overview',
        title: 'Working summary',
        summary: 'A draft structure awaiting reviewed findings.'
      }
    ]
  }
]

export const getReportDefinition = (id: string) => reportCatalog.find((report) => report.id === id)
