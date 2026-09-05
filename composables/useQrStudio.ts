import { computed, ref, type Ref } from 'vue'
import type { QrStudioDraft } from '~/domain/qr/models'
import { validateQrDefinition } from '~/domain/qr/validation'
import { cloneQrStudioDraft, defaultQrDesign, buildQrArtifact } from '~/features/qr/studio'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import { downloadQrPng, downloadQrSvg } from '~/services/qr/browserExport'

export type QrExportState = 'idle' | 'exporting' | 'complete' | 'error'

export function useQrStudio(initial: QrStudioDraft) {
  const draft: Ref<QrStudioDraft> = ref(cloneQrStudioDraft(initial))
  const exportState = ref<QrExportState>('idle')
  const exportMessage = ref('')
  const validation = computed(() => validateQrDefinition(draft.value))
  const artifact = computed(() => buildQrArtifact(draft.value))
  const filename = computed(() => sanitizeQrFilename(draft.value.name))

  const replaceDraft = (next: QrStudioDraft) => {
    draft.value = cloneQrStudioDraft(next)
    exportState.value = 'idle'
    exportMessage.value = ''
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
        logo: { ...defaultQrDesign.logo }
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

  return {
    draft,
    validation,
    artifact,
    exportState,
    exportMessage,
    replaceDraft,
    normalizeDestination,
    resetDesign,
    exportSvg,
    exportPng
  }
}
