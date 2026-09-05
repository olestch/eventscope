<script setup lang="ts">
import { ref } from 'vue'
import QrPreview from './QrPreview.vue'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { QRCodeDefinition } from '~/domain/tracking/models'
import { scenarioQrAnalyticsLocation, scenarioQrToDraft } from '~/features/qr/scenario'
import { buildQrArtifact, qrContextLabels } from '~/features/qr/studio'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import { downloadQrPng, downloadQrSvg } from '~/services/qr/browserExport'

const props = defineProps<{ catalog: ReferenceCatalog }>()
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
    exportMessage.value = `Exported ${qr.name} as SVG.`
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
    exportMessage.value = `Exported ${qr.name} as PNG.`
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
        <p class="eyebrow">Deterministic demo identities</p>
        <h2 id="scenario-qr-title">Scenario QR</h2>
      </div>
      <p>Read-only QR codes connected to the deterministic analytics dataset.</p>
    </header>
    <p
      v-if="exportMessage"
      class="qr-library-message"
      :class="{ 'is-error': exportError }"
      :role="exportError ? 'alert' : 'status'"
    >
      {{ exportMessage }}
    </p>
    <div class="qr-library-grid" aria-label="Scenario QR codes">
      <article v-for="qr in catalog.qrCodes" :key="qr.id" class="saved-qr-card scenario-qr-card">
        <div class="saved-qr-card__preview"><QrPreview :draft="draftFor(qr)" :label="qr.name" /></div>
        <div class="saved-qr-card__body">
          <p class="qr-availability qr-availability--available">Analytics available</p>
          <h3>{{ qr.name }}</h3>
          <p>
            {{ contextFor(qr).campaign }} · {{ contextFor(qr).channel }} · {{ contextFor(qr).location }}
          </p>
          <p class="saved-qr-card__destination">{{ qr.destination }}</p>
          <div class="saved-qr-card__actions" :aria-label="`Actions for scenario QR ${qr.name}`">
            <NuxtLink
              class="button button--primary"
              :to="scenarioQrAnalyticsLocation(qr, catalog)"
              :aria-label="`View analytics for ${qr.name}`"
              >View analytics</NuxtLink
            >
            <button class="button button--secondary" type="button" @click="exportSvg(qr)">
              Export SVG
            </button>
            <button
              class="button button--secondary"
              type="button"
              :disabled="exportingId === qr.id"
              @click="exportPng(qr)"
            >
              {{ exportingId === qr.id ? 'Exporting…' : 'Export PNG' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
