<script setup lang="ts">
import { computed } from 'vue'
import type { ReferenceCatalog } from '~/domain/events/models'
import {
  qrFinderStyles,
  qrGradientDirections,
  qrModuleStyles,
  type QrStudioDraft,
  type QrValidationResult
} from '~/domain/qr/models'
import {
  qrFinderStyleLabels,
  qrGradientDirectionLabels,
  qrModuleStyleLabels
} from '~/features/qr/presentation'
import { updateDraftCampaign } from '~/features/qr/studio'

const props = defineProps<{
  draft: QrStudioDraft
  catalog: ReferenceCatalog
  validation: QrValidationResult
}>()
const emit = defineEmits<{ change: [draft: QrStudioDraft]; normalizeDestination: [] }>()

const campaign = computed(() => props.catalog.campaigns.find(({ id }) => id === props.draft.campaignId))
const channels = computed(() =>
  props.catalog.channels.filter(({ id }) => campaign.value?.channelIds.includes(id))
)
const locations = computed(() =>
  props.catalog.locations.filter(({ id }) => campaign.value?.locationIds.includes(id))
)
const destinationIssue = computed(() =>
  props.validation.issues.find(({ field }) => field === 'destination')
)

const inputValue = (event: Event): string => (event.target as HTMLInputElement).value
const inputChecked = (event: Event): boolean => (event.target as HTMLInputElement).checked
const patch = (value: Partial<QrStudioDraft>) => emit('change', { ...props.draft, ...value })
const patchDesign = (value: Partial<QrStudioDraft['design']>) =>
  patch({ design: { ...props.draft.design, ...value } })
const patchGradient = (value: Partial<QrStudioDraft['design']['gradient']>) =>
  patchDesign({ gradient: { ...props.draft.design.gradient, ...value } })
const patchLogo = (value: Partial<QrStudioDraft['design']['logo']>) =>
  patchDesign({ logo: { ...props.draft.design.logo, ...value } })
</script>

<template>
  <section class="panel qr-config-panel" aria-labelledby="qr-config-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Definition</p>
        <h2 id="qr-config-title">Campaign context</h2>
      </div>
      <span class="step-count">01</span>
    </div>

    <label class="field-label"
      >Asset name
      <input
        :value="draft.name"
        type="text"
        maxlength="80"
        autocomplete="off"
        @input="patch({ name: inputValue($event) })"
      />
    </label>
    <label class="field-label"
      >Destination URL
      <input
        :value="draft.destination"
        type="url"
        inputmode="url"
        autocomplete="url"
        :aria-describedby="destinationIssue ? 'destination-help destination-error' : 'destination-help'"
        :aria-invalid="Boolean(destinationIssue)"
        @input="patch({ destination: inputValue($event) })"
        @blur="emit('normalizeDestination')"
      />
    </label>
    <p id="destination-help" class="field-help">
      Encoded directly for this frontend demo. Use an absolute HTTPS URL.
    </p>
    <p v-if="destinationIssue" id="destination-error" class="field-error" role="alert">
      {{ destinationIssue.message }}
    </p>
    <div class="qr-metadata-grid">
      <label class="field-label"
        >Campaign
        <select
          :value="draft.campaignId"
          @change="emit('change', updateDraftCampaign(draft, inputValue($event), catalog))"
        >
          <option v-for="item in catalog.campaigns" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="field-label"
        >Channel
        <select :value="draft.channelId" @change="patch({ channelId: inputValue($event) })">
          <option v-for="item in channels" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="field-label"
        >Location
        <select
          :value="draft.locationId ?? ''"
          @change="patch({ locationId: inputValue($event) || undefined })"
        >
          <option value="">No location</option>
          <option v-for="item in locations" :key="item.id" :value="item.id">
            {{ item.name }} · {{ item.city }}
          </option>
        </select>
      </label>
    </div>

    <div class="section-heading section-heading--divider">
      <div>
        <p class="eyebrow">Appearance</p>
        <h2>Visual system</h2>
      </div>
      <span class="step-count">02</span>
    </div>

    <div class="qr-choice-grid">
      <fieldset class="qr-choice-group">
        <legend>Module pattern</legend>
        <label v-for="style in qrModuleStyles" :key="style" class="qr-choice-card">
          <input
            type="radio"
            name="module-style"
            :value="style"
            :checked="draft.design.moduleStyle === style"
            @change="patchDesign({ moduleStyle: style })"
          />
          <span>{{ qrModuleStyleLabels[style] }}</span>
        </label>
      </fieldset>
      <fieldset class="qr-choice-group">
        <legend>Finder corners</legend>
        <label v-for="style in qrFinderStyles" :key="style" class="qr-choice-card">
          <input
            type="radio"
            name="finder-style"
            :value="style"
            :checked="draft.design.finderStyle === style"
            @change="patchDesign({ finderStyle: style })"
          />
          <span>{{ qrFinderStyleLabels[style] }}</span>
        </label>
      </fieldset>
    </div>

    <fieldset class="qr-color-group">
      <legend>Solid colors</legend>
      <label class="color-field">
        <span>Foreground</span>
        <input
          type="color"
          :value="draft.design.foreground"
          aria-label="Foreground color"
          @input="patchDesign({ foreground: inputValue($event) })"
        />
        <output>{{ draft.design.foreground }}</output>
      </label>
      <label class="color-field">
        <span>Background</span>
        <input
          type="color"
          :value="draft.design.background"
          aria-label="Background color"
          @input="patchDesign({ background: inputValue($event) })"
        />
        <output>{{ draft.design.background }}</output>
      </label>
    </fieldset>

    <fieldset class="qr-option-block">
      <legend>Linear gradient</legend>
      <label class="toggle-row">
        <input
          type="checkbox"
          :checked="draft.design.gradient.enabled"
          @change="patchGradient({ enabled: inputChecked($event) })"
        />
        <span>Use a two-color gradient</span>
      </label>
      <div v-if="draft.design.gradient.enabled" class="qr-gradient-controls">
        <label class="color-field">
          <span>Start</span>
          <input
            type="color"
            :value="draft.design.gradient.startColor"
            aria-label="Gradient start color"
            @input="patchGradient({ startColor: inputValue($event) })"
          />
          <output>{{ draft.design.gradient.startColor }}</output>
        </label>
        <label class="color-field">
          <span>End</span>
          <input
            type="color"
            :value="draft.design.gradient.endColor"
            aria-label="Gradient end color"
            @input="patchGradient({ endColor: inputValue($event) })"
          />
          <output>{{ draft.design.gradient.endColor }}</output>
        </label>
        <label class="field-label field-label--compact"
          >Direction
          <select
            :value="draft.design.gradient.direction"
            @change="
              patchGradient({ direction: inputValue($event) as typeof draft.design.gradient.direction })
            "
          >
            <option v-for="direction in qrGradientDirections" :key="direction" :value="direction">
              {{ qrGradientDirectionLabels[direction] }}
            </option>
          </select>
        </label>
      </div>
    </fieldset>

    <div class="qr-detail-grid">
      <fieldset class="qr-option-block">
        <legend>Quiet zone</legend>
        <label class="range-field">
          <span>Margin</span>
          <input
            type="range"
            min="0"
            max="8"
            step="1"
            :value="draft.design.margin"
            @input="patchDesign({ margin: Number(inputValue($event)) })"
          />
          <output>{{ draft.design.margin }} modules</output>
        </label>
      </fieldset>
      <fieldset class="qr-option-block">
        <legend>Center mark</legend>
        <label class="toggle-row">
          <input
            type="checkbox"
            :checked="draft.design.logo.enabled"
            @change="patchLogo({ enabled: inputChecked($event) })"
          />
          <span>Show EventScope mark</span>
        </label>
        <label v-if="draft.design.logo.enabled" class="range-field">
          <span>Logo size</span>
          <input
            type="range"
            min="0.12"
            max="0.22"
            step="0.01"
            :value="draft.design.logo.size"
            @input="patchLogo({ size: Number(inputValue($event)) })"
          />
          <output>{{ Math.round(draft.design.logo.size * 100) }}%</output>
        </label>
      </fieldset>
    </div>
  </section>
</template>
