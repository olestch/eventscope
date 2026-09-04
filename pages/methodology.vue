<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'Methodology' })
const principles = [
  {
    number: '01',
    title: 'Semantics remain the reference',
    text: 'The readable Phase 3 engine remains the oracle for UTC ranges, exact distinct counts, conversion eligibility, buckets, funnels and comparisons. Differential tests guard the optimized path.'
  },
  {
    number: '02',
    title: 'Storage follows evidence',
    text: 'Measured object scans became expensive at 100K and 1M. Runtime execution therefore uses dictionary-coded typed columns while public domain events remain readable.'
  },
  {
    number: '03',
    title: 'Heavy work stays isolated',
    text: 'A dedicated Worker owns deterministic generation, integrity validation, analytical storage and queries. Vue receives only progress, metadata and typed results.'
  },
  {
    number: '04',
    title: 'Honest product boundaries',
    text: 'Explorer defaults to 100K because measured 1M initialization is perceptible. The real 1M profile remains explicitly selectable; benchmark figures are local diagnostics, not universal claims.'
  }
]
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      eyebrow="Methodology"
      title="A product shell with explicit evidence boundaries."
      description="How Phase 4 scales deterministic analytics without changing their meaning."
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        “A useful analytical product makes the limits of its evidence as legible as the signal.”
      </p>
      <div><span>Phase</span><strong>04 · Worker execution</strong></div>
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
            <li>Deterministic 320, 10K, 100K and 1M profiles</li>
            <li>Columnar runtime equivalent to the reference engine</li>
            <li>Typed Worker lifecycle and logical supersession</li>
            <li>Async Explorer with 100K default and 1M showcase</li>
          </ul>
        </div>
        <div>
          <h3>Deliberately deferred</h3>
          <ul>
            <li>Full cross-filter Explorer interactions</li>
            <li>Universal indexes, preaggregations and query cache</li>
            <li>SharedArrayBuffer or multi-worker execution</li>
            <li>Real QR generation or export</li>
            <li>PDF and presentation generation</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
