import type { FunnelDefinition } from '~/domain/analytics/contracts'
import type { EventType } from '~/domain/events/models'

export const primaryConversionFunnel = Object.freeze({
  id: 'registration-conversion',
  name: 'Registration journey',
  description: 'Sessions progressing from a page view through registration to conversion.',
  definition: Object.freeze<FunnelDefinition>({
    steps: Object.freeze(['page_view', 'registration', 'conversion']) as EventType[]
  }),
  stepLabels: Object.freeze<Record<EventType, string>>({
    page_view: 'Page view',
    qr_scan: 'QR scan',
    registration: 'Registration',
    check_in: 'Check-in',
    download: 'Download',
    conversion: 'Conversion',
    share: 'Share'
  })
})
