<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import QrPreview from './QrPreview.vue'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { QRCodeDefinition } from '~/domain/tracking/models'
import { scenarioQrAnalyticsLocation, scenarioQrToDraft } from '~/features/qr/scenario'
import { buildQrArtifact, qrContextLabels } from '~/features/qr/studio'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import { downloadQrPng, downloadQrSvg } from '~/services/qr/browserExport'

const props = defineProps<{ catalog: ReferenceCatalog }>()
const { t } = useI18n()
const exportMessage = ref('')
const exportError = ref(false)
const exportingId = ref<string>()
const draftFor = (qr: QRCodeDefinition) => scenarioQrToDraft(qr, props.catalog)
const contextFor = (qr: QRCodeDefinition) => qrContextLabels(draftFor(qr), props.catalog)

const exportSvg = (qr: QRCodeDefinition) => {
  const artifact = buildQrArtifact(draftFor(qr))
  if (!artifact) return
  try {
    downloadQrSvg(artifact.svg, sanitizeQrFilename(qr.name))
    exportError.value = false
    exportMessage.value = t('qr.library.exportedSvg', { name: qr.name })
  } catch (error) {
    exportError.value = true
    exportMessage.value = error instanceof Error ? error.message : 'SVG export failed.'
  }
}

const exportPng = async (qr: QRCodeDefinition) => {
  const artifact = buildQrArtifact(draftFor(qr))
  if (!artifact) return
  exportingId.value = qr.id
  try {
    await downloadQrPng(artifact.svg, sanitizeQrFilename(qr.name))
    exportError.value = false
    exportMessage.value = t('qr.library.exportedPng', { name: qr.name })
  } catch (error) {
    exportError.value = true
    exportMessage.value = error instanceof Error ? error.message : 'PNG export failed.'
  } finally {
    exportingId.value = undefined
  }
}
</script>

<template>
  <section class="qr-product-section" aria-labelledby="scenario-qr-title">
    <header class="qr-section-heading">
      <div>
        <p class="eyebrow">{{ t('qr.scenario.eyebrow') }}</p>
        <h2 id="scenario-qr-title">{{ t('qr.scenario.title') }}</h2>
      </div>
      <p>{{ t('qr.scenario.description') }}</p>
    </header>
    <p
      v-if="exportMessage"
      class="qr-library-message"
      :class="{ 'is-error': exportError }"
      :role="exportError ? 'alert' : 'status'"
    >
      {{ exportMessage }}
    </p>
    <div class="qr-library-grid" :aria-label="t('qr.scenario.region')">
      <article v-for="qr in catalog.qrCodes" :key="qr.id" class="saved-qr-card scenario-qr-card">
        <div class="saved-qr-card__preview"><QrPreview :draft="draftFor(qr)" :label="qr.name" /></div>
        <div class="saved-qr-card__body">
          <p class="qr-availability qr-availability--available">
            {{ t('qr.scenario.available') }}
          </p>
          <h3>{{ qr.name }}</h3>
          <p>
            {{ contextFor(qr).campaign }} · {{ contextFor(qr).channel }} · {{ contextFor(qr).location }}
          </p>
          <p class="saved-qr-card__destination">{{ qr.destination }}</p>
          <div class="saved-qr-card__actions" :aria-label="t('qr.scenario.actions', { name: qr.name })">
            <NuxtLink
              class="button button--primary"
              :to="scenarioQrAnalyticsLocation(qr, catalog)"
              :aria-label="t('qr.scenario.viewFor', { name: qr.name })"
              >{{ t('qr.scenario.view') }}</NuxtLink
            >
            <button class="button button--secondary" type="button" @click="exportSvg(qr)">
              {{ t('qr.library.exportSvg') }}
            </button>
            <button
              class="button button--secondary"
              type="button"
              :disabled="exportingId === qr.id"
              @click="exportPng(qr)"
            >
              {{ exportingId === qr.id ? t('qr.library.exporting') : t('qr.library.exportPng') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
