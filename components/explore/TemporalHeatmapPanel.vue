<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildTemporalHeatmapChartOption,
  temporalInsightRuleValues,
  translatedMeasureLabel,
  type TemporalHeatmapViewModel
} from '~/features/explorer/presentation'
import { explorerTemporalMeasures, type ExplorerTemporalMeasure } from '~/features/explorer/queryState'

const props = defineProps<{
  model: TemporalHeatmapViewModel
  measure: ExplorerTemporalMeasure
}>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
const ruleValues = computed(() => temporalInsightRuleValues(presentationLocale.value))
const emit = defineEmits<{ measure: [measure: ExplorerTemporalMeasure] }>()
const option = computed(() => buildTemporalHeatmapChartOption(props.model, false))
const updateMeasure = (event: Event) =>
  emit('measure', (event.target as HTMLSelectElement).value as ExplorerTemporalMeasure)
</script>

<template>
  <figure class="temporal-panel explorer-visualization">
    <figcaption class="visualization-heading visualization-heading--controls">
      <div>
        <p class="eyebrow">{{ t('explorer.temporalPanel.eyebrow') }}</p>
        <h2>{{ t('explorer.temporalPanel.title') }}</h2>
        <p id="temporal-semantics">
          {{ t('explorer.temporalPanel.semantics') }}
        </p>
      </div>
      <div class="temporal-controls">
        <label>
          <span>{{ t('explorer.temporalPanel.measure') }}</span>
          <select :value="measure" aria-describedby="temporal-semantics" @change="updateMeasure">
            <option v-for="value in explorerTemporalMeasures" :key="value" :value="value">
              {{ translatedMeasureLabel(value, translate) }}
            </option>
          </select>
        </label>
      </div>
    </figcaption>

    <p class="temporal-scale" :aria-label="t('explorer.temporalPanel.scaleLabel')">
      {{
        t('explorer.temporalPanel.scale', {
          min: model.scale.minLabel,
          max: model.scale.maxLabel
        })
      }}
    </p>
    <AnalyticsChart
      :option="option"
      :empty="model.empty"
      :empty-message="t('explorer.temporalPanel.empty', { measure: model.measureLabel.toLowerCase() })"
      :label="t('explorer.temporalPanel.chartLabel', { measure: model.measureLabel })"
    />

    <section class="temporal-insights" aria-labelledby="temporal-insights-title">
      <div class="temporal-insights__heading">
        <div>
          <p class="eyebrow">{{ t('explorer.temporalPanel.insights') }}</p>
          <h3 id="temporal-insights-title">{{ t('explorer.temporalPanel.patterns') }}</h3>
        </div>
        <span>{{
          t('explorer.temporalPanel.rules', {
            difference: ruleValues.difference,
            count: ruleValues.count
          })
        }}</span>
      </div>
      <div v-if="model.insights.length" class="temporal-insight-list">
        <article v-for="insight in model.insights" :key="insight.id">
          <h4>{{ insight.title }}</h4>
          <p>{{ insight.detail }}</p>
        </article>
      </div>
      <p v-else class="temporal-insights__empty">
        {{ t('explorer.temporalPanel.noInsight') }}
      </p>
    </section>

    <details class="chart-data temporal-data">
      <summary>{{ t('explorer.temporalPanel.allValues') }}</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            {{
              t('explorer.temporalPanel.caption')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('explorer.temporalPanel.day') }}</th>
              <th scope="col">{{ t('explorer.temporalPanel.hour') }}</th>
              <th scope="col">{{ model.measureLabel }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cell in model.cells" :key="`${cell.weekday}-${cell.hour}`">
              <th scope="row">{{ cell.weekdayLabel }}</th>
              <td>{{ cell.hourRangeLabel }}</td>
              <td>{{ cell.formattedValue }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
