<script setup lang="ts">
import { computed } from 'vue'
import QrConfigurationPanel from './QrConfigurationPanel.vue'
import QrPreviewPanel from './QrPreviewPanel.vue'
import { useQrStudio } from '~/composables/useQrStudio'
import type { QRCodeDefinition } from '~/domain/tracking/models'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import {
  createDefaultQrStudioDraft,
  createQrStudioDraftFromTracked,
  qrContextLabels
} from '~/features/qr/studio'

const props = withDefaults(defineProps<{ asset?: QRCodeDefinition }>(), { asset: undefined })
const catalog = eventDatasetProvider.getCatalog()
const initial = props.asset
  ? createQrStudioDraftFromTracked(props.asset, catalog)
  : createDefaultQrStudioDraft(catalog)
const studio = useQrStudio(initial)
const context = computed(() => qrContextLabels(studio.draft.value, catalog))
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
      :export-state="studio.exportState.value"
      :export-message="studio.exportMessage.value"
      @export-svg="studio.exportSvg"
      @export-png="studio.exportPng"
      @reset-design="studio.resetDesign"
    />
  </div>
</template>
