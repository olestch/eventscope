<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FilterChips from '~/components/explore/FilterChips.vue'
import TimelineMock from '~/components/explore/TimelineMock.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import { useEventAnalytics } from '~/composables/useEventAnalytics'
import type { BreakdownResult, SummaryResult, TimeSeriesResult } from '~/domain/analytics/contracts'
import type { DatasetProfile } from '~/domain/events/models'
import { SupersededRequestError } from '~/services/analytics/AnalyticsWorkerClient'

useHead({ title: 'Explore' })
const analytics = useEventAnalytics()
const campaignId = 'cmp-northstar'
const campaign = analytics.catalog.campaigns.find(({ id }) => id === campaignId)!
const range = { start: campaign.period.start, end: '2026-03-19T00:00:00.000Z' }
const baseQuery = { range, campaignIds: [campaignId] }
const profileOptions: Array<{ id: DatasetProfile; label: string; count: number }> = [
  { id: 'large', label: '100K default', count: 100_000 },
  { id: 'showcase', label: '1M showcase', count: 1_000_000 }
]

const selectedProfile = ref<DatasetProfile>(analytics.state.requestedProfile)
const summary = ref<SummaryResult>()
const series = ref<TimeSeriesResult>()
const locationBreakdown = ref<BreakdownResult>()
const queryPending = ref(false)
const queryError = ref<string>()
const completionMessage = ref('')
let queryToken = 0
let profileToken = 0

const progressLabels = {
  preparing_catalog: 'Preparing the reference catalog',
  generating_events: 'Generating deterministic source events',
  preparing_analytics_storage: 'Compiling analytical columns'
} as const
const expectedProfile = computed(() =>
  profileOptions.find(({ id }) => id === analytics.state.requestedProfile)
)
const hasResults = computed(() => Boolean(summary.value && series.value && locationBreakdown.value))
const formatInteger = (value = 0) => value.toLocaleString('en-US')
const metrics = computed(() => [
  {
    label: 'Source events',
    value: formatInteger(summary.value?.values.events),
    note: 'Immutable facts',
    tone: 'neutral' as const
  },
  {
    label: 'Unique sessions',
    value: formatInteger(summary.value?.values.sessions),
    note: 'Exact IDs',
    tone: 'positive' as const
  },
  {
    label: 'QR scans',
    value: formatInteger(summary.value?.values.qr_scans),
    note: 'Scan events',
    tone: 'positive' as const
  },
  {
    label: 'Conversion rate',
    value: `${((summary.value?.values.conversion_rate ?? 0) * 100).toFixed(1)}%`,
    note: `${formatInteger(summary.value?.values.conversions)} sessions`,
    tone: 'draft' as const
  }
])

const dateLabel = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC'
})
const timeline = computed(() =>
  (series.value?.points ?? []).map((point) => ({
    label: dateLabel.format(new Date(point.range.start)),
    events: point.values.events ?? 0,
    qrScans: point.values.qr_scans ?? 0
  }))
)
const locations = computed(() => {
  const rows = locationBreakdown.value?.rows ?? []
  const sessions = rows.reduce((total, row) => total + (row.values.sessions ?? 0), 0)
  return rows.map((row) => ({
    location: analytics.catalog.locations.find(({ id }) => id === row.key)!,
    share: sessions ? Math.round(((row.values.sessions ?? 0) / sessions) * 100) : 0
  }))
})
const filters = [campaign.name, 'All locations', 'Daily', 'UTC']

async function runDashboardQuery() {
  const token = ++queryToken
  queryPending.value = true
  queryError.value = undefined
  completionMessage.value = hasResults.value
    ? 'Refreshing analytics; the previous result remains visible.'
    : 'Running the initial analytical query.'
  try {
    const [nextSummary, nextSeries, nextBreakdown] = await Promise.all([
      analytics.summary({
        ...baseQuery,
        measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
      }),
      analytics.timeSeries({
        ...baseQuery,
        measures: ['events', 'qr_scans'],
        bucket: { kind: 'fixed', size: '1d' }
      }),
      analytics.breakdown({ ...baseQuery, measures: ['sessions'], breakdown: 'location' })
    ])
    if (token !== queryToken) return
    summary.value = nextSummary
    series.value = nextSeries
    locationBreakdown.value = nextBreakdown
    completionMessage.value = `Analytics ready for ${nextSummary.metadata.matchedEventCount.toLocaleString('en-US')} matching events.`
  } catch (error) {
    if (error instanceof SupersededRequestError || token !== queryToken) return
    queryError.value = error instanceof Error ? error.message : String(error)
    completionMessage.value = 'The analytical query failed. The previous result remains available.'
  } finally {
    if (token === queryToken) queryPending.value = false
  }
}

async function activateProfile(profile: DatasetProfile) {
  const token = ++profileToken
  selectedProfile.value = profile
  completionMessage.value = hasResults.value
    ? `Preparing ${profile === 'showcase' ? '1M showcase' : '100K'}; showing the previous result meanwhile.`
    : ''
  try {
    await analytics.initialize(profile)
    if (token === profileToken) await runDashboardQuery()
  } catch (error) {
    if (!(error instanceof SupersededRequestError) && token === profileToken) {
      queryError.value = error instanceof Error ? error.message : String(error)
      completionMessage.value = 'Dataset initialization failed. Choose Retry to recreate the Worker.'
    }
  }
}

onMounted(() => {
  if (
    analytics.state.status === 'ready' &&
    analytics.state.metadata?.profile === selectedProfile.value
  ) {
    void runDashboardQuery()
  } else {
    void activateProfile(selectedProfile.value)
  }
})
onBeforeUnmount(() => {
  queryToken += 1
  profileToken += 1
})
</script>

<template>
  <div class="page">
    <PageHeader
      eyebrow="Explorer / Northstar Launch"
      title="Read the signal, then ask the next question."
      description="A responsive Worker-backed workspace for comparing event engagement across locations and time."
    >
      <template #actions>
        <NuxtLink class="button button--secondary" to="/reports/new">
          Build report <span aria-hidden="true">↗</span>
        </NuxtLink>
      </template>
    </PageHeader>

    <section class="worker-toolbar" aria-label="Dataset profile">
      <div>
        <span class="worker-toolbar__label">Dataset profile</span>
        <div class="profile-switch">
          <button
            v-for="profile in profileOptions"
            :key="profile.id"
            type="button"
            :class="{ 'profile-switch__button--active': selectedProfile === profile.id }"
            :aria-pressed="selectedProfile === profile.id"
            @click="activateProfile(profile.id)"
          >
            {{ profile.label }}
          </button>
        </div>
      </div>
      <button
        v-if="analytics.state.status === 'error'"
        class="button button--secondary"
        type="button"
        @click="activateProfile(selectedProfile)"
      >
        Retry Worker
      </button>
      <button
        v-else
        class="button button--secondary"
        type="button"
        :disabled="analytics.state.status !== 'ready'"
        @click="runDashboardQuery"
      >
        {{ queryPending ? 'Query pending…' : 'Refresh query' }}
      </button>
    </section>

    <p
      class="async-status"
      :role="analytics.state.status === 'error' || queryError ? 'alert' : 'status'"
      :aria-live="analytics.state.status === 'error' || queryError ? undefined : 'polite'"
    >
      <template v-if="analytics.state.status === 'generating'">
        {{ progressLabels[analytics.state.progressStage || 'preparing_catalog'] }} for
        {{ expectedProfile?.count.toLocaleString('en-US') }} events.
      </template>
      <template v-else>{{ completionMessage }}</template>
    </p>

    <section class="context-strip" aria-label="Dataset context">
      <div>
        <span>Campaign</span><strong>{{ campaign.name }}</strong>
      </div>
      <div><span>Date range</span><strong>04–18 Mar 2026</strong></div>
      <div><span>Breakdown</span><strong>Daily · Location</strong></div>
      <div><span>Engine</span><strong>Columnar Worker · UTC</strong></div>
      <StatusBadge
        :label="`${(analytics.state.metadata?.eventCount || expectedProfile?.count || 0).toLocaleString(
          'en-US'
        )} source events`"
        tone="draft"
      />
    </section>
    <FilterChips :filters="filters" />

    <StatePanel
      v-if="!hasResults && analytics.state.status === 'generating'"
      state="loading"
      title="Preparing analytics in a Worker"
      description="Navigation and controls remain available while deterministic events and analytical columns are prepared."
    />
    <StatePanel
      v-else-if="!hasResults && (analytics.state.status === 'error' || queryError)"
      state="error"
      title="Analytics could not start"
      :description="queryError || analytics.state.error || 'The Worker stopped unexpectedly.'"
    >
      <button class="button button--primary" type="button" @click="activateProfile(selectedProfile)">
        Retry
      </button>
    </StatePanel>

    <div
      v-if="hasResults"
      class="results-shell"
      :class="{ 'results-shell--pending': queryPending }"
      :aria-busy="queryPending"
    >
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
            <span class="pulse-icon" aria-hidden="true">✦</span><span>Worker result</span>
          </div>
          <h2>Generated facts stay off the main thread</h2>
          <p>
            Dataset generation, column compilation and analytical execution run inside a dedicated
            Worker. Only typed metadata and results reach this presentation layer.
          </p>
          <div class="confidence-line">
            <span>Dataset fingerprint</span><strong>{{ analytics.state.metadata?.fingerprint }}</strong>
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
    </div>

    <StatePanel
      v-if="hasResults && summary?.metadata.emptyReason"
      state="no-results"
      title="No matching events"
      description="The query completed successfully but the selected context has no source events."
    />

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
