<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import QrPreview from './QrPreview.vue'
import ScenarioQrLibrary from './ScenarioQrLibrary.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useQrLibrary } from '~/composables/useQrLibrary'
import { savedQrToDraft, type QrRepository, type SavedQrCode } from '~/domain/qr/library'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { buildQrArtifact, qrContextLabels } from '~/features/qr/studio'
import { sanitizeQrFilename } from '~/features/qr/presentation'
import { downloadQrPng, downloadQrSvg } from '~/services/qr/browserExport'

const props = defineProps<{ repository: QrRepository }>()
const library = useQrLibrary(props.repository)
const catalog = eventDatasetProvider.getCatalog()
const pendingDeleteId = ref<string>()
const exportMessage = ref('')
const exportError = ref(false)
const exportingId = ref<string>()
const hasActionError = computed(() => Boolean(library.errorMessage.value || exportError.value))

const draftFor = (item: SavedQrCode) => savedQrToDraft(item)
const contextFor = (item: SavedQrCode) => qrContextLabels(draftFor(item), catalog)
const updatedLabel = (item: SavedQrCode) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(item.updatedAt)
  )

const exportSvg = (item: SavedQrCode) => {
  const artifact = buildQrArtifact(draftFor(item))
  if (!artifact) return
  try {
    downloadQrSvg(artifact.svg, sanitizeQrFilename(item.name))
    exportError.value = false
    exportMessage.value = `Exported ${item.name} as SVG.`
  } catch (error) {
    exportError.value = true
    exportMessage.value = error instanceof Error ? error.message : 'SVG export failed.'
  }
}

const exportPng = async (item: SavedQrCode) => {
  const artifact = buildQrArtifact(draftFor(item))
  if (!artifact) return
  exportingId.value = item.id
  try {
    await downloadQrPng(artifact.svg, sanitizeQrFilename(item.name))
    exportError.value = false
    exportMessage.value = `Exported ${item.name} as PNG.`
  } catch (error) {
    exportError.value = true
    exportMessage.value = error instanceof Error ? error.message : 'PNG export failed.'
  } finally {
    exportingId.value = undefined
  }
}

const confirmDelete = async (item: SavedQrCode) => {
  if (await library.remove(item.id)) pendingDeleteId.value = undefined
}

onMounted(library.load)
</script>

<template>
  <header class="qr-section-heading">
    <div>
      <p class="eyebrow">Your browser</p>
      <h2>Saved QR</h2>
    </div>
    <p>Editable local assets. They have no tracking identity or analytics yet.</p>
  </header>
  <p class="qr-library-note">
    Saved only in this browser. No account, cloud sync or tracking is created.
  </p>
  <p v-if="hasActionError" class="qr-library-message is-error" role="alert">
    {{ library.errorMessage.value || exportMessage }}
  </p>
  <p v-else-if="exportMessage" class="qr-library-message" role="status">{{ exportMessage }}</p>
  <StatePanel
    v-if="library.status.value === 'loading'"
    state="loading"
    title="Loading local QR codes"
    description="Reading this browser's saved library."
  />
  <StatePanel
    v-else-if="library.status.value === 'error'"
    state="error"
    title="QR Library unavailable"
    :description="library.errorMessage.value"
  >
    <button class="button button--secondary" type="button" @click="library.load">Try again</button>
  </StatePanel>
  <StatePanel
    v-else-if="library.status.value === 'empty'"
    state="empty"
    title="No saved QR codes yet"
    description="Create a QR, configure its destination and save it to this browser."
  >
    <NuxtLink class="button button--primary" to="/qr/new">Create QR</NuxtLink>
  </StatePanel>
  <section v-else class="qr-library-grid" aria-label="Saved QR Library">
    <article v-for="item in library.items.value" :key="item.id" class="saved-qr-card">
      <div class="saved-qr-card__preview"><QrPreview :draft="draftFor(item)" :label="item.name" /></div>
      <div class="saved-qr-card__body">
        <p class="saved-qr-card__updated">Updated {{ updatedLabel(item) }}</p>
        <p class="qr-availability">No analytics yet</p>
        <h2>{{ item.name }}</h2>
        <p>{{ contextFor(item).campaign }} · {{ contextFor(item).channel }}</p>
        <p class="saved-qr-card__destination">{{ item.destination }}</p>
        <div class="saved-qr-card__actions" :aria-label="`Actions for ${item.name}`">
          <NuxtLink class="button button--primary" :to="`/qr/${encodeURIComponent(item.id)}`"
            >Edit</NuxtLink
          >
          <button
            class="button button--secondary"
            type="button"
            :disabled="library.pendingId.value === item.id"
            @click="library.duplicate(item.id)"
          >
            Duplicate
          </button>
          <button class="button button--secondary" type="button" @click="exportSvg(item)">
            Export SVG
          </button>
          <button
            class="button button--secondary"
            type="button"
            :disabled="exportingId === item.id"
            @click="exportPng(item)"
          >
            {{ exportingId === item.id ? 'Exporting…' : 'Export PNG' }}
          </button>
          <button class="button button--ghost" type="button" @click="pendingDeleteId = item.id">
            Delete
          </button>
        </div>
        <div
          v-if="pendingDeleteId === item.id"
          class="saved-qr-card__confirmation"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="`delete-title-${item.id}`"
        >
          <strong :id="`delete-title-${item.id}`">Delete “{{ item.name }}”?</strong>
          <span>This removes it from this browser only.</span>
          <div>
            <button class="button button--ghost" type="button" @click="pendingDeleteId = undefined">
              Cancel
            </button>
            <button class="button button--danger" type="button" @click="confirmDelete(item)">
              Confirm delete
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
  <ScenarioQrLibrary :catalog="catalog" />
</template>
