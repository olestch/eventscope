<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import type { SavedQrCode } from '~/domain/qr/library'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'
const { t } = useI18n()
useHead(() => ({ title: t('head.qrNew') }))
const repository = createBrowserQrRepository()
const handleSaved = (saved: SavedQrCode) =>
  navigateTo(`/qr/${encodeURIComponent(saved.id)}`, { replace: true })
</script>
<template>
  <div class="page">
    <PageHeader
      :eyebrow="t('qr.studio.newEyebrow')"
      :title="t('qr.studio.newTitle')"
      :description="t('qr.studio.newDescription')"
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/qr">{{ t('common.cancel') }}</NuxtLink></template
      ></PageHeader
    ><QrEditorShell :repository="repository" @saved="handleSaved" />
  </div>
</template>
