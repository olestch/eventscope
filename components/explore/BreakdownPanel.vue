<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildBreakdownChartOption,
  translatedBreakdownLabel,
  translatedMeasureLabel,
  type BreakdownViewModel
} from '~/features/explorer/presentation'
import {
  explorerBreakdowns,
  explorerBreakdownMeasures,
  type BreakdownSelectionIntent,
  type ExplorerBreakdown,
  type ExplorerBreakdownMeasure
} from '~/features/explorer/queryState'

const props = defineProps<{
  model: BreakdownViewModel
  breakdown: ExplorerBreakdown
  measure: ExplorerBreakdownMeasure
  selectedValues: string[]
}>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
const emit = defineEmits<{
  change: [selection: { breakdown: ExplorerBreakdown; measure: ExplorerBreakdownMeasure }]
  filter: [intent: BreakdownSelectionIntent]
}>()
const option = computed(() =>
  buildBreakdownChartOption(props.model, false, presentationLocale.value, translate)
)

const updateBreakdown = (event: Event) =>
  emit('change', {
    breakdown: (event.target as HTMLSelectElement).value as ExplorerBreakdown,
    measure: props.measure
  })
const updateMeasure = (event: Event) =>
  emit('change', {
    breakdown: props.breakdown,
    measure: (event.target as HTMLSelectElement).value as ExplorerBreakdownMeasure
  })
const filterRow = (index: number) => {
  const row = props.model.rows[index]
  if (row && !props.selectedValues.includes(row.key)) {
    emit('filter', { dimension: props.breakdown, value: row.key })
  }
}
</script>

<template>
  <figure class="breakdown-panel explorer-visualization">
    <figcaption class="visualization-heading visualization-heading--controls">
      <div>
        <p class="eyebrow">{{ t('explorer.breakdownPanel.eyebrow') }}</p>
        <h2>
          {{
            t('explorer.breakdownPanel.title', {
              measure: model.measureLabel,
              dimension: translatedBreakdownLabel(model.dimension, translate).toLowerCase()
            })
          }}
        </h2>
        <p>{{ t('explorer.breakdownPanel.instruction') }}</p>
      </div>
      <div class="breakdown-controls">
        <label>
          <span>{{ t('explorer.breakdownPanel.dimension') }}</span>
          <select :value="breakdown" @change="updateBreakdown">
            <option v-for="value in explorerBreakdowns" :key="value" :value="value">
              {{ translatedBreakdownLabel(value, translate) }}
            </option>
          </select>
        </label>
        <label>
          <span>{{ t('explorer.breakdownPanel.measure') }}</span>
          <select :value="measure" @change="updateMeasure">
            <option v-for="value in explorerBreakdownMeasures" :key="value" :value="value">
              {{ translatedMeasureLabel(value, translate) }}
            </option>
          </select>
        </label>
      </div>
    </figcaption>
    <AnalyticsChart
      :option="option"
      :empty="!model.rows.length"
      :empty-message="t('explorer.breakdownPanel.empty')"
      :label="t('explorer.breakdownPanel.chartLabel')"
      interactive
      @select="filterRow"
    />
    <details class="chart-data" open>
      <summary>{{ t('explorer.breakdownPanel.data') }}</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            {{
              t('explorer.breakdownPanel.caption')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('explorer.breakdownPanel.category') }}</th>
              <th scope="col">{{ model.measureLabel }}</th>
              <th scope="col">{{ model.secondaryMeasureLabel }}</th>
              <th scope="col">{{ t('explorer.breakdownPanel.filter') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in model.rows" :key="row.key">
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.formattedValue }}</td>
              <td>{{ row.formattedSecondary }}</td>
              <td>
                <button
                  class="table-action"
                  type="button"
                  :disabled="selectedValues.includes(row.key)"
                  @click="emit('filter', { dimension: breakdown, value: row.key })"
                >
                  {{
                    selectedValues.includes(row.key)
                      ? t('explorer.breakdownPanel.already', { name: row.label })
                      : t('explorer.breakdownPanel.filterTo', { name: row.label })
                  }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
