<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'Methodology' })
const principles = [
  {
    number: '01',
    title: 'Source facts stay immutable',
    text: 'A seeded, versioned generator produces events across the fixed UTC reference period. Analytical queries derive results without mutating or decorating those source facts.'
  },
  {
    number: '02',
    title: 'Semantics before speed',
    text: 'The pure TypeScript engine uses straightforward scans and exact Sets for 10,000 events. Filters, distinct counts, conversion eligibility and UTC bucket boundaries are independently tested.'
  },
  {
    number: '03',
    title: 'Comparable raw results',
    text: 'Summary, breakdown, time-series, funnel and comparison results contain raw numbers, normalized queries and dataset fingerprint metadata—not formatted presentation strings.'
  },
  {
    number: '04',
    title: 'Honest product boundaries',
    text: 'Explorer summary and timeline values are now real analytical results. Workers, indexes, caches, chart libraries and million-event datasets remain explicitly deferred.'
  }
]
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      eyebrow="Methodology"
      title="A product shell with explicit evidence boundaries."
      description="How Phase 3 turns deterministic source facts into reproducible analytical results."
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        “A useful analytical product makes the limits of its evidence as legible as the signal.”
      </p>
      <div><span>Phase</span><strong>03 · Analytics Core</strong></div>
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
            <li>Pure summary and categorical breakdowns</li>
            <li>UTC time series with semantic buckets</li>
            <li>Ordered session funnels and comparisons</li>
            <li>Real Explorer metrics from the 10K dataset</li>
          </ul>
        </div>
        <div>
          <h3>Deliberately deferred</h3>
          <ul>
            <li>Web Worker and async execution protocol</li>
            <li>Indexes, typed storage and query cache</li>
            <li>Million-event generation and benchmarks</li>
            <li>Real QR generation or export</li>
            <li>PDF and presentation generation</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
