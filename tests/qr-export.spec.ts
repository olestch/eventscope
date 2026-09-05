import { describe, expect, it, vi } from 'vitest'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import {
  downloadBlob,
  downloadQrSvg,
  rasterizeQrSvg,
  svgBlob,
  type BrowserExportEnvironment,
  type RasterCanvas,
  type RasterImage
} from '~/services/qr/browserExport'

function createEnvironment() {
  const clicked = vi.fn()
  const revoked: string[] = []
  const anchor = { href: '', download: '', click: clicked, remove: vi.fn() }
  const context = { drawImage: vi.fn() }
  const canvas: RasterCanvas = {
    width: 0,
    height: 0,
    getContext: () => context as unknown as CanvasRenderingContext2D,
    toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' }))
  }
  const image = { onload: null, onerror: null, _src: '' } as RasterImage & { _src: string }
  Object.defineProperty(image, 'src', {
    get: () => image._src,
    set: (value: string) => {
      image._src = value
      queueMicrotask(() => image.onload?.(new Event('load')))
    }
  })
  const environment: BrowserExportEnvironment = {
    createObjectURL: vi.fn(() => 'blob:eventscope'),
    revokeObjectURL: (url) => revoked.push(url),
    scheduleCleanup: (callback) => callback(),
    createAnchor: () => anchor,
    createImage: () => image,
    createCanvas: () => canvas
  }
  return { environment, anchor, clicked, revoked, canvas, context }
}

describe('QR browser export adapters', () => {
  it('creates an SVG blob and sanitizes deterministic filenames', () => {
    expect(svgBlob('<svg/>').type).toContain('image/svg+xml')
    expect(sanitizeQrFilename(' Northstar / Harbor: Invite ')).toBe('northstar-harbor-invite-qr')
    expect(sanitizeQrFilename('***')).toBe('eventscope-qr')
  })

  it('triggers an explicit SVG download and always revokes its object URL', () => {
    const { environment, anchor, clicked, revoked } = createEnvironment()
    downloadQrSvg('<svg/>', 'northstar-harbor-qr', environment)
    expect(anchor.download).toBe('northstar-harbor-qr.svg')
    expect(clicked).toHaveBeenCalledOnce()
    expect(revoked).toEqual(['blob:eventscope'])
    expect(anchor.remove).toHaveBeenCalledOnce()
  })

  it('revokes object URLs even when a download click fails', () => {
    const { environment, revoked } = createEnvironment()
    environment.createAnchor = () => ({
      href: '',
      download: '',
      remove: vi.fn(),
      click: () => {
        throw new Error('blocked')
      }
    })
    expect(() => downloadBlob(new Blob(), 'asset.svg', environment)).toThrow('blocked')
    expect(revoked).toEqual(['blob:eventscope'])
  })

  it('rasterizes the canonical SVG at 1024px and cleans up its source URL', async () => {
    const { environment, revoked, canvas, context } = createEnvironment()
    const result = await rasterizeQrSvg('<svg/>', 1024, environment)
    expect(result.type).toBe('image/png')
    expect(canvas.width).toBe(1024)
    expect(canvas.height).toBe(1024)
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(revoked).toEqual(['blob:eventscope'])
  })
})
