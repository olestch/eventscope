<script setup lang="ts">
import FilterChips from '~/components/explore/FilterChips.vue'
import TimelineMock from '~/components/explore/TimelineMock.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { phaseOneExplorerSnapshot as explorerSnapshot } from '~/data/presentation/phaseOneSnapshot'

useHead({ title: 'Explore' })
const catalog = eventDatasetProvider.getCatalog()
const dataset = eventDatasetProvider.getDataset('development')
const campaign = catalog.campaigns.find((item) => item.id === explorerSnapshot.campaignId)!
const locations = campaign.locationIds.map((id) =>
  catalog.locations.find((location) => location.id === id)!
)
</script>

<template>
  <div class="page">
    <PageHeader
      eyebrow="Explorer / Northstar Launch"
      title="Read the signal, then ask the next question."
      description="A focused workspace for comparing event engagement across locations and time."
    >
      <template #actions
        ><NuxtLink class="button button--secondary" to="/reports/new"
          >Build report <span aria-hidden="true">↗</span></NuxtLink
        ></template
      >
    </PageHeader>

    <section class="context-strip" aria-label="Dataset context">
      <div>
        <span>Campaign</span><strong>{{ campaign.name }}</strong>
      </div>
      <div>
        <span>Date range</span><strong>{{ explorerSnapshot.period }}</strong>
      </div>
      <div><span>Breakdown</span><strong>Daily · Location</strong></div>
      <div>
        <span>Comparison</span><strong>{{ explorerSnapshot.previousPeriod }}</strong>
      </div>
      <StatusBadge :label="`${dataset.eventCount.toLocaleString('en-US')} source events`" tone="draft" />
    </section>
    <FilterChips :filters="explorerSnapshot.filters" />

    <section class="metric-grid" aria-label="Campaign summary">
      <article v-for="metric in explorerSnapshot.metrics" :key="metric.label" class="metric-card">
        <div class="metric-card__top">
          <span>{{ metric.label }}</span
          ><span aria-hidden="true">↗</span>
        </div>
        <strong>{{ metric.value }}</strong
        ><StatusBadge :label="metric.change" :tone="metric.tone" />
      </article>
    </section>

    <TimelineMock :points="explorerSnapshot.timeline" />

    <section class="analysis-grid">
      <article class="panel insight-panel">
        <div class="insight-panel__label">
          <span class="pulse-icon" aria-hidden="true">✦</span><span>Analyst note</span>
        </div>
        <h2>Harbor momentum leads the period</h2>
        <p>{{ explorerSnapshot.insight }}</p>
        <div class="confidence-line"><span>Context confidence</span><strong>Directional</strong></div>
      </article>
      <article class="panel location-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Location context</p>
            <h2>Contribution snapshot</h2>
          </div>
          <NuxtLink to="/qr">Open QR studio</NuxtLink>
        </div>
        <ol class="location-list">
          <li v-for="(location, index) in locations" :key="location.id">
            <span class="location-rank">0{{ index + 1 }}</span>
            <div>
              <strong>{{ location.name }}</strong
              ><small>{{ location.city }} · {{ location.region }}</small>
            </div>
            <span>{{ [44, 33, 23][index] }}%</span>
          </li>
        </ol>
      </article>
    </section>

    <section class="next-step-card">
      <div>
        <p class="eyebrow">Continue the workflow</p>
        <h2>Turn this view into a shared narrative.</h2>
        <p>
          Use the report builder to select a review-ready structure. Export remains intentionally out of
          scope.
        </p>
      </div>
      <NuxtLink class="button button--primary" to="/reports/new">Start report</NuxtLink>
    </section>
  </div>
</template>
