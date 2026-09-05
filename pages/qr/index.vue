<script setup lang="ts">
import QrLibraryView from '~/components/qr/QrLibraryView.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'

useHead({ title: 'QR Library' })
const repository = createBrowserQrRepository()
</script>

<template>
  <div class="page">
    <PageHeader
      eyebrow="QR studio"
      title="Your local QR Library."
      description="Create, revisit and export QR assets stored in this browser."
    >
      <template #actions>
        <NuxtLink class="button button--primary" to="/qr/new"
          >New QR <span aria-hidden="true">+</span></NuxtLink
        >
      </template>
    </PageHeader>
    <QrLibraryView :repository="repository" />
  </div>
</template>
