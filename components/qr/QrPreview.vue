<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QrStudioDraft } from '~/domain/qr/models'
import { buildQrArtifact } from '~/features/qr/studio'

const props = defineProps<{ draft: QrStudioDraft; label: string }>()
const { t } = useI18n()
const artifact = computed(() => buildQrArtifact(props.draft))
</script>

<template>
  <div class="qr-preview">
    <img v-if="artifact" :src="artifact.dataUri" :alt="t('qr.library.previewAlt', { name: label })" />
    <span v-else role="img" :aria-label="t('qr.library.previewUnavailableFor', { name: label })">{{
      t('qr.library.previewUnavailable')
    }}</span>
  </div>
</template>
