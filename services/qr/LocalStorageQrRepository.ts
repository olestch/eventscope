import {
  qrFinderStyles,
  qrGradientDirections,
  qrModuleStyles,
  type QrDesignConfig,
  type QrStudioDraft
} from '~/domain/qr/models'
import {
  draftToSavedQrInput,
  savedQrToDraft,
  type CreateSavedQrInput,
  type QrRepository,
  type SavedQrCode,
  type UpdateSavedQrInput
} from '~/domain/qr/library'
import { validateQrDefinition } from '~/domain/qr/validation'

export const QR_LIBRARY_STORAGE_KEY = 'eventscope:qr-library'
export const QR_LIBRARY_STORAGE_VERSION = 1 as const

export type QrRepositoryErrorCode =
  'storage_read' | 'storage_write' | 'invalid_input' | 'not_found' | 'id_unavailable'

export class QrRepositoryError extends Error {
  constructor(
    public readonly code: QrRepositoryErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'QrRepositoryError'
  }
}

export interface QrStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredQrLibraryV1 {
  version: typeof QR_LIBRARY_STORAGE_VERSION
  items: SavedQrCode[]
}

interface LocalStorageQrRepositoryOptions {
  storage?: QrStorage | (() => QrStorage)
  now?: () => Date
  createId?: () => string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isIsoUtc = (value: unknown): value is string => {
  if (!isString(value)) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function isQrDesignConfig(value: unknown): value is QrDesignConfig {
  if (!isRecord(value) || !isRecord(value.gradient) || !isRecord(value.logo)) return false
  const content = value.logo.content
  const validContent =
    isRecord(content) &&
    (content.type === 'eventscope' || (content.type === 'glyph' && typeof content.value === 'string'))
  return (
    typeof value.foreground === 'string' &&
    typeof value.background === 'string' &&
    qrModuleStyles.includes(value.moduleStyle as (typeof qrModuleStyles)[number]) &&
    qrFinderStyles.includes(value.finderStyle as (typeof qrFinderStyles)[number]) &&
    typeof value.margin === 'number' &&
    Number.isFinite(value.margin) &&
    typeof value.gradient.enabled === 'boolean' &&
    typeof value.gradient.startColor === 'string' &&
    typeof value.gradient.endColor === 'string' &&
    qrGradientDirections.includes(value.gradient.direction as (typeof qrGradientDirections)[number]) &&
    typeof value.logo.enabled === 'boolean' &&
    typeof value.logo.size === 'number' &&
    Number.isFinite(value.logo.size) &&
    validContent
  )
}

function parsedSavedQr(value: unknown): SavedQrCode | undefined {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !value.id ||
    !isString(value.name) ||
    !value.name.trim() ||
    !isString(value.campaignId) ||
    !value.campaignId ||
    !isString(value.channelId) ||
    !value.channelId ||
    (value.locationId !== undefined && !isString(value.locationId)) ||
    !isString(value.destination) ||
    !isQrDesignConfig(value.design) ||
    !isIsoUtc(value.createdAt) ||
    !isIsoUtc(value.updatedAt)
  ) {
    return undefined
  }
  const candidate: SavedQrCode = {
    id: value.id,
    name: value.name,
    campaignId: value.campaignId,
    channelId: value.channelId,
    ...(value.locationId ? { locationId: value.locationId } : {}),
    destination: value.destination,
    design: value.design,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
  return validateQrDefinition(savedQrToDraft(candidate)).valid ? cloneSavedQr(candidate) : undefined
}

function cloneSavedQr(saved: SavedQrCode): SavedQrCode {
  return {
    id: saved.id,
    ...draftToSavedQrInput(savedQrToDraft(saved)),
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt
  }
}

function createRandomId(): string {
  const cryptography = globalThis.crypto
  if (typeof cryptography?.randomUUID === 'function') return cryptography.randomUUID()
  if (typeof cryptography?.getRandomValues !== 'function') {
    throw new QrRepositoryError('id_unavailable', 'A secure local ID could not be generated.')
  }
  const bytes = cryptography.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  )
}

const sortSavedQr = (items: SavedQrCode[]): SavedQrCode[] =>
  [...items].sort(
    (first, second) =>
      second.updatedAt.localeCompare(first.updatedAt) || first.id.localeCompare(second.id)
  )

function duplicateName(name: string, items: SavedQrCode[]): string {
  const base = name.replace(/ copy(?: \d+)?$/i, '')
  const names = new Set(items.map((item) => item.name.toLocaleLowerCase()))
  if (!names.has((base + ' copy').toLocaleLowerCase())) return base + ' copy'
  let suffix = 2
  while (names.has((base + ' copy ' + suffix).toLocaleLowerCase())) suffix += 1
  return base + ' copy ' + suffix
}

export class LocalStorageQrRepository implements QrRepository {
  private readonly storageSource: QrStorage | (() => QrStorage)
  private readonly now: () => Date
  private readonly createId: () => string

  constructor(options: LocalStorageQrRepositoryOptions = {}) {
    this.storageSource = options.storage ?? (() => window.localStorage)
    this.now = options.now ?? (() => new Date())
    this.createId = options.createId ?? createRandomId
  }

  async list(): Promise<SavedQrCode[]> {
    return sortSavedQr(this.read()).map(cloneSavedQr)
  }

  async get(id: string): Promise<SavedQrCode | null> {
    const item = this.read().find((candidate) => candidate.id === id)
    return item ? cloneSavedQr(item) : null
  }

  async create(input: CreateSavedQrInput): Promise<SavedQrCode> {
    const items = this.read()
    const normalized = this.validateInput(input)
    const id = this.createId()
    if (!id || items.some((item) => item.id === id)) {
      throw new QrRepositoryError('id_unavailable', 'A unique local QR ID could not be generated.')
    }
    const timestamp = this.now().toISOString()
    const created: SavedQrCode = {
      id,
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    this.write([...items, created])
    return cloneSavedQr(created)
  }

  async update(id: string, input: UpdateSavedQrInput): Promise<SavedQrCode> {
    const items = this.read()
    const index = items.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new QrRepositoryError('not_found', 'This saved QR no longer exists in this browser.')
    }
    const current = items[index]!
    const updated: SavedQrCode = {
      id: current.id,
      ...this.validateInput(input),
      createdAt: current.createdAt,
      updatedAt: this.now().toISOString()
    }
    items[index] = updated
    this.write(items)
    return cloneSavedQr(updated)
  }

  async duplicate(id: string): Promise<SavedQrCode> {
    const items = this.read()
    const source = items.find((item) => item.id === id)
    if (!source) {
      throw new QrRepositoryError('not_found', 'This saved QR no longer exists in this browser.')
    }
    return this.create({
      ...draftToSavedQrInput(savedQrToDraft(source)),
      name: duplicateName(source.name, items)
    })
  }

  async delete(id: string): Promise<void> {
    const items = this.read()
    this.write(items.filter((item) => item.id !== id))
  }

  private resolveStorage(): QrStorage {
    return typeof this.storageSource === 'function' ? this.storageSource() : this.storageSource
  }

  private read(): SavedQrCode[] {
    let raw: string | null
    try {
      raw = this.resolveStorage().getItem(QR_LIBRARY_STORAGE_KEY)
    } catch (error) {
      throw new QrRepositoryError('storage_read', 'Saved QR codes are unavailable in this browser.', {
        cause: error
      })
    }
    if (!raw) return []
    try {
      const payload: unknown = JSON.parse(raw)
      if (
        !isRecord(payload) ||
        payload.version !== QR_LIBRARY_STORAGE_VERSION ||
        !Array.isArray(payload.items)
      ) {
        return []
      }
      return payload.items.flatMap((item) => {
        const parsed = parsedSavedQr(item)
        return parsed ? [parsed] : []
      })
    } catch {
      return []
    }
  }

  private write(items: SavedQrCode[]): void {
    const payload: StoredQrLibraryV1 = {
      version: QR_LIBRARY_STORAGE_VERSION,
      items: sortSavedQr(items).map(cloneSavedQr)
    }
    try {
      this.resolveStorage().setItem(QR_LIBRARY_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      throw new QrRepositoryError('storage_write', 'The QR could not be saved in this browser.', {
        cause: error
      })
    }
  }

  private validateInput(input: CreateSavedQrInput): CreateSavedQrInput {
    const draft: QrStudioDraft = {
      id: 'local-persistence-validation',
      ...input
    }
    const validation = validateQrDefinition(draft)
    if (!input.name.trim() || !validation.valid || !validation.normalizedDestination) {
      throw new QrRepositoryError('invalid_input', 'Only a valid named QR can be saved.')
    }
    return draftToSavedQrInput({
      ...draft,
      destination: validation.normalizedDestination
    })
  }
}

export const createBrowserQrRepository = (): QrRepository => new LocalStorageQrRepository()
