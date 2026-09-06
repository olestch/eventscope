<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReferenceCatalog } from '~/domain/events/models'
import { qrDesignConstraints } from '~/domain/qr/constraints'
import {
  qrFinderStyles,
  qrGradientDirections,
  qrModuleStyles,
  type QrStudioDraft,
  type QrValidationResult
} from '~/domain/qr/models'
import { updateDraftCampaign } from '~/features/qr/studio'

const props = defineProps<{
  draft: QrStudioDraft
  catalog: ReferenceCatalog
  validation: QrValidationResult
}>()
const emit = defineEmits<{ change: [draft: QrStudioDraft]; normalizeDestination: [] }>()
const { t } = useI18n()

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
const glyphIssue = computed(() =>
  props.validation.issues.find(({ code }) =>
    ['logo_glyph_required', 'logo_glyph_too_long'].includes(code)
  )
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
        <p class="eyebrow">{{ t('qr.studio.definition') }}</p>
        <h2 id="qr-config-title">{{ t('qr.studio.context') }}</h2>
      </div>
      <span class="step-count">01</span>
    </div>

    <label class="field-label"
      >{{ t('qr.studio.assetName') }}
      <input
        :value="draft.name"
        type="text"
        maxlength="80"
        autocomplete="off"
        @input="patch({ name: inputValue($event) })"
      />
    </label>
    <label class="field-label"
      >{{ t('qr.studio.destination') }}
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
      {{ t('qr.studio.destinationHelp') }}
    </p>
    <p v-if="destinationIssue" id="destination-error" class="field-error" role="alert">
      {{ t(`qr.validation.${destinationIssue.code}`, { min: 2, recommended: 4 }) }}
    </p>
    <div class="qr-metadata-grid">
      <label class="field-label"
        >{{ t('qr.studio.campaign') }}
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
        >{{ t('qr.studio.channel') }}
        <select :value="draft.channelId" @change="patch({ channelId: inputValue($event) })">
          <option v-for="item in channels" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="field-label"
        >{{ t('qr.studio.location') }}
        <select
          :value="draft.locationId ?? ''"
          @change="patch({ locationId: inputValue($event) || undefined })"
        >
          <option value="">{{ t('common.noLocation') }}</option>
          <option v-for="item in locations" :key="item.id" :value="item.id">
            {{ item.name }} · {{ item.city }}
          </option>
        </select>
      </label>
    </div>

    <div class="section-heading section-heading--divider">
      <div>
        <p class="eyebrow">{{ t('qr.studio.appearance') }}</p>
        <h2>{{ t('qr.studio.visualSystem') }}</h2>
      </div>
      <span class="step-count">02</span>
    </div>

    <div class="qr-choice-grid">
      <fieldset class="qr-choice-group">
        <legend>{{ t('qr.studio.modulePattern') }}</legend>
        <label v-for="style in qrModuleStyles" :key="style" class="qr-choice-card">
          <input
            type="radio"
            name="module-style"
            :value="style"
            :checked="draft.design.moduleStyle === style"
            @change="patchDesign({ moduleStyle: style })"
          />
          <span>{{ t(`qr.styles.${style}`) }}</span>
        </label>
      </fieldset>
      <fieldset class="qr-choice-group">
        <legend>{{ t('qr.studio.finderCorners') }}</legend>
        <label v-for="style in qrFinderStyles" :key="style" class="qr-choice-card">
          <input
            type="radio"
            name="finder-style"
            :value="style"
            :checked="draft.design.finderStyle === style"
            @change="patchDesign({ finderStyle: style })"
          />
          <span>{{ t(`qr.styles.${style}`) }}</span>
        </label>
      </fieldset>
    </div>

    <fieldset class="qr-color-group">
      <legend>{{ t('qr.studio.solidColors') }}</legend>
      <label class="color-field">
        <span>{{ t('qr.studio.foreground') }}</span>
        <input
          type="color"
          :value="draft.design.foreground"
          :aria-label="t('qr.studio.foreground')"
          @input="patchDesign({ foreground: inputValue($event) })"
        />
        <output>{{ draft.design.foreground }}</output>
      </label>
      <label class="color-field">
        <span>{{ t('qr.studio.background') }}</span>
        <input
          type="color"
          :value="draft.design.background"
          :aria-label="t('qr.studio.background')"
          @input="patchDesign({ background: inputValue($event) })"
        />
        <output>{{ draft.design.background }}</output>
      </label>
    </fieldset>

    <fieldset class="qr-option-block">
      <legend>{{ t('qr.studio.gradient') }}</legend>
      <label class="toggle-row">
        <input
          type="checkbox"
          :checked="draft.design.gradient.enabled"
          @change="patchGradient({ enabled: inputChecked($event) })"
        />
        <span>{{ t('qr.studio.useGradient') }}</span>
      </label>
      <div v-if="draft.design.gradient.enabled" class="qr-gradient-controls">
        <label class="color-field">
          <span>{{ t('qr.studio.start') }}</span>
          <input
            type="color"
            :value="draft.design.gradient.startColor"
            :aria-label="t('qr.studio.start')"
            @input="patchGradient({ startColor: inputValue($event) })"
          />
          <output>{{ draft.design.gradient.startColor }}</output>
        </label>
        <label class="color-field">
          <span>{{ t('qr.studio.end') }}</span>
          <input
            type="color"
            :value="draft.design.gradient.endColor"
            :aria-label="t('qr.studio.end')"
            @input="patchGradient({ endColor: inputValue($event) })"
          />
          <output>{{ draft.design.gradient.endColor }}</output>
        </label>
        <label class="field-label field-label--compact"
          >{{ t('qr.studio.direction') }}
          <select
            :value="draft.design.gradient.direction"
            @change="
              patchGradient({ direction: inputValue($event) as typeof draft.design.gradient.direction })
            "
          >
            <option v-for="direction in qrGradientDirections" :key="direction" :value="direction">
              {{ t(`qr.styles.${direction}`) }}
            </option>
          </select>
        </label>
      </div>
    </fieldset>

    <div class="qr-detail-grid">
      <fieldset class="qr-option-block">
        <legend>{{ t('qr.studio.quietZone') }}</legend>
        <label class="range-field">
          <span>{{ t('qr.studio.margin') }}</span>
          <input
            type="range"
            :min="qrDesignConstraints.margin.min"
            :max="qrDesignConstraints.margin.max"
            :step="qrDesignConstraints.margin.step"
            :value="draft.design.margin"
            aria-describedby="qr-margin-help"
            @input="patchDesign({ margin: Number(inputValue($event)) })"
          />
          <output>{{ t('qr.studio.modules', { count: draft.design.margin }) }}</output>
        </label>
        <p id="qr-margin-help" class="field-help">
          {{
            t('qr.studio.marginHelp', {
              min: qrDesignConstraints.margin.min,
              max: qrDesignConstraints.margin.max,
              recommended: qrDesignConstraints.margin.recommended
            })
          }}
        </p>
      </fieldset>
      <fieldset class="qr-option-block">
        <legend>{{ t('qr.studio.centerMark') }}</legend>
        <label class="toggle-row">
          <input
            type="checkbox"
            :checked="draft.design.logo.enabled"
            @change="patchLogo({ enabled: inputChecked($event) })"
          />
          <span>{{ t('qr.studio.showMark') }}</span>
        </label>
        <template v-if="draft.design.logo.enabled">
          <fieldset class="qr-mark-content-options">
            <legend>{{ t('qr.studio.markContent') }}</legend>
            <label class="qr-choice-card">
              <input
                type="radio"
                name="center-mark-content"
                value="eventscope"
                :checked="draft.design.logo.content.type === 'eventscope'"
                @change="patchLogo({ content: { type: 'eventscope' } })"
              />
              <span>{{ t('qr.studio.eventscopeMark') }}</span>
            </label>
            <label class="qr-choice-card">
              <input
                type="radio"
                name="center-mark-content"
                value="glyph"
                :checked="draft.design.logo.content.type === 'glyph'"
                @change="patchLogo({ content: { type: 'glyph', value: 'E' } })"
              />
              <span>{{ t('qr.studio.customGlyph') }}</span>
            </label>
          </fieldset>
          <label v-if="draft.design.logo.content.type === 'glyph'" class="field-label">
            {{ t('qr.studio.customGlyph') }}
            <input
              :value="draft.design.logo.content.value"
              type="text"
              autocomplete="off"
              :aria-describedby="
                glyphIssue ? 'center-mark-glyph-help center-mark-glyph-error' : 'center-mark-glyph-help'
              "
              :aria-invalid="Boolean(glyphIssue)"
              @input="patchLogo({ content: { type: 'glyph', value: inputValue($event) } })"
            />
          </label>
          <p
            v-if="draft.design.logo.content.type === 'glyph'"
            id="center-mark-glyph-help"
            class="field-help"
          >
            {{ t('qr.studio.glyphHelp') }}
          </p>
          <p
            v-if="glyphIssue && draft.design.logo.content.type === 'glyph'"
            id="center-mark-glyph-error"
            class="field-error"
            role="alert"
          >
            {{ t(`qr.validation.${glyphIssue.code}`) }}
          </p>
          <label class="range-field">
            <span>{{ t('qr.studio.badgeSize') }}</span>
            <input
              type="range"
              :min="qrDesignConstraints.centerMark.size.min"
              :max="qrDesignConstraints.centerMark.size.max"
              :step="qrDesignConstraints.centerMark.size.step"
              :value="draft.design.logo.size"
              aria-describedby="center-mark-size-help"
              @input="patchLogo({ size: Number(inputValue($event)) })"
            />
            <output>{{ Math.round(draft.design.logo.size * 100) }}%</output>
          </label>
          <p id="center-mark-size-help" class="field-help">
            {{
              t('qr.studio.sizeHelp', {
                min: qrDesignConstraints.centerMark.size.min * 100,
                max: qrDesignConstraints.centerMark.size.max * 100
              })
            }}
          </p>
        </template>
      </fieldset>
    </div>
  </section>
</template>
