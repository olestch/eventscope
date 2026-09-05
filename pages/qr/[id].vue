<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import type { SavedQrCode } from '~/domain/qr/library'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'

const route = useRoute()
const repository = createBrowserQrRepository()
const saved = ref<SavedQrCode>()
const loading = ref(true)
const error = ref('')
const title = computed(() => saved.value?.name || 'Saved QR asset')
useHead({ title })

onMounted(async () => {
  try {
    saved.value = (await repository.get(String(route.params.id))) ?? undefined
    if (!saved.value) error.value = 'This QR is not saved in this browser.'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'The QR could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <StatePanel
      v-if="loading"
      state="loading"
      title="Loading saved QR"
      description="Reading this asset from local browser storage."
    />
    <template v-else-if="saved">
      <PageHeader
        eyebrow="QR studio / Saved asset"
        :title="saved.name"
        description="Edit and export this browser-local QR. Analytics scenario data remains separate."
      >
        <template #actions
          ><NuxtLink class="button button--ghost" to="/qr">Back to library</NuxtLink></template
        >
      </PageHeader>
      <QrEditorShell :repository="repository" :saved="saved" @saved="saved = $event" />
    </template>
    <StatePanel v-else state="error" title="QR asset unavailable" :description="error">
      <NuxtLink class="button button--primary" to="/qr">Return to library</NuxtLink>
    </StatePanel>
  </div>
</template>
