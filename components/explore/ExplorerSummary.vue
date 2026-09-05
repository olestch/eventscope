<script setup lang="ts">
import { computed } from 'vue'
import type { SummaryResult } from '~/domain/analytics/contracts'
import {
  formatCount,
  formatPercentage,
  type ComparisonViewModel
} from '~/features/explorer/presentation'
import type { ExplorerComparison } from '~/features/explorer/queryState'

const props = defineProps<{
  result: SummaryResult
  comparison?: ComparisonViewModel
  comparisonMode: ExplorerComparison
}>()
const emit = defineEmits<{ comparison: [mode: ExplorerComparison] }>()
const metrics = computed(() => [
  {
    measure: 'events' as const,
    label: 'Events',
    value: formatCount(props.result.values.events),
    note: 'Source facts'
  },
  {
    measure: 'sessions' as const,
    label: 'Sessions',
    value: formatCount(props.result.values.sessions),
    note: 'Distinct IDs'
  },
  {
    measure: 'conversions' as const,
    label: 'Conversions',
    value: formatCount(props.result.values.conversions),
    note: 'Converted sessions'
  },
  {
    measure: 'conversion_rate' as const,
    label: 'Conversion rate',
    value: formatPercentage(props.result.values.conversion_rate),
    note: `${formatCount(props.result.values.qr_scans)} QR scans`
  }
])
</script>

<template>
  <section class="summary-section" aria-labelledby="summary-title">
    <header class="summary-section__header">
      <div>
        <p class="eyebrow">Comparison context</p>
        <h2 id="summary-title">Current period summary</h2>
        <p v-if="comparison">Previous range: {{ comparison.rangeLabel }}</p>
      </div>
      <div class="comparison-switch" role="group" aria-label="Comparison mode">
        <button
          type="button"
          :aria-pressed="comparisonMode === 'none'"
          @click="emit('comparison', 'none')"
        >
          None
        </button>
        <button
          type="button"
          :aria-pressed="comparisonMode === 'previous'"
          @click="emit('comparison', 'previous')"
        >
          Previous period
        </button>
      </div>
    </header>
    <div class="explorer-summary" aria-label="Analytical summary">
      <article v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small
          v-if="comparison?.metrics[metric.measure]"
          class="comparison-delta"
          :class="`comparison-delta--${comparison.metrics[metric.measure]!.direction}`"
        >
          {{ comparison.metrics[metric.measure]!.text }}
        </small>
        <small v-else>{{ metric.note }}</small>
      </article>
    </div>
  </section>
</template>
