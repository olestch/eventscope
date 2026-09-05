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
    text: 'Summary, timeline, breakdown, optional comparison and an active funnel share one query generation. The Explorer may retain the previous complete result while pending, but never combines partial generations.'
  },
  {
    number: '03',
    title: 'Charts emit intent, not analytics',
    text: 'ECharts events become semantic filter or period intents. Pure view models and equivalent table actions preserve the interaction boundary while aggregation remains behind the Analytics Gateway.'
  },
  {
    number: '04',
    title: 'The demo boundary is explicit',
    text: 'The self-contained portfolio uses a Worker-backed gateway. A production product could use an HTTP analytics service and warehouse without changing the Explorer contract.'
  }
]
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      eyebrow="Methodology"
      title="A product shell with explicit evidence boundaries."
      description="How Phase 6A connects observation, route-backed interaction, comparison and funnel exploration."
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        “A useful analytical product makes the limits of its evidence as legible as the signal.”
      </p>
      <div><span>Phase</span><strong>06A · Interactive exploration</strong></div>
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
            <li>Accessible equivalent actions and exact-value tables</li>
            <li>100K default and explicit 1M showcase</li>
          </ul>
        </div>
        <div>
          <h3>Deliberately deferred</h3>
          <ul>
            <li>Day/hour heatmap and chart brushing</li>
            <li>Custom comparison ranges and saved views</li>
            <li>Anomaly detection and map visualization</li>
            <li>Real QR generation or export</li>
            <li>PDF and presentation generation</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
