export const qrModuleStyles = ['square', 'rounded', 'dots'] as const
export type QrModuleStyle = (typeof qrModuleStyles)[number]

export const qrFinderStyles = ['square', 'rounded'] as const
export type QrFinderStyle = (typeof qrFinderStyles)[number]

export const qrGradientDirections = ['horizontal', 'vertical', 'diagonal'] as const
export type QrGradientDirection = (typeof qrGradientDirections)[number]

export interface QrGradientConfig {
  enabled: boolean
  startColor: string
  endColor: string
  direction: QrGradientDirection
}

export type QrCenterMarkContent = { type: 'eventscope' } | { type: 'glyph'; value: string }

export interface QrLogoConfig {
  enabled: boolean
  /** Fraction of the QR matrix width occupied by the badge. */
  size: number
  content: QrCenterMarkContent
}

export interface QrDesignConfig {
  foreground: string
  background: string
  moduleStyle: QrModuleStyle
  finderStyle: QrFinderStyle
  /** Quiet-zone width in QR modules. */
  margin: number
  gradient: QrGradientConfig
  logo: QrLogoConfig
}

/**
 * Mutable editor state, deliberately separate from the immutable historical
 * QRCodeDefinition used by the generated analytics scenario.
 */
export interface QrStudioDraft {
  id: string
  name: string
  campaignId: string
  channelId: string
  locationId?: string
  destination: string
  design: QrDesignConfig
}

export type QrValidationSeverity = 'warning' | 'error'
export type QrValidationIssueCode =
  | 'destination_required'
  | 'destination_invalid'
  | 'destination_not_https'
  | 'destination_too_long'
  | 'color_invalid'
  | 'colors_indistinguishable'
  | 'contrast_low'
  | 'contrast_caution'
  | 'quiet_zone_missing'
  | 'quiet_zone_caution'
  | 'logo_too_small'
  | 'logo_too_large'
  | 'logo_size_caution'
  | 'logo_content_invalid'
  | 'logo_glyph_required'
  | 'logo_glyph_too_long'

export interface QrValidationIssue {
  code: QrValidationIssueCode
  severity: QrValidationSeverity
  message: string
  field?: 'destination' | 'color' | 'margin' | 'logo'
}

export interface QrValidationResult {
  valid: boolean
  status: 'good' | 'caution' | 'poor'
  normalizedDestination?: string
  contrastRatio?: number
  issues: QrValidationIssue[]
}

export interface QrMatrix {
  size: number
  modules: boolean[][]
}

export interface QrSvgArtifact {
  matrix: QrMatrix
  svg: string
  dataUri: string
}
