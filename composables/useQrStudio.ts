import { computed, ref, type Ref } from 'vue'
import {
  draftToSavedQrInput,
  qrDraftsEqual,
  savedQrToDraft,
  type QrRepository,
  type SavedQrCode
} from '~/domain/qr/library'
import type { QrStudioDraft } from '~/domain/qr/models'
import { validateQrDefinition } from '~/domain/qr/validation'
import { cloneQrStudioDraft, defaultQrDesign, buildQrArtifact } from '~/features/qr/studio'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import { downloadQrPng, downloadQrSvg } from '~/services/qr/browserExport'

export type QrExportState = 'idle' | 'exporting' | 'complete' | 'error'
export type QrSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useQrStudio(
  initial: QrStudioDraft,
  options: { repository?: QrRepository; saved?: SavedQrCode } = {}
) {
  const draft: Ref<QrStudioDraft> = ref(cloneQrStudioDraft(initial))
  const savedEntity = ref<SavedQrCode | undefined>(options.saved)
  const lastSavedDraft = ref<QrStudioDraft | undefined>(
    options.saved ? savedQrToDraft(options.saved) : undefined
  )
  const exportState = ref<QrExportState>('idle')
  const exportMessage = ref('')
  const saveState = ref<QrSaveState>('idle')
  const saveMessage = ref('')
  const validation = computed(() => validateQrDefinition(draft.value))
  const artifact = computed(() => buildQrArtifact(draft.value))
  const filename = computed(() => sanitizeQrFilename(draft.value.name))
  const dirty = computed(
    () => !lastSavedDraft.value || !qrDraftsEqual(draft.value, lastSavedDraft.value)
  )
  const canSave = computed(
    () =>
      Boolean(options.repository) &&
      validation.value.valid &&
      Boolean(draft.value.name.trim()) &&
      dirty.value &&
      saveState.value !== 'saving'
  )

  const replaceDraft = (next: QrStudioDraft) => {
    draft.value = cloneQrStudioDraft(next)
    exportState.value = 'idle'
    exportMessage.value = ''
    saveState.value = 'idle'
    saveMessage.value = ''
  }

  const normalizeDestination = () => {
    const trimmed = draft.value.destination.trim()
    if (trimmed !== draft.value.destination) {
      replaceDraft({ ...draft.value, destination: trimmed })
    }
  }

  const resetDesign = () => {
    replaceDraft({
      ...draft.value,
      design: {
        ...defaultQrDesign,
        gradient: { ...defaultQrDesign.gradient },
        logo: { ...defaultQrDesign.logo, content: { ...defaultQrDesign.logo.content } }
      }
    })
  }

  const exportSvg = () => {
    if (!artifact.value) return
    downloadQrSvg(artifact.value.svg, filename.value)
    exportState.value = 'complete'
    exportMessage.value = `${filename.value}.svg downloaded.`
  }

  const exportPng = async () => {
    if (!artifact.value || exportState.value === 'exporting') return
    exportState.value = 'exporting'
    exportMessage.value = 'Preparing 1024 × 1024 PNG…'
    try {
      await downloadQrPng(artifact.value.svg, filename.value)
      exportState.value = 'complete'
      exportMessage.value = `${filename.value}.png downloaded.`
    } catch (error) {
      exportState.value = 'error'
      exportMessage.value = error instanceof Error ? error.message : 'PNG export failed.'
    }
  }

  const save = async (): Promise<SavedQrCode | undefined> => {
    if (!options.repository || !canSave.value) return undefined
    saveState.value = 'saving'
    saveMessage.value = 'Saving locally…'
    try {
      const input = draftToSavedQrInput(draft.value)
      const saved = savedEntity.value
        ? await options.repository.update(savedEntity.value.id, input)
        : await options.repository.create(input)
      const persistedDraft = savedQrToDraft(saved)
      savedEntity.value = saved
      lastSavedDraft.value = persistedDraft
      draft.value = cloneQrStudioDraft(persistedDraft)
      saveState.value = 'saved'
      saveMessage.value = 'Saved in this browser.'
      return saved
    } catch (error) {
      saveState.value = 'error'
      saveMessage.value = error instanceof Error ? error.message : 'The QR could not be saved.'
      return undefined
    }
  }

  return {
    draft,
    savedEntity,
    validation,
    artifact,
    dirty,
    canSave,
    saveState,
    saveMessage,
    exportState,
    exportMessage,
    replaceDraft,
    normalizeDestination,
    resetDesign,
    save,
    exportSvg,
    exportPng
  }
}
