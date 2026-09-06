<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { locale, t } = useI18n()
const library = useQrLibrary(props.repository)
const catalog = eventDatasetProvider.getCatalog()
const pendingDeleteId = ref<string>()
const exportMessage = ref('')
const exportError = ref(false)
const exportingId = ref<string>()
const savedQrHeading = ref<HTMLHeadingElement | null>(null)
const deleteTriggers = new Map<string, HTMLButtonElement>()
const cancelButtons = new Map<string, HTMLButtonElement>()
const hasActionError = computed(() => Boolean(library.errorMessage.value || exportError.value))

const nativeElement = (element: Element | ComponentPublicInstance | null) =>
  element ? (('$el' in element ? element.$el : element) as HTMLButtonElement) : null

const setDeleteTrigger = (id: string, element: Element | ComponentPublicInstance | null) => {
  const button = nativeElement(element)
  if (button) deleteTriggers.set(id, button)
  else deleteTriggers.delete(id)
}

const setCancelButton = (id: string, element: Element | ComponentPublicInstance | null) => {
  const button = nativeElement(element)
  if (button) cancelButtons.set(id, button)
  else cancelButtons.delete(id)
}

const openDelete = async (id: string) => {
  pendingDeleteId.value = id
  await nextTick()
  cancelButtons.get(id)?.focus()
}

const closeDelete = async (id: string) => {
  pendingDeleteId.value = undefined
  await nextTick()
  deleteTriggers.get(id)?.focus()
}

const draftFor = (item: SavedQrCode) => savedQrToDraft(item)
const contextFor = (item: SavedQrCode) => qrContextLabels(draftFor(item), catalog)
const updatedLabel = (item: SavedQrCode) =>
  new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(item.updatedAt))

const exportSvg = (item: SavedQrCode) => {
  const artifact = buildQrArtifact(draftFor(item))
  if (!artifact) return
  try {
    downloadQrSvg(artifact.svg, sanitizeQrFilename(item.name))
    exportError.value = false
    exportMessage.value = t('qr.library.exportedSvg', { name: item.name })
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
    exportMessage.value = t('qr.library.exportedPng', { name: item.name })
  } catch (error) {
    exportError.value = true
    exportMessage.value = error instanceof Error ? error.message : 'PNG export failed.'
  } finally {
    exportingId.value = undefined
  }
}

const confirmDelete = async (item: SavedQrCode) => {
  if (await library.remove(item.id)) {
    pendingDeleteId.value = undefined
    await nextTick()
    savedQrHeading.value?.focus()
  }
}

onMounted(library.load)
</script>

<template>
  <header class="qr-section-heading">
    <div>
      <p class="eyebrow">{{ t('qr.library.browser') }}</p>
      <h2 ref="savedQrHeading" tabindex="-1">{{ t('qr.library.saved') }}</h2>
    </div>
    <p>{{ t('qr.library.savedDescription') }}</p>
  </header>
  <p class="qr-library-note">
    {{ t('qr.library.localNote') }}
  </p>
  <p v-if="hasActionError" class="qr-library-message is-error" role="alert">
    {{ library.errorMessage.value || exportMessage }}
  </p>
  <p v-else-if="exportMessage" class="qr-library-message" role="status">{{ exportMessage }}</p>
  <StatePanel
    v-if="library.status.value === 'loading'"
    state="loading"
    :title="t('qr.library.loading')"
    :description="t('qr.library.loadingDescription')"
  />
  <StatePanel
    v-else-if="library.status.value === 'error'"
    state="error"
    :title="t('qr.library.unavailable')"
    :description="library.errorMessage.value"
  >
    <button class="button button--secondary" type="button" @click="library.load">
      {{ t('qr.library.tryAgain') }}
    </button>
  </StatePanel>
  <StatePanel
    v-else-if="library.status.value === 'empty'"
    state="empty"
    :title="t('qr.library.empty')"
    :description="t('qr.library.emptyDescription')"
  >
    <NuxtLink class="button button--primary" to="/qr/new">{{ t('qr.library.create') }}</NuxtLink>
  </StatePanel>
  <section v-else class="qr-library-grid" :aria-label="t('qr.library.region')">
    <article v-for="item in library.items.value" :key="item.id" class="saved-qr-card">
      <div class="saved-qr-card__preview"><QrPreview :draft="draftFor(item)" :label="item.name" /></div>
      <div class="saved-qr-card__body">
        <p class="saved-qr-card__updated">
          {{ t('qr.library.updated', { date: updatedLabel(item) }) }}
        </p>
        <p class="qr-availability">{{ t('qr.library.noAnalytics') }}</p>
        <h2>{{ item.name }}</h2>
        <p>{{ contextFor(item).campaign }} · {{ contextFor(item).channel }}</p>
        <p class="saved-qr-card__destination">{{ item.destination }}</p>
        <div class="saved-qr-card__actions" :aria-label="t('qr.library.actions', { name: item.name })">
          <NuxtLink class="button button--primary" :to="`/qr/${encodeURIComponent(item.id)}`">{{
            t('common.edit')
          }}</NuxtLink>
          <button
            class="button button--secondary"
            type="button"
            :disabled="library.pendingId.value === item.id"
            @click="library.duplicate(item.id)"
          >
            {{ t('common.duplicate') }}
          </button>
          <button class="button button--secondary" type="button" @click="exportSvg(item)">
            {{ t('qr.library.exportSvg') }}
          </button>
          <button
            class="button button--secondary"
            type="button"
            :disabled="exportingId === item.id"
            @click="exportPng(item)"
          >
            {{ exportingId === item.id ? t('qr.library.exporting') : t('qr.library.exportPng') }}
          </button>
          <button
            :ref="(element) => setDeleteTrigger(item.id, element)"
            class="button button--ghost"
            type="button"
            @click="openDelete(item.id)"
          >
            {{ t('common.delete') }}
          </button>
        </div>
        <div
          v-if="pendingDeleteId === item.id"
          class="saved-qr-card__confirmation"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="`delete-title-${item.id}`"
          :aria-describedby="`delete-description-${item.id}`"
          @keydown.esc.stop.prevent="closeDelete(item.id)"
        >
          <strong :id="`delete-title-${item.id}`">{{
            t('qr.library.deleteTitle', { name: item.name })
          }}</strong>
          <span :id="`delete-description-${item.id}`">{{ t('qr.library.deleteDescription') }}</span>
          <div>
            <button
              :ref="(element) => setCancelButton(item.id, element)"
              class="button button--ghost"
              type="button"
              @click="closeDelete(item.id)"
            >
              {{ t('common.cancel') }}
            </button>
            <button class="button button--danger" type="button" @click="confirmDelete(item)">
              {{ t('qr.library.confirmDelete') }}
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
  <ScenarioQrLibrary :catalog="catalog" />
</template>
