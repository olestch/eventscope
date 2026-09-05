import type {
  QrCenterMarkContent,
  QrStudioDraft,
  QrValidationIssue,
  QrValidationResult
} from '~/domain/qr/models'
import { centerMarkGraphemes, qrDesignConstraints } from '~/domain/qr/constraints'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function isCenterMarkContent(value: unknown): value is QrCenterMarkContent {
  if (!value || typeof value !== 'object' || !('type' in value)) return false
  if (value.type === 'eventscope') return true
  return value.type === 'glyph' && 'value' in value && typeof value.value === 'string'
}

function colorChannels(color: string): [number, number, number] | undefined {
  if (!HEX_COLOR.test(color)) return undefined
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16)
  ]
}

function linearChannel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(color: string): number | undefined {
  const channels = colorChannels(color)
  if (!channels) return undefined
  return (
    0.2126 * linearChannel(channels[0]) +
    0.7152 * linearChannel(channels[1]) +
    0.0722 * linearChannel(channels[2])
  )
}

export function contrastRatio(foreground: string, background: string): number | undefined {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  if (first === undefined || second === undefined) return undefined
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

function destinationIssues(destination: string): {
  normalized?: string
  issues: QrValidationIssue[]
} {
  const normalized = destination.trim()
  if (!normalized) {
    return {
      issues: [
        {
          code: 'destination_required',
          severity: 'error',
          field: 'destination',
          message: 'Enter an absolute HTTPS destination.'
        }
      ]
    }
  }

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return {
      issues: [
        {
          code: 'destination_invalid',
          severity: 'error',
          field: 'destination',
          message: 'Use a complete URL such as https://example.com/page.'
        }
      ]
    }
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    return {
      normalized,
      issues: [
        {
          code: 'destination_not_https',
          severity: 'error',
          field: 'destination',
          message: 'The destination must use HTTPS.'
        }
      ]
    }
  }

  if (new TextEncoder().encode(url.href).length > 512) {
    return {
      normalized,
      issues: [
        {
          code: 'destination_too_long',
          severity: 'error',
          field: 'destination',
          message: 'Keep the destination at or below 512 characters for this studio.'
        }
      ]
    }
  }

  return { normalized, issues: [] }
}

export function validateQrDefinition(definition: QrStudioDraft): QrValidationResult {
  const destination = destinationIssues(definition.destination)
  const issues = [...destination.issues]
  const foregrounds = definition.design.gradient.enabled
    ? [definition.design.gradient.startColor, definition.design.gradient.endColor]
    : [definition.design.foreground]
  const ratios = foregrounds.map((color) => contrastRatio(color, definition.design.background))

  if (ratios.some((ratio) => ratio === undefined)) {
    issues.push({
      code: 'color_invalid',
      severity: 'error',
      field: 'color',
      message: 'Colors must use six-digit hexadecimal values.'
    })
  }

  const validRatios = ratios.filter((ratio): ratio is number => ratio !== undefined)
  const minimumContrast = validRatios.length ? Math.min(...validRatios) : undefined
  if (minimumContrast !== undefined && minimumContrast <= 1.05) {
    issues.push({
      code: 'colors_indistinguishable',
      severity: 'error',
      field: 'color',
      message: 'Foreground and background are indistinguishable.'
    })
  } else if (minimumContrast !== undefined && minimumContrast < 3) {
    issues.push({
      code: 'contrast_low',
      severity: 'error',
      field: 'color',
      message: 'Contrast is too low for a dependable QR design.'
    })
  } else if (minimumContrast !== undefined && minimumContrast < 4.5) {
    issues.push({
      code: 'contrast_caution',
      severity: 'warning',
      field: 'color',
      message: 'Increase contrast for more reliable scanning conditions.'
    })
  }

  if (definition.design.margin < qrDesignConstraints.margin.min) {
    issues.push({
      code: 'quiet_zone_missing',
      severity: 'error',
      field: 'margin',
      message: `Use at least ${qrDesignConstraints.margin.min} modules of clear space around the code.`
    })
  } else if (definition.design.margin < qrDesignConstraints.margin.recommended) {
    issues.push({
      code: 'quiet_zone_caution',
      severity: 'warning',
      field: 'margin',
      message: `A ${qrDesignConstraints.margin.recommended}-module quiet zone is recommended.`
    })
  }

  if (definition.design.logo.enabled) {
    const size = definition.design.logo.size
    if (size < qrDesignConstraints.centerMark.size.min) {
      issues.push({
        code: 'logo_too_small',
        severity: 'error',
        field: 'logo',
        message: `Use a center mark of at least ${qrDesignConstraints.centerMark.size.min * 100}% of the code width.`
      })
    } else if (size > qrDesignConstraints.centerMark.size.max) {
      issues.push({
        code: 'logo_too_large',
        severity: 'error',
        field: 'logo',
        message: `Reduce the center mark to ${qrDesignConstraints.centerMark.size.max * 100}% or less of the code width.`
      })
    } else if (size > qrDesignConstraints.centerMark.size.cautionAbove) {
      issues.push({
        code: 'logo_size_caution',
        severity: 'warning',
        field: 'logo',
        message: 'The center mark covers more modules than the recommended default.'
      })
    }

    const content: unknown = definition.design.logo.content
    if (!isCenterMarkContent(content)) {
      issues.push({
        code: 'logo_content_invalid',
        severity: 'error',
        field: 'logo',
        message: 'Choose the EventScope mark or provide one custom character.'
      })
    } else if (content.type === 'glyph') {
      const graphemes = centerMarkGraphemes(content.value)
      if (!graphemes.length) {
        issues.push({
          code: 'logo_glyph_required',
          severity: 'error',
          field: 'logo',
          message: 'Enter one visible character for the center mark.'
        })
      } else if (graphemes.length > 1) {
        issues.push({
          code: 'logo_glyph_too_long',
          severity: 'error',
          field: 'logo',
          message: 'Use only one visible character for the center mark.'
        })
      }
    }
  }

  const valid = !issues.some(({ severity }) => severity === 'error')
  return {
    valid,
    status: valid ? (issues.length ? 'caution' : 'good') : 'poor',
    ...(destination.normalized ? { normalizedDestination: destination.normalized } : {}),
    ...(minimumContrast !== undefined ? { contrastRatio: minimumContrast } : {}),
    issues
  }
}
