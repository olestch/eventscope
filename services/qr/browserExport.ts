export interface DownloadAnchor {
  href: string
  download: string
  click(): void
  remove(): void
}

export interface RasterImage {
  src: string
  onload: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
}

export interface RasterCanvas {
  width: number
  height: number
  getContext(type: '2d'): CanvasRenderingContext2D | null
  toBlob(callback: (blob: Blob | null) => void, type: string): void
}

export interface BrowserExportEnvironment {
  createObjectURL(blob: Blob): string
  revokeObjectURL(url: string): void
  scheduleCleanup(callback: () => void): void
  createAnchor(): DownloadAnchor
  createImage(): RasterImage
  createCanvas(): RasterCanvas
}

function defaultEnvironment(): BrowserExportEnvironment {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    scheduleCleanup: (callback) => window.setTimeout(callback, 0),
    createAnchor: () => {
      const anchor = document.createElement('a')
      anchor.hidden = true
      document.body.append(anchor)
      return anchor
    },
    createImage: () => new Image(),
    createCanvas: () => document.createElement('canvas')
  }
}

export function svgBlob(svg: string): Blob {
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
}

export function downloadBlob(
  blob: Blob,
  filename: string,
  environment: BrowserExportEnvironment = defaultEnvironment()
): void {
  const url = environment.createObjectURL(blob)
  let anchor: DownloadAnchor | undefined
  try {
    anchor = environment.createAnchor()
    anchor.href = url
    anchor.download = filename
    anchor.click()
  } finally {
    // Browsers may not claim a download before the current task completes.
    // Keep the URL alive for that task, then revoke it deterministically.
    environment.scheduleCleanup(() => {
      anchor?.remove()
      environment.revokeObjectURL(url)
    })
  }
}

export function downloadQrSvg(
  svg: string,
  filename: string,
  environment?: BrowserExportEnvironment
): void {
  downloadBlob(svgBlob(svg), `${filename}.svg`, environment)
}

export async function rasterizeQrSvg(
  svg: string,
  size = 1024,
  environment: BrowserExportEnvironment = defaultEnvironment()
): Promise<Blob> {
  const sourceUrl = environment.createObjectURL(svgBlob(svg))
  try {
    const image = environment.createImage()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The SVG preview could not be rasterized.'))
      image.src = sourceUrl
    })
    const canvas = environment.createCanvas()
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas export is unavailable in this browser.')
    context.drawImage(image as CanvasImageSource, 0, 0, size, size)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))),
        'image/png'
      )
    })
  } finally {
    environment.revokeObjectURL(sourceUrl)
  }
}

export async function downloadQrPng(
  svg: string,
  filename: string,
  environment?: BrowserExportEnvironment
): Promise<void> {
  const png = await rasterizeQrSvg(svg, 1024, environment)
  downloadBlob(png, `${filename}.png`, environment)
}
