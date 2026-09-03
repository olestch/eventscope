<script setup lang="ts">
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'New QR asset' })
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="QR studio / New asset"
      title="Shape a trackable touchpoint."
      description="Define the content and visual direction. Generation and export are deliberately deferred."
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/qr">Cancel</NuxtLink></template
      ></PageHeader
    ><QrEditorShell />
  </div>
</template>
