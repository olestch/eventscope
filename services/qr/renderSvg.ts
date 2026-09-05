import type { QrMatrix, QrStudioDraft, QrSvgArtifact } from '~/domain/qr/models'

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    }
    return entities[character]!
  })

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const isFinderModule = (row: number, column: number, size: number): boolean =>
  (row < 7 && column < 7) || (row < 7 && column >= size - 7) || (row >= size - 7 && column < 7)

function moduleShape(
  row: number,
  column: number,
  margin: number,
  style: QrStudioDraft['design']['moduleStyle']
): string {
  const x = margin + column
  const y = margin + row
  if (style === 'dots') return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`
  if (style === 'rounded') {
    return `<rect x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.28"/>`
  }
  return `<rect x="${x}" y="${y}" width="1" height="1"/>`
}

function finderShape(x: number, y: number, rounded: boolean, background: string): string {
  const outerRadius = rounded ? '1.15' : '0'
  const middleRadius = rounded ? '0.78' : '0'
  const innerRadius = rounded ? '0.62' : '0'
  return [
    `<rect x="${x}" y="${y}" width="7" height="7" rx="${outerRadius}"/>`,
    `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="${middleRadius}" fill="${background}"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${innerRadius}"/>`
  ].join('')
}

function gradientVector(direction: QrStudioDraft['design']['gradient']['direction']): string {
  if (direction === 'horizontal') return 'x1="0%" y1="50%" x2="100%" y2="50%"'
  if (direction === 'vertical') return 'x1="50%" y1="0%" x2="50%" y2="100%"'
  return 'x1="0%" y1="0%" x2="100%" y2="100%"'
}

export function renderQrSvg(matrix: QrMatrix, definition: QrStudioDraft): string {
  const { design } = definition
  const totalSize = matrix.size + design.margin * 2
  const gradientId = `qr-gradient-${stableHash(
    `${design.gradient.startColor}|${design.gradient.endColor}|${design.gradient.direction}`
  )}`
  const moduleFill = design.gradient.enabled ? `url(#${gradientId})` : design.foreground
  const definitions = design.gradient.enabled
    ? `<defs><linearGradient id="${gradientId}" ${gradientVector(design.gradient.direction)}><stop offset="0%" stop-color="${design.gradient.startColor}"/><stop offset="100%" stop-color="${design.gradient.endColor}"/></linearGradient></defs>`
    : ''
  const modules: string[] = []

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row]?.[column] && !isFinderModule(row, column, matrix.size)) {
        modules.push(moduleShape(row, column, design.margin, design.moduleStyle))
      }
    }
  }

  const finderStarts = [
    [design.margin, design.margin],
    [design.margin + matrix.size - 7, design.margin],
    [design.margin, design.margin + matrix.size - 7]
  ] as const
  const finders = finderStarts
    .map(([x, y]) => finderShape(x, y, design.finderStyle === 'rounded', design.background))
    .join('')
  const logoSize = Math.max(5, matrix.size * design.logo.size)
  const logoOrigin = design.margin + (matrix.size - logoSize) / 2
  const logo = design.logo.enabled
    ? `<g aria-hidden="true"><rect x="${logoOrigin}" y="${logoOrigin}" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.24}" fill="${design.background}"/><path d="M${logoOrigin + logoSize * 0.28} ${logoOrigin + logoSize * 0.3}h${logoSize * 0.47}v${logoSize * 0.16}h-${logoSize * 0.29}v${logoSize * 0.12}h${logoSize * 0.25}v${logoSize * 0.15}h-${logoSize * 0.25}v${logoSize * 0.14}h${logoSize * 0.3}v${logoSize * 0.16}h-${logoSize * 0.48}z" fill="${moduleFill}"/></g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="1024" height="1024" role="img" aria-labelledby="qr-title" shape-rendering="geometricPrecision"><title id="qr-title">${escapeXml(definition.name)} QR code</title>${definitions}<rect width="${totalSize}" height="${totalSize}" fill="${design.background}"/><g fill="${moduleFill}">${modules.join('')}${finders}</g>${logo}</svg>`
}

export function createQrSvgArtifact(matrix: QrMatrix, definition: QrStudioDraft): QrSvgArtifact {
  const svg = renderQrSvg(matrix, definition)
  return {
    matrix,
    svg,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}
