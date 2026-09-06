<script setup lang="ts">
import type { NuxtError } from '#app'
import { computed, nextTick, onMounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import StatePanel from '~/components/ui/StatePanel.vue'

const props = defineProps<{ error: NuxtError }>()
const { locale, t } = useI18n()
const errorTitle = computed(() =>
  props.error.statusCode === 404 ? t('head.notFound') : t('head.unavailable')
)

// Nuxt renders the global error shell outside app.vue, so its document metadata
// needs the same reactive locale synchronization as the normal application root.
function syncDocumentMetadata() {
  if (!import.meta.client) return
  document.documentElement.lang = locale.value
  document.title = `${errorTitle.value} · EventScope`
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('errors.description'))
}

watchEffect(syncDocumentMetadata)
onMounted(() => nextTick(syncDocumentMetadata))

function returnToExplore() {
  clearError({ redirect: '/explore' })
}
</script>

<template>
  <Html :lang="locale">
    <Head>
      <Title>{{ errorTitle }}</Title>
      <Meta name="description" :content="t('errors.description')" />
    </Head>
    <Body>
      <NuxtLayout>
        <div class="page page--centered">
          <StatePanel
            state="error"
            heading-level="h1"
            :title="error.statusCode === 404 ? t('errors.pageNotFound') : t('errors.interrupted')"
            :description="t('errors.description')"
          >
            <button class="button button--primary" type="button" @click="returnToExplore">
              {{ t('errors.returnExplore') }}
            </button>
          </StatePanel>
        </div>
      </NuxtLayout>
    </Body>
  </Html>
</template>
