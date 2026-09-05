<script setup lang="ts">
import type { QrStudioDraft, QrSvgArtifact, QrValidationResult } from '~/domain/qr/models'
import type { QrExportState, QrSaveState } from '~/composables/useQrStudio'
import { qrQualityLabels } from '~/features/qr/presentation'

defineProps<{
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
defineEmits<{ save: []; exportSvg: []; exportPng: []; resetDesign: [] }>()
</script>

<template>
  <aside class="panel qr-preview-panel" aria-labelledby="qr-preview-title">
    <div class="qr-preview-panel__header">
      <div>
        <p class="eyebrow">Live preview</p>
        <h2 id="qr-preview-title">{{ draft.name || 'Untitled QR asset' }}</h2>
      </div>
      <span class="qr-quality-pill" :class="`qr-quality-pill--${validation.status}`">
        {{ qrQualityLabels[validation.status] }}
      </span>
    </div>

    <div
      class="qr-persistence-status"
      :class="{ 'is-error': saveState === 'error' }"
      :role="saveState === 'error' ? 'alert' : 'status'"
    >
      <span aria-hidden="true" />
      <strong>{{
        saveState === 'saving' ? 'Saving locally…' : dirty ? 'Unsaved changes' : 'Saved in this browser'
      }}</strong>
      <small>Local browser storage only</small>
    </div>

    <div class="qr-canvas" :class="{ 'qr-canvas--invalid': !artifact }">
      <img
        v-if="artifact"
        :src="artifact.dataUri"
        :alt="`${draft.name || 'Campaign'} QR code preview`"
        width="1024"
        height="1024"
      />
      <div v-else class="qr-canvas__invalid" role="img" aria-label="QR preview unavailable">
        <strong>Preview paused</strong>
        <span>Resolve the validation errors to render a safe QR code.</span>
      </div>
    </div>

    <dl class="qr-context-list">
      <div>
        <dt>Campaign</dt>
        <dd>{{ context.campaign }}</dd>
      </div>
      <div>
        <dt>Channel</dt>
        <dd>{{ context.channel }}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>{{ context.location }}</dd>
      </div>
    </dl>

    <section class="qr-quality-summary" aria-labelledby="qr-quality-title">
      <div class="qr-quality-summary__header">
        <div>
          <span class="eyebrow">Quality guidance</span>
          <h3 id="qr-quality-title">{{ qrQualityLabels[validation.status] }} configuration</h3>
        </div>
        <strong v-if="validation.contrastRatio !== undefined">
          {{ validation.contrastRatio.toFixed(2) }}:1
          <small>minimum contrast</small>
        </strong>
      </div>
      <ul v-if="validation.issues.length" class="qr-issue-list">
        <li v-for="issue in validation.issues" :key="issue.code" :class="`is-${issue.severity}`">
          <strong>{{ issue.severity === 'error' ? 'Fix' : 'Review' }}</strong>
          <span>{{ issue.message }}</span>
        </li>
      </ul>
      <p v-else class="qr-quality-pass">
        Destination, contrast, quiet zone and center mark coverage pass the local design checks.
      </p>
      <p class="qr-certification-note">Guidance only — not a scanner certification.</p>
    </section>

    <div class="qr-export-actions">
      <button
        class="button button--primary qr-save-button"
        type="button"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        {{ saveState === 'saving' ? 'Saving…' : 'Save QR' }}
      </button>
      <button
        class="button button--secondary"
        type="button"
        :disabled="!artifact || exportState === 'exporting'"
        @click="$emit('exportSvg')"
      >
        Export SVG
      </button>
      <button
        class="button button--secondary"
        type="button"
        :disabled="!artifact || exportState === 'exporting'"
        @click="$emit('exportPng')"
      >
        {{ exportState === 'exporting' ? 'Preparing…' : 'Export PNG' }}
      </button>
      <button class="button button--ghost" type="button" @click="$emit('resetDesign')">
        Reset design
      </button>
    </div>
    <p class="qr-export-note">Saved and exported locally. Nothing is uploaded.</p>
    <p
      v-if="saveMessage"
      class="qr-export-status"
      :class="{ 'is-error': saveState === 'error' }"
      :role="saveState === 'error' ? 'alert' : 'status'"
    >
      {{ saveMessage }}
    </p>
    <p
      v-if="exportMessage"
      class="qr-export-status"
      :class="{ 'is-error': exportState === 'error' }"
      :role="exportState === 'error' ? 'alert' : 'status'"
    >
      {{ exportMessage }}
    </p>
  </aside>
</template>
