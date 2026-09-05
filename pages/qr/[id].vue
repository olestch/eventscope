<script setup lang="ts">
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
const route = useRoute()
const asset = eventDatasetProvider.getCatalog().qrCodes.find(({ id }) => id === String(route.params.id))
useHead({ title: asset?.name || 'QR asset' })
</script>
<template>
  <div class="page">
    <template v-if="asset"
      ><PageHeader
        eyebrow="QR studio / Asset detail"
        :title="asset.name"
        description="Use this historical campaign definition as a local Studio draft. Analytics facts remain unchanged."
        ><template #actions
          ><NuxtLink class="button button--ghost" to="/qr">Back to library</NuxtLink></template
        ></PageHeader
      ><QrEditorShell :asset="asset" /></template
    ><StatePanel
      v-else
      state="error"
      title="QR asset not found"
      description="This identifier is not part of the fictional Northstar dataset."
      ><NuxtLink class="button button--primary" to="/qr">Return to library</NuxtLink></StatePanel
    >
  </div>
</template>
