<script setup lang="ts">
import FilterChips from '~/components/explore/FilterChips.vue'
import TimelineMock from '~/components/explore/TimelineMock.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import { useEventAnalytics } from '~/composables/useEventAnalytics'

useHead({ title: 'Explore' })
const { dataset, catalog, analytics } = useEventAnalytics('development')
const campaignId = 'cmp-northstar'
const campaign = catalog.campaigns.find(({ id }) => id === campaignId)!
const range = { start: campaign.period.start, end: '2026-03-19T00:00:00.000Z' }
const baseQuery = { range, campaignIds: [campaignId] }

const summary = analytics.summary({
  ...baseQuery,
  measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
})
const series = analytics.timeSeries({
  ...baseQuery,
  measures: ['events', 'qr_scans'],
  bucket: { kind: 'fixed', size: '1d' }
})
const locationBreakdown = analytics.breakdown({
  ...baseQuery,
  measures: ['sessions'],
  breakdown: 'location'
})

const formatInteger = (value = 0) => value.toLocaleString('en-US')
const metrics = [
  {
    label: 'Source events',
    value: formatInteger(summary.values.events),
    note: 'Immutable facts',
    tone: 'neutral' as const
  },
  {
    label: 'Unique sessions',
    value: formatInteger(summary.values.sessions),
    note: 'Exact IDs',
    tone: 'positive' as const
  },
  {
    label: 'QR scans',
    value: formatInteger(summary.values.qr_scans),
    note: 'Scan events',
    tone: 'positive' as const
  },
  {
    label: 'Conversion rate',
    value: `${((summary.values.conversion_rate ?? 0) * 100).toFixed(1)}%`,
    note: `${formatInteger(summary.values.conversions)} sessions`,
    tone: 'draft' as const
  }
]

const dateLabel = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC'
})
const timeline = series.points.map((point) => ({
  label: dateLabel.format(new Date(point.range.start)),
  events: point.values.events ?? 0,
  qrScans: point.values.qr_scans ?? 0
}))
const locationSessions = locationBreakdown.rows.reduce(
  (total, row) => total + (row.values.sessions ?? 0),
  0
)
const locations = locationBreakdown.rows.map((row) => ({
  location: catalog.locations.find(({ id }) => id === row.key)!,
  share: locationSessions ? Math.round(((row.values.sessions ?? 0) / locationSessions) * 100) : 0
}))
const filters = [campaign.name, 'All locations', 'Daily', 'UTC']
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
      <div><span>Date range</span><strong>04–18 Mar 2026</strong></div>
      <div><span>Breakdown</span><strong>Daily · Location</strong></div>
      <div><span>Engine</span><strong>Pure scan · UTC</strong></div>
      <StatusBadge :label="`${dataset.eventCount.toLocaleString('en-US')} source events`" tone="draft" />
    </section>
    <FilterChips :filters="filters" />

    <section class="metric-grid" aria-label="Campaign summary">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <div class="metric-card__top">
          <span>{{ metric.label }}</span
          ><span aria-hidden="true">↗</span>
        </div>
        <strong>{{ metric.value }}</strong
        ><StatusBadge :label="metric.note" :tone="metric.tone" />
      </article>
    </section>

    <TimelineMock :points="timeline" />

    <section class="analysis-grid">
      <article class="panel insight-panel">
        <div class="insight-panel__label">
          <span class="pulse-icon" aria-hidden="true">✦</span><span>Analytical result</span>
        </div>
        <h2>Generated facts now drive this view</h2>
        <p>
          The summary, timeline and location contribution are calculated by the pure Analytics Core from
          the deterministic development dataset. Scenario rules remain synthetic and directional.
        </p>
        <div class="confidence-line">
          <span>Dataset fingerprint</span><strong>{{ dataset.fingerprint }}</strong>
        </div>
      </article>
      <article class="panel location-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Location context</p>
            <h2>Session contribution</h2>
          </div>
          <NuxtLink to="/qr">Open QR studio</NuxtLink>
        </div>
        <ol class="location-list">
          <li v-for="({ location, share }, index) in locations" :key="location.id">
            <span class="location-rank">0{{ index + 1 }}</span>
            <div>
              <strong>{{ location.name }}</strong
              ><small>{{ location.city }} · {{ location.region }}</small>
            </div>
            <span>{{ share }}%</span>
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
