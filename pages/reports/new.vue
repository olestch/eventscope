<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
import { reportCatalog as reports } from '~/data/catalog/reportCatalog'
useHead({ title: 'New report' })
const sections = reports[0]!.sections
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="Reports / Builder"
      title="Compose a review narrative."
      description="Select a report structure around the same deterministic Northstar dataset."
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/reports">Cancel</NuxtLink></template
      ></PageHeader
    >
    <div class="builder-grid">
      <section class="panel builder-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Report setup</p>
            <h2>Northstar launch pulse</h2>
          </div>
          <span class="step-count">01</span>
        </div>
        <label class="field-label"
          >Report title<input value="Northstar launch pulse" type="text" /></label
        ><label class="field-label"
          >Period<select>
            <option>04–10 Mar 2026</option>
            <option>04–18 Mar 2026</option>
          </select></label
        ><label class="field-label"
          >Audience<select>
            <option>Event leadership</option>
            <option>Field operations</option>
          </select></label
        >
        <div class="section-heading section-heading--divider">
          <div>
            <p class="eyebrow">Structure</p>
            <h2>Included sections</h2>
          </div>
          <span class="step-count">02</span>
        </div>
        <ol class="section-picker">
          <li v-for="(section, index) in sections" :key="section.id">
            <span class="drag-handle" aria-hidden="true">⠿</span
            ><span
              ><strong>0{{ index + 1 }} · {{ section.title }}</strong
              ><small>{{ section.summary }}</small></span
            ><input type="checkbox" checked :aria-label="`Include ${section.title}`" />
          </li>
        </ol>
      </section>
      <aside class="panel builder-summary">
        <p class="eyebrow">Builder summary</p>
        <h2>3 sections selected</h2>
        <p>
          Preview uses fictional, fixed demonstration data. PDF and presentation exports are not
          implemented.
        </p>
        <div class="future-notice">
          <strong>Review-first workflow</strong
          ><span>Future phases can add generation after analysis contracts are defined.</span>
        </div>
        <button class="button button--primary button--full" type="button" disabled>
          Create report draft
        </button>
      </aside>
    </div>
  </div>
</template>
