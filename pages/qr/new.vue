<script setup lang="ts">
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import type { SavedQrCode } from '~/domain/qr/library'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'
useHead({ title: 'New QR asset' })
const repository = createBrowserQrRepository()
const handleSaved = (saved: SavedQrCode) =>
  navigateTo(`/qr/${encodeURIComponent(saved.id)}`, { replace: true })
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="QR studio / New asset"
      title="Design a campaign touchpoint."
      description="Configure campaign context, validate readability and export a production-ready visual asset locally."
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/qr">Cancel</NuxtLink></template
      ></PageHeader
    ><QrEditorShell :repository="repository" @saved="handleSaved" />
  </div>
</template>
