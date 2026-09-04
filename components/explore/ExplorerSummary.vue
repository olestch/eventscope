<script setup lang="ts">
import { computed } from 'vue'
import type { SummaryResult } from '~/domain/analytics/contracts'
import { formatCount, formatPercentage } from '~/features/explorer/presentation'

const props = defineProps<{ result: SummaryResult }>()
const metrics = computed(() => [
  { label: 'Events', value: formatCount(props.result.values.events), note: 'Source facts' },
  { label: 'Sessions', value: formatCount(props.result.values.sessions), note: 'Distinct IDs' },
  {
    label: 'Conversions',
    value: formatCount(props.result.values.conversions),
    note: 'Converted sessions'
  },
  {
    label: 'Conversion rate',
    value: formatPercentage(props.result.values.conversion_rate),
    note: `${formatCount(props.result.values.qr_scans)} QR scans`
  }
])
</script>

<template>
  <section class="explorer-summary" aria-label="Analytical summary">
    <article v-for="metric in metrics" :key="metric.label">
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
      <small>{{ metric.note }}</small>
    </article>
  </section>
</template>
