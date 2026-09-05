import type { QrDesignConfig, QrStudioDraft } from '~/domain/qr/models'

export interface SavedQrCode {
  id: string
  name: string
  campaignId: string
  channelId: string
  locationId?: string
  destination: string
  design: QrDesignConfig
  createdAt: string
  updatedAt: string
}

export interface CreateSavedQrInput {
  name: string
  campaignId: string
  channelId: string
  locationId?: string
  destination: string
  design: QrDesignConfig
}

export type UpdateSavedQrInput = CreateSavedQrInput

export interface QrRepository {
  list(): Promise<SavedQrCode[]>
  get(id: string): Promise<SavedQrCode | null>
  create(input: CreateSavedQrInput): Promise<SavedQrCode>
  update(id: string, input: UpdateSavedQrInput): Promise<SavedQrCode>
  duplicate(id: string): Promise<SavedQrCode>
  delete(id: string): Promise<void>
}

const cloneDesign = (design: QrDesignConfig): QrDesignConfig => ({
  foreground: design.foreground,
  background: design.background,
  moduleStyle: design.moduleStyle,
  finderStyle: design.finderStyle,
  margin: design.margin,
  gradient: {
    enabled: design.gradient.enabled,
    startColor: design.gradient.startColor,
    endColor: design.gradient.endColor,
    direction: design.gradient.direction
  },
  logo: {
    enabled: design.logo.enabled,
    size: design.logo.size,
    content: { ...design.logo.content }
  }
})

export function savedQrToDraft(saved: SavedQrCode): QrStudioDraft {
  return {
    id: saved.id,
    name: saved.name,
    campaignId: saved.campaignId,
    channelId: saved.channelId,
    ...(saved.locationId ? { locationId: saved.locationId } : {}),
    destination: saved.destination,
    design: cloneDesign(saved.design)
  }
}

export function draftToSavedQrInput(draft: QrStudioDraft): CreateSavedQrInput {
  return {
    name: draft.name.trim(),
    campaignId: draft.campaignId,
    channelId: draft.channelId,
    ...(draft.locationId ? { locationId: draft.locationId } : {}),
    destination: draft.destination.trim(),
    design: cloneDesign(draft.design)
  }
}

export function qrDraftFingerprint(draft: QrStudioDraft): string {
  return JSON.stringify(draftToSavedQrInput(draft))
}

export function qrDraftsEqual(first: QrStudioDraft, second: QrStudioDraft): boolean {
  return qrDraftFingerprint(first) === qrDraftFingerprint(second)
}
