<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import QrLibraryView from '~/components/qr/QrLibraryView.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'

const { t } = useI18n()
useHead(() => ({ title: t('head.qrLibrary') }))
const repository = createBrowserQrRepository()
</script>

<template>
  <div class="page">
    <PageHeader
      :eyebrow="t('qr.library.eyebrow')"
      :title="t('qr.library.title')"
      :description="t('qr.library.description')"
    >
      <template #actions>
        <NuxtLink class="button button--primary" to="/qr/new"
          >{{ t('qr.library.newQr') }} <span aria-hidden="true">+</span></NuxtLink
        >
      </template>
    </PageHeader>
    <QrLibraryView :repository="repository" />
  </div>
</template>
