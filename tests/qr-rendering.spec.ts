import { describe, expect, it } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { buildQrArtifact, createDefaultQrStudioDraft } from '~/features/qr/studio'
import { encodeQrMatrix } from '~/services/qr/encodeMatrix'
import { renderQrSvg } from '~/services/qr/renderSvg'

const createDraft = () => createDefaultQrStudioDraft(eventDatasetProvider.getCatalog())

describe('QR matrix and canonical SVG renderer', () => {
  it('generates a valid deterministic square matrix for the same destination', () => {
    const first = encodeQrMatrix('https://example.com/campaign')
    const second = encodeQrMatrix('https://example.com/campaign')
    expect(first).toEqual(second)
    expect(first.size).toBeGreaterThanOrEqual(21)
    expect(first.modules).toHaveLength(first.size)
    expect(first.modules.every((row) => row.length === first.size)).toBe(true)
  })

  it.each([
    ['square', '<rect x="'],
    ['rounded', 'rx="0.28"'],
    ['dots', '<circle cx="']
  ] as const)('renders the %s module style structurally', (style, marker) => {
    const draft = createDraft()
    draft.design.moduleStyle = style
    const svg = renderQrSvg(encodeQrMatrix(draft.destination), draft)
    expect(svg).toContain(marker)
  })

  it('renders finder treatment, colors, margin, gradient and built-in logo', () => {
    const draft = createDraft()
    const matrix = encodeQrMatrix(draft.destination)
    const svg = renderQrSvg(matrix, draft)
    expect(svg).toContain('<linearGradient id="qr-gradient-')
    expect(svg).toContain('stop-color="#163f3e"')
    expect(svg).toContain(`viewBox="0 0 ${matrix.size + 8} ${matrix.size + 8}"`)
    expect(svg).toContain('rx="1.15"')
    expect(svg).toContain('<g aria-hidden="true">')
  })

  it('uses stable IDs and produces byte-identical SVG output', () => {
    const draft = createDraft()
    const matrix = encodeQrMatrix(draft.destination)
    const first = renderQrSvg(matrix, draft)
    const second = renderQrSvg(matrix, draft)
    expect(first).toBe(second)
    expect(first).not.toMatch(/random|Date\(|timestamp/i)
  })

  it('escapes user-facing SVG text and never embeds the destination', () => {
    const draft = createDraft()
    draft.name = '<script>alert("x")</script>'
    draft.destination = 'https://example.com/?unsafe=%3Csvg%3E'
    const artifact = buildQrArtifact(draft)!
    expect(artifact.svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(artifact.svg).not.toContain('<script>')
    expect(artifact.svg).not.toContain(draft.destination)
  })

  it('does not build an export artifact for an invalid destination', () => {
    const draft = createDraft()
    draft.destination = 'http://example.com'
    expect(buildQrArtifact(draft)).toBeUndefined()
  })
})
