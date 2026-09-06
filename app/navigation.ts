export const navigationItems = [
  { labelKey: 'explore', to: '/explore', shortLabel: 'EX' },
  { labelKey: 'qr', to: '/qr', shortLabel: 'QR' },
  { labelKey: 'reports', to: '/reports', shortLabel: 'RP' },
  { labelKey: 'methodology', to: '/methodology', shortLabel: 'MT' }
] as const

export const routeCatalog = [
  '/explore',
  '/qr',
  '/qr/new',
  '/qr/:id',
  '/reports',
  '/reports/new',
  '/reports/:id',
  '/methodology'
] as const
