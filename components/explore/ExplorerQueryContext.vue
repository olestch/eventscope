<script setup lang="ts">
import type { AnalyticsDatasetMetadata } from '~/services/analytics/AnalyticsGateway'
import type { ExplorerQueryState } from '~/features/explorer/queryState'
import {
  breakdownLabels,
  formatCount,
  formatInclusiveRange,
  measureLabels,
  workspaceLabels
} from '~/features/explorer/presentation'

defineProps<{
  state: ExplorerQueryState
  metadata?: AnalyticsDatasetMetadata
  scopeLabel: string
  qrContextLabel?: string
}>()
</script>

<template>
  <section class="query-context" aria-label="Committed query context">
    <div>
      <span>Dataset</span><strong>{{ state.profile === 'showcase' ? '1M showcase' : '100K' }}</strong>
    </div>
    <div>
      <span>Loaded events</span
      ><strong>{{ metadata ? formatCount(metadata.eventCount) : 'Preparing' }}</strong>
    </div>
    <div>
      <span>Date range</span><strong>{{ formatInclusiveRange(state.startDate, state.endDate) }}</strong>
    </div>
    <div>
      <span>Scope</span><strong>{{ scopeLabel }}</strong>
    </div>
    <div v-if="qrContextLabel">
      <span>Scenario QR</span><strong>{{ qrContextLabel }}</strong>
    </div>
    <div>
      <span>Breakdown</span><strong>{{ breakdownLabels[state.breakdown] }}</strong>
    </div>
    <div>
      <span>Comparison</span
      ><strong>{{ state.comparison === 'previous' ? 'Previous period' : 'None' }}</strong>
    </div>
    <div>
      <span>Workspace</span><strong>{{ workspaceLabels[state.view] }}</strong>
    </div>
    <div v-if="state.view === 'temporal'">
      <span>Temporal measure</span><strong>{{ measureLabels[state.temporalMeasure] }}</strong>
    </div>
  </section>
</template>
