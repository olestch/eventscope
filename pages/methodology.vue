<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'Methodology' })
const principles = [
  {
    number: '01',
    title: 'The route owns the question',
    text: 'Manual filters and semantic chart interactions converge on one committed route. UTC dates, dimensions, comparison and active analytical workspace remain canonical and reloadable.'
  },
  {
    number: '02',
    title: 'Results publish together',
    text: 'Summary, timeline, breakdown, optional comparison and the active funnel or temporal result share one query generation. The Explorer may retain the previous complete result while pending, but never combines partial generations.'
  },
  {
    number: '03',
    title: 'Temporal evidence stays explainable',
    text: 'One Gateway operation returns all 168 UTC weekday/hour cells. Small deterministic rules summarize only that aggregate, with explicit thresholds and no ML or anomaly language.'
  },
  {
    number: '04',
    title: 'Studio output stays local',
    text: 'QR Studio validates and renders one deterministic SVG, then stores configuration behind a typed browser-local repository. It never claims cloud durability, a redirect or a recorded scan.'
  },
  {
    number: '05',
    title: 'Report generation belongs behind a gateway',
    text: 'Reports reuse the normalized AnalyticsQuery, then submit a typed request to a deterministic demo gateway. The UI models asynchronous jobs and downloads without rendering a user-specific PDF in the browser.'
  },
  {
    number: '06',
    title: 'The demo boundary is explicit',
    text: 'The self-contained portfolio uses a Worker-backed analytics gateway, a local QR editor and an in-memory Reports adapter. Production services could replace those edges without moving business rules into Vue.'
  }
]
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      eyebrow="Methodology"
      title="A product shell with explicit evidence boundaries."
      description="How EventScope separates analytics evidence, local QR design and future production services."
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        “A useful analytical product makes the limits of its evidence as legible as the signal.”
      </p>
      <div><span>Phase</span><strong>09 · Reports workflow</strong></div>
    </section>
    <section class="principle-list">
      <article v-for="principle in principles" :key="principle.number">
        <span>{{ principle.number }}</span>
        <div>
          <h2>{{ principle.title }}</h2>
          <p>{{ principle.text }}</p>
        </div>
      </article>
    </section>
    <section class="scope-table panel">
      <div>
        <p class="eyebrow">Delivery boundary</p>
        <h2>What this phase proves</h2>
      </div>
      <div class="scope-columns">
        <div>
          <h3>Implemented now</h3>
          <ul>
            <li>Breakdown cross-filtering and timeline period drilldown</li>
            <li>Route-backed previous-period comparison</li>
            <li>Ordered session funnel under the committed filter scope</li>
            <li>Monday-first UTC weekday × hour heatmap</li>
            <li>Thresholded deterministic temporal insights</li>
            <li>Accessible equivalent actions and exact-value tables</li>
            <li>100K default and explicit 1M showcase</li>
            <li>Matrix-backed QR Studio with SVG and PNG export</li>
            <li>Typed URL, contrast, quiet-zone and logo validation</li>
            <li>Versioned browser-local QR repository and saved-asset CRUD</li>
            <li>Read-only Scenario QR connected to URL-backed Explorer analytics</li>
            <li>Typed asynchronous report jobs using the same AnalyticsQuery scope</li>
            <li>Structural report preview and real static demo PDF download</li>
          </ul>
        </div>
        <div>
          <h3>Deliberately deferred</h3>
          <ul>
            <li>Recurring weekday/hour filters and chart brushing</li>
            <li>Custom comparison ranges and saved views</li>
            <li>Anomaly detection and map visualization</li>
            <li>Tracked redirects, cloud persistence and analytics for user-saved QR</li>
            <li>Backend report rendering, storage, signed delivery and audit history</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
