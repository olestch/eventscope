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

const svgNumber = (value: number): string => String(Math.round(value * 10_000) / 10_000)

const isFinderModule = (row: number, column: number, size: number): boolean =>
  (row < 7 && column < 7) || (row < 7 && column >= size - 7) || (row >= size - 7 && column < 7)

export interface QrModuleRect {
  x: number
  y: number
  size: number
}

export interface QrCenterMarkGeometry {
  mark: QrModuleRect
  plate: QrModuleRect
  knockout: QrModuleRect
}

const centeredRect = (matrixSize: number, size: number): QrModuleRect => ({
  x: (matrixSize - size) / 2,
  y: (matrixSize - size) / 2,
  size
})

/** All dimensions are expressed in QR modules, before the quiet-zone offset. */
export function calculateCenterMarkGeometry(
  matrixSize: number,
  configuredSize: number
): QrCenterMarkGeometry {
  const markSize = Math.max(5, matrixSize * configuredSize)
  const plateSize = markSize + 1.2
  const knockoutSize = plateSize + 1.5
  return {
    mark: centeredRect(matrixSize, markSize),
    plate: centeredRect(matrixSize, plateSize),
    knockout: centeredRect(matrixSize, knockoutSize)
  }
}

export function moduleIntersectsRect(row: number, column: number, rectangle: QrModuleRect): boolean {
  return (
    column + 1 > rectangle.x &&
    column < rectangle.x + rectangle.size &&
    row + 1 > rectangle.y &&
    row < rectangle.y + rectangle.size
  )
}

function moduleShape(
  row: number,
  column: number,
  margin: number,
  style: QrStudioDraft['design']['moduleStyle']
): string {
  const x = margin + column
  const y = margin + row
  const moduleAttribute = `data-module="${row},${column}"`
  if (style === 'dots') {
    return `<circle ${moduleAttribute} cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`
  }
  if (style === 'rounded') {
    return `<rect ${moduleAttribute} x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.28"/>`
  }
  return `<rect ${moduleAttribute} x="${x}" y="${y}" width="1" height="1"/>`
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
  const centerGeometry = design.logo.enabled
    ? calculateCenterMarkGeometry(matrix.size, design.logo.size)
    : undefined

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      const intersectsKnockout =
        centerGeometry && moduleIntersectsRect(row, column, centerGeometry.knockout)
      if (
        matrix.modules[row]?.[column] &&
        !isFinderModule(row, column, matrix.size) &&
        !intersectsKnockout
      ) {
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
  const logo = centerGeometry
    ? renderCenterMark(centerGeometry, design.margin, design.background, moduleFill)
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="1024" height="1024" role="img" aria-labelledby="qr-title" shape-rendering="geometricPrecision"><title id="qr-title">${escapeXml(definition.name)} QR code</title>${definitions}<rect width="${totalSize}" height="${totalSize}" fill="${design.background}"/><g fill="${moduleFill}">${modules.join('')}${finders}</g>${logo}</svg>`
}

function renderCenterMark(
  geometry: QrCenterMarkGeometry,
  margin: number,
  background: string,
  markFill: string
): string {
  const mark = {
    ...geometry.mark,
    x: geometry.mark.x + margin,
    y: geometry.mark.y + margin
  }
  const plate = {
    ...geometry.plate,
    x: geometry.plate.x + margin,
    y: geometry.plate.y + margin
  }
  return `<g aria-hidden="true" data-center-mark="true" data-knockout="${svgNumber(geometry.knockout.x)},${svgNumber(geometry.knockout.y)},${svgNumber(geometry.knockout.size)}"><rect data-center-plate="true" x="${svgNumber(plate.x)}" y="${svgNumber(plate.y)}" width="${svgNumber(plate.size)}" height="${svgNumber(plate.size)}" rx="${svgNumber(plate.size * 0.22)}" fill="${background}"/><path data-center-glyph="true" d="M${svgNumber(mark.x + mark.size * 0.28)} ${svgNumber(mark.y + mark.size * 0.3)}h${svgNumber(mark.size * 0.47)}v${svgNumber(mark.size * 0.16)}h-${svgNumber(mark.size * 0.29)}v${svgNumber(mark.size * 0.12)}h${svgNumber(mark.size * 0.25)}v${svgNumber(mark.size * 0.15)}h-${svgNumber(mark.size * 0.25)}v${svgNumber(mark.size * 0.14)}h${svgNumber(mark.size * 0.3)}v${svgNumber(mark.size * 0.16)}h-${svgNumber(mark.size * 0.48)}z" fill="${markFill}"/></g>`
}

export function createQrSvgArtifact(matrix: QrMatrix, definition: QrStudioDraft): QrSvgArtifact {
  const svg = renderQrSvg(matrix, definition)
  return {
    matrix,
    svg,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}
