<script setup lang="ts">
import QrPreview from './QrPreview.vue'

withDefaults(defineProps<{ name?: string; destination?: string; mode?: 'new' | 'edit' }>(), {
  name: 'Untitled event asset',
  destination: 'eventscope.demo/northstar/',
  mode: 'new'
})
</script>

<template>
  <div class="studio-grid">
    <section class="panel editor-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Content</p>
          <h2>Destination setup</h2>
        </div>
        <span class="step-count">01</span>
      </div>
      <label class="field-label">Asset name<input :value="name" type="text" /></label>
      <label class="field-label">Destination URL<input :value="destination" type="url" /></label>
      <label class="field-label"
        >Campaign<select>
          <option>Northstar Launch</option>
          <option>Orbit Partner Preview</option>
        </select></label
      >
      <div class="field-group">
        <span class="field-label">Placement context</span>
        <div class="choice-row">
          <button class="choice-button choice-button--active" type="button">Venue</button
          ><button class="choice-button" type="button">Print</button
          ><button class="choice-button" type="button">Screen</button>
        </div>
      </div>
      <div class="section-heading section-heading--divider">
        <div>
          <p class="eyebrow">Appearance</p>
          <h2>Visual direction</h2>
        </div>
        <span class="step-count">02</span>
      </div>
      <div class="swatch-row" aria-label="Accent color">
        <button
          v-for="color in ['#5eead4', '#ff8066', '#8ca6ff', '#f7c873']"
          :key="color"
          type="button"
          class="color-swatch"
          :style="{ backgroundColor: color }"
          :aria-label="`Select ${color}`"
        />
      </div>
    </section>
    <aside class="panel preview-panel" aria-label="QR asset preview">
      <div class="preview-panel__top">
        <span class="eyebrow">Live preview</span><span class="future-label">Concept only</span>
      </div>
      <QrPreview />
      <div>
        <h2>{{ name }}</h2>
        <p>{{ destination }}</p>
      </div>
      <div class="future-notice">
        <strong>Export arrives in a later phase</strong
        ><span>This shell does not generate or download a real QR code.</span>
      </div>
      <button class="button button--primary button--full" type="button" disabled>
        {{ mode === 'new' ? 'Create QR asset' : 'Save changes' }}
      </button>
    </aside>
  </div>
</template>
