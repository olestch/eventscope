<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const metrics = computed(() => [
  {
    measure: 'events' as const,
    label: t('explorer.measures.events'),
    value: formatCount(props.result.values.events, presentationLocale.value),
    note: t('explorer.summary.sourceFacts')
  },
  {
    measure: 'sessions' as const,
    label: t('explorer.measures.sessions'),
    value: formatCount(props.result.values.sessions, presentationLocale.value),
    note: t('explorer.summary.distinctIds')
  },
  {
    measure: 'conversions' as const,
    label: t('explorer.measures.conversions'),
    value: formatCount(props.result.values.conversions, presentationLocale.value),
    note: t('explorer.summary.convertedSessions')
  },
  {
    measure: 'conversion_rate' as const,
    label: t('explorer.measures.conversion_rate'),
    value: formatPercentage(props.result.values.conversion_rate, presentationLocale.value),
    note: t('explorer.summary.qrScans', {
      count: formatCount(props.result.values.qr_scans, presentationLocale.value)
    })
  }
])
</script>

<template>
  <section class="summary-section" aria-labelledby="summary-title">
    <header class="summary-section__header">
      <div>
        <p class="eyebrow">{{ t('explorer.summary.eyebrow') }}</p>
        <h2 id="summary-title">{{ t('explorer.summary.title') }}</h2>
        <p v-if="comparison">
          {{ t('explorer.summary.previousRange', { range: comparison.rangeLabel }) }}
        </p>
      </div>
      <div class="comparison-switch" role="group" :aria-label="t('explorer.summary.mode')">
        <button
          type="button"
          :aria-pressed="comparisonMode === 'none'"
          @click="emit('comparison', 'none')"
        >
          {{ t('common.none') }}
        </button>
        <button
          type="button"
          :aria-pressed="comparisonMode === 'previous'"
          @click="emit('comparison', 'previous')"
        >
          {{ t('explorer.summary.previous') }}
        </button>
      </div>
    </header>
    <div class="explorer-summary" :aria-label="t('explorer.summary.label')">
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
