export const navigationItems = [
  { label: 'Explore', to: '/explore', shortLabel: 'EX' },
  { label: 'QR studio', to: '/qr', shortLabel: 'QR' },
  { label: 'Reports', to: '/reports', shortLabel: 'RP' },
  { label: 'Methodology', to: '/methodology', shortLabel: 'MT' }
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
