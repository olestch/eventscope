<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QrStudioDraft, QrSvgArtifact, QrValidationResult } from '~/domain/qr/models'
import { qrDesignConstraints } from '~/domain/qr/constraints'
import type { QrExportState, QrSaveState } from '~/composables/useQrStudio'

const props = defineProps<{
  draft: QrStudioDraft
  artifact?: QrSvgArtifact
  validation: QrValidationResult
  context: { campaign: string; channel: string; location: string }
  dirty: boolean
  canSave: boolean
  saveState: QrSaveState
  saveMessage: string
  exportState: QrExportState
  exportMessage: string
}>()
const { t } = useI18n()
const qualityLabel = (status: QrValidationResult['status']) => t(`qr.studio.quality.${status}`)
const issueParams = {
  min: qrDesignConstraints.margin.min,
  recommended: qrDesignConstraints.margin.recommended,
  max: qrDesignConstraints.centerMark.size.max * 100
}
const localizedSaveMessage = computed(() => {
  if (props.saveState === 'saving') return t('qr.studio.savingLocal')
  if (props.saveState === 'saved') return t('qr.studio.saved')
  return props.saveMessage
})
const localizedExportMessage = computed(() => {
  if (props.exportState === 'exporting') return t('qr.studio.preparingPng')
  if (props.exportState === 'complete') {
    const file = props.exportMessage.replace(/ downloaded\.$/, '')
    return t('qr.studio.downloaded', { file })
  }
  return props.exportMessage
})
defineEmits<{ save: []; exportSvg: []; exportPng: []; resetDesign: [] }>()
</script>

<template>
  <aside class="panel qr-preview-panel" aria-labelledby="qr-preview-title">
    <div class="qr-preview-panel__header">
      <div>
        <p class="eyebrow">{{ t('qr.studio.preview') }}</p>
        <h2 id="qr-preview-title">{{ draft.name || t('qr.studio.untitled') }}</h2>
      </div>
      <span class="qr-quality-pill" :class="`qr-quality-pill--${validation.status}`">
        {{ qualityLabel(validation.status) }}
      </span>
    </div>

    <div
      class="qr-persistence-status"
      :class="{ 'is-error': saveState === 'error' }"
      :role="saveState === 'error' ? 'alert' : 'status'"
    >
      <span aria-hidden="true" />
      <strong>{{
        saveState === 'saving'
          ? t('qr.studio.savingLocal')
          : dirty
            ? t('qr.studio.unsaved')
            : t('qr.studio.saved')
      }}</strong>
      <small>{{ t('common.localOnly') }}</small>
    </div>

    <div class="qr-canvas" :class="{ 'qr-canvas--invalid': !artifact }">
      <img
        v-if="artifact"
        :src="artifact.dataUri"
        :alt="t('qr.studio.previewAlt', { name: draft.name || t('qr.studio.campaign') })"
        width="1024"
        height="1024"
      />
      <div v-else class="qr-canvas__invalid" role="img" :aria-label="t('qr.studio.unavailable')">
        <strong>{{ t('qr.studio.paused') }}</strong>
        <span>{{ t('qr.studio.pausedDescription') }}</span>
      </div>
    </div>

    <dl class="qr-context-list">
      <div>
        <dt>{{ t('qr.studio.campaign') }}</dt>
        <dd>{{ context.campaign }}</dd>
      </div>
      <div>
        <dt>{{ t('qr.studio.channel') }}</dt>
        <dd>{{ context.channel }}</dd>
      </div>
      <div>
        <dt>{{ t('qr.studio.location') }}</dt>
        <dd>{{ context.location }}</dd>
      </div>
    </dl>

    <section class="qr-quality-summary" aria-labelledby="qr-quality-title">
      <div class="qr-quality-summary__header">
        <div>
          <span class="eyebrow">{{ t('qr.studio.guidance') }}</span>
          <h3 id="qr-quality-title">
            {{ t('qr.studio.configuration', { quality: qualityLabel(validation.status) }) }}
          </h3>
        </div>
        <strong v-if="validation.contrastRatio !== undefined">
          {{ validation.contrastRatio.toFixed(2) }}:1
          <small>{{ t('qr.studio.minimumContrast') }}</small>
        </strong>
      </div>
      <ul v-if="validation.issues.length" class="qr-issue-list">
        <li v-for="issue in validation.issues" :key="issue.code" :class="`is-${issue.severity}`">
          <strong>{{ issue.severity === 'error' ? t('qr.studio.fix') : t('qr.studio.review') }}</strong>
          <span>{{ t(`qr.validation.${issue.code}`, issueParams) }}</span>
        </li>
      </ul>
      <p v-else class="qr-quality-pass">
        {{ t('qr.studio.pass') }}
      </p>
      <p class="qr-certification-note">{{ t('qr.studio.certification') }}</p>
    </section>

    <div class="qr-export-actions">
      <button
        class="button button--primary qr-save-button"
        type="button"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        {{ saveState === 'saving' ? t('qr.studio.saving') : t('qr.studio.saveQr') }}
      </button>
      <button
        class="button button--secondary"
        type="button"
        :disabled="!artifact || exportState === 'exporting'"
        @click="$emit('exportSvg')"
      >
        {{ t('qr.library.exportSvg') }}
      </button>
      <button
        class="button button--secondary"
        type="button"
        :disabled="!artifact || exportState === 'exporting'"
        @click="$emit('exportPng')"
      >
        {{ exportState === 'exporting' ? t('qr.studio.preparing') : t('qr.library.exportPng') }}
      </button>
      <button class="button button--ghost" type="button" @click="$emit('resetDesign')">
        {{ t('qr.studio.resetDesign') }}
      </button>
    </div>
    <p class="qr-export-note">{{ t('qr.studio.localExport') }}</p>
    <p
      v-if="saveMessage"
      class="qr-export-status"
      :class="{ 'is-error': saveState === 'error' }"
      :role="saveState === 'error' ? 'alert' : 'status'"
    >
      {{ localizedSaveMessage }}
    </p>
    <p
      v-if="exportMessage"
      class="qr-export-status"
      :class="{ 'is-error': exportState === 'error' }"
      :role="exportState === 'error' ? 'alert' : 'status'"
    >
      {{ localizedExportMessage }}
    </p>
  </aside>
</template>
