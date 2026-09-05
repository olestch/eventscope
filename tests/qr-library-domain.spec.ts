import { describe, expect, it } from 'vitest'
import { useQrStudio } from '~/composables/useQrStudio'
import {
  draftToSavedQrInput,
  savedQrToDraft,
  type QrRepository,
  type SavedQrCode
} from '~/domain/qr/library'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createDefaultQrStudioDraft } from '~/features/qr/studio'

const draft = createDefaultQrStudioDraft(eventDatasetProvider.getCatalog())
const saved: SavedQrCode = {
  id: 'saved-1',
  ...draftToSavedQrInput(draft),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z'
}

describe('saved QR mapping and dirty state', () => {
  it('maps all editable fields without scenario analytics or persistence metadata leakage', () => {
    expect(savedQrToDraft(saved)).toEqual({ ...draft, id: 'saved-1' })
    expect(draftToSavedQrInput(savedQrToDraft(saved))).toEqual(draftToSavedQrInput(draft))
    expect(draftToSavedQrInput(draft)).not.toHaveProperty('createdAt')
    expect(saved).not.toHaveProperty('status')
    expect(saved).not.toHaveProperty('scans')
  })

  it('detects semantic edits, detects reverts and clears dirty state after update', async () => {
    let persisted = saved
    const repository: QrRepository = {
      list: async () => [persisted],
      get: async () => persisted,
      create: async () => persisted,
      update: async (id, input) =>
        (persisted = {
          id,
          ...input,
          createdAt: saved.createdAt,
          updatedAt: '2026-01-03T00:00:00.000Z'
        }),
      duplicate: async () => persisted,
      delete: async () => undefined
    }
    const studio = useQrStudio(savedQrToDraft(saved), { repository, saved })
    expect(studio.dirty.value).toBe(false)
    studio.draft.value.name = 'Changed'
    expect(studio.dirty.value).toBe(true)
    studio.draft.value.name = saved.name
    expect(studio.dirty.value).toBe(false)
    studio.draft.value.name = 'Persist me'
    await studio.save()
    expect(studio.dirty.value).toBe(false)
    expect(studio.savedEntity.value?.id).toBe(saved.id)
  })
})
