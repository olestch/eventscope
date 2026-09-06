<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsDatasetMetadata } from '~/services/analytics/AnalyticsGateway'
import { useI18n } from 'vue-i18n'
import type { ExplorerQueryState } from '~/features/explorer/queryState'
import {
  formatCount,
  formatInclusiveRange,
  translatedBreakdownLabel,
  translatedMeasureLabel,
  translatedWorkspaceLabel
} from '~/features/explorer/presentation'

defineProps<{
  state: ExplorerQueryState
  metadata?: AnalyticsDatasetMetadata
  scopeLabel: string
  qrContextLabel?: string
}>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
</script>

<template>
  <section class="query-context" :aria-label="t('explorer.context.label')">
    <div>
      <span>{{ t('explorer.dataset') }}</span
      ><strong>{{
        state.profile === 'showcase' ? t('explorer.showcaseShort') : t('explorer.standardShort')
      }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.loaded') }}</span
      ><strong>{{
        metadata ? formatCount(metadata.eventCount, presentationLocale) : t('common.preparing')
      }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.dateRange') }}</span
      ><strong>{{ formatInclusiveRange(state.startDate, state.endDate, presentationLocale) }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.scope') }}</span
      ><strong>{{ scopeLabel }}</strong>
    </div>
    <div v-if="qrContextLabel">
      <span>{{ t('explorer.context.scenarioQr') }}</span
      ><strong>{{ qrContextLabel }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.breakdown') }}</span
      ><strong>{{ translatedBreakdownLabel(state.breakdown, translate) }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.comparison') }}</span
      ><strong>{{
        state.comparison === 'previous' ? t('explorer.context.previousPeriod') : t('common.none')
      }}</strong>
    </div>
    <div>
      <span>{{ t('explorer.context.workspace') }}</span
      ><strong>{{ translatedWorkspaceLabel(state.view, translate) }}</strong>
    </div>
    <div v-if="state.view === 'temporal'">
      <span>{{ t('explorer.context.temporalMeasure') }}</span
      ><strong>{{ translatedMeasureLabel(state.temporalMeasure, translate) }}</strong>
    </div>
  </section>
</template>
