<script setup lang="ts">
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'New QR asset' })
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
    ><QrEditorShell />
  </div>
</template>
