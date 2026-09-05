import { describe, expect, it } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { qrDesignConstraints } from '~/domain/qr/constraints'
import { contrastRatio, validateQrDefinition } from '~/domain/qr/validation'
import { createDefaultQrStudioDraft } from '~/features/qr/studio'

const createDraft = () => createDefaultQrStudioDraft(eventDatasetProvider.getCatalog())

describe('QR definition validation', () => {
  it('accepts the polished default with a strong calculated contrast', () => {
    const result = validateQrDefinition(createDraft())
    expect(result).toMatchObject({ valid: true, status: 'good' })
    expect(result.contrastRatio).toBeGreaterThan(7)
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
  })

  it('trims a valid HTTPS destination without rewriting it', () => {
    const draft = createDraft()
    draft.destination = '  https://example.com/Path?q=Keep%20Me  '
    expect(validateQrDefinition(draft).normalizedDestination).toBe(
      'https://example.com/Path?q=Keep%20Me'
    )
  })

  it.each(['', 'example.com', 'http://example.com', 'not a url'])('rejects destination %j', (value) => {
    const draft = createDraft()
    draft.destination = value
    const result = validateQrDefinition(draft)
    expect(result.valid).toBe(false)
    expect(
      result.issues.some(({ field, severity }) => field === 'destination' && severity === 'error')
    ).toBe(true)
  })

  it('rejects an encoded destination that exceeds the Studio capacity guard', () => {
    const draft = createDraft()
    draft.destination = `https://example.com/${'é'.repeat(200)}`
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('destination_too_long')
  })

  it('reports weak and indistinguishable color combinations', () => {
    const draft = createDraft()
    draft.design.gradient.enabled = false
    draft.design.foreground = '#777777'
    draft.design.background = '#888888'
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('contrast_low')
    draft.design.foreground = '#888888'
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain(
      'colors_indistinguishable'
    )
  })

  it('warns about a reduced quiet zone and excessive logo coverage', () => {
    const draft = createDraft()
    draft.design.margin = 3
    draft.design.logo.size = 0.18
    const result = validateQrDefinition(draft)
    expect(result).toMatchObject({ valid: true, status: 'caution' })
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['quiet_zone_caution', 'logo_size_caution'])
    )
    draft.design.margin = 0
    draft.design.logo.size = 0.22
    expect(validateQrDefinition(draft).valid).toBe(false)
  })

  it('keeps warning thresholds usable while rejecting programmatic size violations', () => {
    const draft = createDraft()
    draft.design.margin = qrDesignConstraints.margin.min
    draft.design.logo.size = 0.18
    expect(validateQrDefinition(draft)).toMatchObject({ valid: true, status: 'caution' })

    draft.design.margin = qrDesignConstraints.margin.min - 1
    draft.design.logo.size = qrDesignConstraints.centerMark.size.min - 0.01
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['quiet_zone_missing', 'logo_too_small'])
    )

    draft.design.margin = qrDesignConstraints.margin.recommended
    draft.design.logo.size = qrDesignConstraints.centerMark.size.max + 0.01
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('logo_too_large')
  })

  it('accepts one trimmed Unicode grapheme and rejects empty or excess custom content', () => {
    const draft = createDraft()
    draft.design.logo.content = { type: 'glyph', value: ' 👩‍💻 ' }
    expect(validateQrDefinition(draft).valid).toBe(true)

    draft.design.logo.content = { type: 'glyph', value: '  ' }
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('logo_glyph_required')

    draft.design.logo.content = { type: 'glyph', value: '\u200b' }
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('logo_glyph_required')

    draft.design.logo.content = { type: 'glyph', value: 'AB' }
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('logo_glyph_too_long')

    draft.design.logo.content = { type: 'glyph' } as typeof draft.design.logo.content
    expect(validateQrDefinition(draft).issues.map(({ code }) => code)).toContain('logo_content_invalid')
  })
})
