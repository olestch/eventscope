export type StatusTone = 'positive' | 'attention' | 'neutral' | 'draft'

export interface TimelinePoint {
  label: string
  visits: number
  scans: number
}

/**
 * Temporary presentation-only values retained from Phase 1. They are not
 * computed from source events and will be replaced by Analytics Core results.
 */
export const phaseOneExplorerSnapshot = {
  campaignId: 'cmp-northstar',
  period: '04–18 Mar 2026',
  previousPeriod: '18 Feb–03 Mar 2026',
  metrics: [
    { label: 'Event visits', value: '12,480', change: '+8.4%', tone: 'positive' },
    { label: 'QR scans', value: '3,323', change: '+12.1%', tone: 'positive' },
    { label: 'Scan rate', value: '26.6%', change: '+0.9 pp', tone: 'positive' },
    { label: 'Locations live', value: '3 / 3', change: 'On plan', tone: 'neutral' }
  ] as Array<{ label: string; value: string; change: string; tone: StatusTone }>,
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
  ] as TimelinePoint[],
  insight:
    'Harbor Hall contributes the largest share of scan growth. The 14 March lift aligns with the evening keynote window and should be validated against the event run sheet.'
}

/** Presentation-only card values until Analytics Core supplies derived measures. */
export const phaseOneQrCardMetrics: Record<string, { scans: number; updatedAt: string }> = {
  'qr-harbor-entry': { scans: 1842, updatedAt: '2026-03-12' },
  'qr-river-stage': { scans: 964, updatedAt: '2026-03-11' },
  'qr-summit-lounge': { scans: 517, updatedAt: '2026-03-09' }
}
