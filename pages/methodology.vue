<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
useHead({ title: 'Methodology' })
const principles = [
  {
    number: '01',
    title: 'Deterministic by design',
    text: 'Every date, metric and relationship is fixed in source-controlled demo data. No random values or current-time dependencies are used.'
  },
  {
    number: '02',
    title: 'Directional, not causal',
    text: 'The interface frames correlations as questions to validate. It does not claim that a schedule moment caused an engagement change.'
  },
  {
    number: '03',
    title: 'Honest product boundaries',
    text: 'Charts are accessible SVG mockups. Analytics, anomaly detection, QR generation and document export are planned capabilities, not hidden implementations.'
  },
  {
    number: '04',
    title: 'Portfolio-safe provenance',
    text: 'Northstar Launch, its locations and its people are fictional. No commercial code or customer data is included.'
  }
]
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      eyebrow="Methodology"
      title="A product shell with explicit evidence boundaries."
      description="How the Phase 1 experience stays coherent, reproducible and honest."
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        “A useful analytical product makes the limits of its evidence as legible as the signal.”
      </p>
      <div><span>Phase</span><strong>01 · Foundation</strong></div>
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
            <li>Nuxt application shell and routes</li>
            <li>Typed, relational demo story</li>
            <li>Responsive workflows and accessible states</li>
            <li>Explorer, QR and report product surfaces</li>
          </ul>
        </div>
        <div>
          <h3>Deliberately deferred</h3>
          <ul>
            <li>Analytics and anomaly engines</li>
            <li>Real QR generation or export</li>
            <li>PDF and presentation generation</li>
            <li>Backend, authentication and live data</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
