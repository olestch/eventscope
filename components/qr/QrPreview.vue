<script setup lang="ts">
import { computed } from 'vue'
import type { QrStudioDraft } from '~/domain/qr/models'
import { buildQrArtifact } from '~/features/qr/studio'

const props = defineProps<{ draft: QrStudioDraft; label: string }>()
const artifact = computed(() => buildQrArtifact(props.draft))
</script>

<template>
  <div class="qr-preview">
    <img v-if="artifact" :src="artifact.dataUri" :alt="`${label} QR preview`" />
    <span v-else role="img" :aria-label="`${label} preview unavailable`">Preview unavailable</span>
  </div>
</template>
