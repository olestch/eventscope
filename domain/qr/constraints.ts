export const qrDesignConstraints = {
  margin: {
    min: 2,
    max: 8,
    step: 1,
    recommended: 4
  },
  centerMark: {
    size: {
      min: 0.12,
      max: 0.2,
      step: 0.01,
      cautionAbove: 0.17,
      default: 0.16
    },
    geometry: {
      minimumBadgeModules: 5,
      badgePaddingModules: 0.6,
      glyphScale: 0.72,
      knockoutClearanceModules: 1,
      outlineWidthModules: 0.28,
      cornerRadiusModules: 0.6
    }
  }
} as const

const graphemeSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined

export function centerMarkGraphemes(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  const graphemes = graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(trimmed), ({ segment }) => segment)
    : Array.from(trimmed)
  return graphemes.filter((grapheme) => /[^\p{White_Space}\p{Cc}\p{Cf}]/u.test(grapheme))
}

export function normalizedCenterMarkGlyph(value: string): string | undefined {
  const graphemes = centerMarkGraphemes(value)
  return graphemes.length === 1 ? graphemes[0] : undefined
}
