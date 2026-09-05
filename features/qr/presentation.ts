import type { QrStudioDraft, QrValidationResult } from '~/domain/qr/models'

export const qrModuleStyleLabels: Record<QrStudioDraft['design']['moduleStyle'], string> = {
  square: 'Square',
  rounded: 'Rounded',
  dots: 'Dots'
}

export const qrFinderStyleLabels: Record<QrStudioDraft['design']['finderStyle'], string> = {
  square: 'Square',
  rounded: 'Rounded'
}

export const qrGradientDirectionLabels: Record<
  QrStudioDraft['design']['gradient']['direction'],
  string
> = {
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  diagonal: 'Diagonal'
}

export const qrQualityLabels: Record<QrValidationResult['status'], string> = {
  good: 'Good',
  caution: 'Caution',
  poor: 'Poor'
}

export function sanitizeQrFilename(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${normalized || 'eventscope'}-qr`
}
