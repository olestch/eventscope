<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import QrConfigurationPanel from './QrConfigurationPanel.vue'
import QrPreviewPanel from './QrPreviewPanel.vue'
import { useQrStudio } from '~/composables/useQrStudio'
import { savedQrToDraft, type QrRepository, type SavedQrCode } from '~/domain/qr/library'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createDefaultQrStudioDraft, qrContextLabels } from '~/features/qr/studio'

const props = withDefaults(defineProps<{ repository?: QrRepository; saved?: SavedQrCode }>(), {
  repository: undefined,
  saved: undefined
})
const emit = defineEmits<{ saved: [saved: SavedQrCode] }>()
const catalog = eventDatasetProvider.getCatalog()
const initial = props.saved ? savedQrToDraft(props.saved) : createDefaultQrStudioDraft(catalog)
const studio = useQrStudio(initial, { repository: props.repository, saved: props.saved })
const context = computed(() => qrContextLabels(studio.draft.value, catalog))

const save = async () => {
  const saved = await studio.save()
  if (saved) emit('saved', saved)
}

const preventUnsavedUnload = (event: BeforeUnloadEvent) => {
  if (!studio.dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', preventUnsavedUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnsavedUnload))
</script>

<template>
  <div class="qr-studio-grid">
    <QrConfigurationPanel
      :draft="studio.draft.value"
      :catalog="catalog"
      :validation="studio.validation.value"
      @change="studio.replaceDraft"
      @normalize-destination="studio.normalizeDestination"
    />
    <QrPreviewPanel
      :draft="studio.draft.value"
      :artifact="studio.artifact.value"
      :validation="studio.validation.value"
      :context="context"
      :dirty="studio.dirty.value"
      :can-save="studio.canSave.value"
      :save-state="studio.saveState.value"
      :save-message="studio.saveMessage.value"
      :export-state="studio.exportState.value"
      :export-message="studio.exportMessage.value"
      @save="save"
      @export-svg="studio.exportSvg"
      @export-png="studio.exportPng"
      @reset-design="studio.resetDesign"
    />
  </div>
</template>
