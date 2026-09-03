import type { Campaign, ExplorerSnapshot, Location, QrAsset, ReportDefinition } from '~/types/demo'

export const locations: Location[] = [
  { id: 'loc-harbor', name: 'Harbor Hall', city: 'Portland', region: 'Northwest' },
  { id: 'loc-river', name: 'Riverfront Lab', city: 'Austin', region: 'South' },
  { id: 'loc-summit', name: 'Summit Annex', city: 'Denver', region: 'Mountain' }
]

export const campaigns: Campaign[] = [
  {
    id: 'cmp-northstar',
    name: 'Northstar Launch',
    dateRange: '04–18 Mar 2026',
    status: 'Live',
    locationIds: locations.map((location) => location.id)
  },
  {
    id: 'cmp-orbit',
    name: 'Orbit Partner Preview',
    dateRange: '10–21 Feb 2026',
    status: 'Complete',
    locationIds: ['loc-harbor', 'loc-river']
  }
]

export const qrAssets: QrAsset[] = [
  {
    id: 'qr-harbor-entry',
    name: 'Harbor entry card',
    campaignId: 'cmp-northstar',
    locationId: 'loc-harbor',
    destination: 'eventscope.demo/northstar/harbor',
    scans: 1842,
    status: 'Active',
    updatedAt: '2026-03-12'
  },
  {
    id: 'qr-river-stage',
    name: 'Riverfront stage sign',
    campaignId: 'cmp-northstar',
    locationId: 'loc-river',
    destination: 'eventscope.demo/northstar/river',
    scans: 964,
    status: 'Active',
    updatedAt: '2026-03-11'
  },
  {
    id: 'qr-summit-lounge',
    name: 'Summit lounge placard',
    campaignId: 'cmp-northstar',
    locationId: 'loc-summit',
    destination: 'eventscope.demo/northstar/summit',
    scans: 517,
    status: 'Paused',
    updatedAt: '2026-03-09'
  }
]

export const reports: ReportDefinition[] = [
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

export const explorerSnapshot: ExplorerSnapshot = {
  campaignId: 'cmp-northstar',
  period: '04–18 Mar 2026',
  previousPeriod: '18 Feb–03 Mar 2026',
  metrics: [
    { label: 'Event visits', value: '12,480', change: '+8.4%', tone: 'positive' },
    { label: 'QR scans', value: '3,323', change: '+12.1%', tone: 'positive' },
    { label: 'Scan rate', value: '26.6%', change: '+0.9 pp', tone: 'positive' },
    { label: 'Locations live', value: '3 / 3', change: 'On plan', tone: 'neutral' }
  ],
  filters: ['Northstar Launch', 'All locations', 'Daily', 'vs previous period'],
  timeline: [
    { label: '04 Mar', visits: 42, scans: 18 },
    { label: '06 Mar', visits: 54, scans: 23 },
    { label: '08 Mar', visits: 48, scans: 21 },
    { label: '10 Mar', visits: 72, scans: 36 },
    { label: '12 Mar', visits: 64, scans: 31 },
    { label: '14 Mar', visits: 86, scans: 44 },
    { label: '16 Mar', visits: 75, scans: 39 },
    { label: '18 Mar', visits: 92, scans: 47 }
  ],
  insight:
    'Harbor Hall contributes the largest share of scan growth. The 14 March lift aligns with the evening keynote window and should be validated against the event run sheet.'
}

export const getCampaign = (id: string) => campaigns.find((campaign) => campaign.id === id)
export const getLocation = (id: string) => locations.find((location) => location.id === id)
export const getQrAsset = (id: string) => qrAssets.find((asset) => asset.id === id)
export const getReport = (id: string) => reports.find((report) => report.id === id)
