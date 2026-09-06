<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import type { SavedQrCode } from '~/domain/qr/library'
import { createBrowserQrRepository } from '~/services/qr/LocalStorageQrRepository'

const route = useRoute()
const { t } = useI18n()
const repository = createBrowserQrRepository()
const saved = ref<SavedQrCode>()
const loading = ref(true)
const error = ref('')
const title = computed(() => saved.value?.name || t('head.qrSaved'))
useHead({ title })

onMounted(async () => {
  try {
    saved.value = (await repository.get(String(route.params.id))) ?? undefined
    if (!saved.value) error.value = t('qr.studio.savedMissing')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : t('qr.studio.savedLoadError')
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
      :title="t('qr.studio.loadingSaved')"
      :description="t('qr.studio.loadingSavedDescription')"
    />
    <template v-else-if="saved">
      <PageHeader
        :eyebrow="t('qr.studio.savedEyebrow')"
        :title="saved.name"
        :description="t('qr.studio.savedDescription')"
      >
        <template #actions
          ><NuxtLink class="button button--ghost" to="/qr">{{
            t('qr.studio.backLibrary')
          }}</NuxtLink></template
        >
      </PageHeader>
      <QrEditorShell :repository="repository" :saved="saved" @saved="saved = $event" />
    </template>
    <StatePanel v-else state="error" :title="t('qr.studio.assetUnavailable')" :description="error">
      <NuxtLink class="button button--primary" to="/qr">{{ t('qr.studio.returnLibrary') }}</NuxtLink>
    </StatePanel>
  </div>
</template>
