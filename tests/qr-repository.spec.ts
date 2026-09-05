import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultQrStudioDraft } from '~/features/qr/studio'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { draftToSavedQrInput } from '~/domain/qr/library'
import {
  LocalStorageQrRepository,
  QR_LIBRARY_STORAGE_KEY,
  type QrRepositoryError,
  type QrStorage
} from '~/services/qr/LocalStorageQrRepository'

class MemoryStorage implements QrStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const catalog = eventDatasetProvider.getCatalog()
const input = () => draftToSavedQrInput(createDefaultQrStudioDraft(catalog))

describe('LocalStorageQrRepository', () => {
  let storage: MemoryStorage
  let id = 0
  let tick = 0
  let repository: LocalStorageQrRepository

  beforeEach(() => {
    storage = new MemoryStorage()
    id = 0
    tick = 0
    repository = new LocalStorageQrRepository({
      storage,
      createId: () => `local-${++id}`,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++))
    })
  })

  it('stores a versioned payload and returns defensive copies', async () => {
    const created = await repository.create(input())
    const raw = JSON.parse(storage.getItem(QR_LIBRARY_STORAGE_KEY)!)
    expect(raw).toMatchObject({ version: 1, items: [{ id: 'local-1' }] })
    created.design.foreground = '#ffffff'
    expect((await repository.get(created.id))!.design.foreground).toBe('#07111c')
  })

  it('updates one identity while preserving createdAt and sorting by updatedAt', async () => {
    const first = await repository.create(input())
    const second = await repository.create({ ...input(), name: 'Second QR' })
    const updated = await repository.update(first.id, { ...input(), name: 'Edited QR' })
    expect(updated.createdAt).toBe(first.createdAt)
    expect(updated.updatedAt).not.toBe(first.updatedAt)
    expect((await repository.list()).map(({ id }) => id)).toEqual([first.id, second.id])
  })

  it('duplicates all configuration with unique copy names and deletes explicitly', async () => {
    const source = await repository.create(input())
    const copy = await repository.duplicate(source.id)
    const nextCopy = await repository.duplicate(source.id)
    expect([copy.name, nextCopy.name]).toEqual([`${source.name} copy`, `${source.name} copy 2`])
    expect(copy.design).toEqual(source.design)
    expect(copy.id).not.toBe(source.id)
    await repository.delete(copy.id)
    expect(await repository.get(copy.id)).toBeNull()
  })

  it('ignores corrupt, unsupported and individually invalid stored records', async () => {
    storage.setItem(QR_LIBRARY_STORAGE_KEY, '{bad')
    expect(await repository.list()).toEqual([])
    storage.setItem(QR_LIBRARY_STORAGE_KEY, JSON.stringify({ version: 99, items: [] }))
    expect(await repository.list()).toEqual([])
    const valid = await repository.create(input())
    storage.setItem(
      QR_LIBRARY_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [valid, { id: 'broken' }] })
    )
    expect(await repository.list()).toEqual([valid])
  })

  it('surfaces storage and missing-identity failures with typed errors', async () => {
    const failing = new LocalStorageQrRepository({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota')
        }
      }
    })
    await expect(failing.create(input())).rejects.toMatchObject<QrRepositoryError>({
      code: 'storage_write'
    })
    await expect(repository.update('missing', input())).rejects.toMatchObject<QrRepositoryError>({
      code: 'not_found'
    })
  })
})
