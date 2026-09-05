import { describe, expect, it } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { buildQrArtifact, createDefaultQrStudioDraft } from '~/features/qr/studio'
import { encodeQrMatrix } from '~/services/qr/encodeMatrix'
import { calculateCenterMarkGeometry, moduleIntersectsRect, renderQrSvg } from '~/services/qr/renderSvg'
import type { QrMatrix } from '~/domain/qr/models'

const createDraft = () => createDefaultQrStudioDraft(eventDatasetProvider.getCatalog())
const solidMatrix = (size = 21): QrMatrix => ({
  size,
  modules: Array.from({ length: size }, () => Array.from({ length: size }, () => true))
})
const renderedModules = (svg: string): Array<[number, number]> =>
  [...svg.matchAll(/data-module="(\d+),(\d+)"/g)].map((match) => [Number(match[1]), Number(match[2])])
const isFinder = (row: number, column: number, size: number): boolean =>
  (row < 7 && column < 7) || (row < 7 && column >= size - 7) || (row >= size - 7 && column < 7)

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
    ['square', 'width="1" height="1"'],
    ['rounded', 'rx="0.28"'],
    ['dots', 'r="0.42"']
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
    expect(svg).toContain('<g aria-hidden="true" data-center-mark="true"')
  })

  it('uses stable IDs and produces byte-identical SVG output', () => {
    const draft = createDraft()
    const matrix = encodeQrMatrix(draft.destination)
    const first = renderQrSvg(matrix, draft)
    const second = renderQrSvg(matrix, draft)
    expect(first).toBe(second)
    expect(first).not.toMatch(/random|Date\(|timestamp/i)
  })

  it('renders every non-finder matrix module and no center hole when the mark is off', () => {
    const draft = createDraft()
    const matrix = solidMatrix()
    draft.design.logo.enabled = false
    const svg = renderQrSvg(matrix, draft)
    const modules = renderedModules(svg)
    const expectedCount = matrix.modules
      .flatMap((row, rowIndex) => row.map((dark, columnIndex) => ({ dark, rowIndex, columnIndex })))
      .filter(
        ({ dark, rowIndex, columnIndex }) => dark && !isFinder(rowIndex, columnIndex, matrix.size)
      ).length

    expect(modules).toHaveLength(expectedCount)
    expect(modules).toContainEqual([10, 10])
    expect(svg).not.toContain('data-center-mark')
  })

  it('skips whole modules in the center knockout while preserving modules outside it', () => {
    const draft = createDraft()
    const matrix = solidMatrix()
    const geometry = calculateCenterMarkGeometry(matrix.size, draft.design.logo.size)
    const svg = renderQrSvg(matrix, draft)
    const modules = renderedModules(svg)

    expect(modules).not.toContainEqual([10, 10])
    expect(modules).toContainEqual([10, 2])
    expect(modules.every(([row, column]) => !moduleIntersectsRect(row, column, geometry.knockout))).toBe(
      true
    )
    expect(svg).not.toMatch(/clip-path|<clipPath|<mask/i)
  })

  it('keeps mark, plate and knockout separate and scales the geometry predictably', () => {
    const small = calculateCenterMarkGeometry(41, 0.12)
    const large = calculateCenterMarkGeometry(41, 0.2)

    expect(small.mark.size).toBeLessThan(small.plate.size)
    expect(small.plate.size).toBeLessThan(small.knockout.size)
    expect(small.plate.x).toBeLessThan(small.mark.x)
    expect(small.knockout.x).toBeLessThan(small.plate.x)
    expect(small.mark.size).toBe(5)
    expect(large.mark.size).toBeCloseTo(41 * 0.2)
    expect(large.knockout.size - small.knockout.size).toBeCloseTo(large.mark.size - small.mark.size)
  })

  it('uses the corrected canonical SVG as the preview data URI', () => {
    const artifact = buildQrArtifact(createDraft())!
    expect(decodeURIComponent(artifact.dataUri.split(',')[1]!)).toBe(artifact.svg)
    expect(artifact.svg).toContain('data-knockout=')
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
