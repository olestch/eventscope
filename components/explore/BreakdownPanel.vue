<script setup lang="ts">
import { computed } from 'vue'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  breakdownLabels,
  buildBreakdownChartOption,
  measureLabels,
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
const emit = defineEmits<{
  change: [selection: { breakdown: ExplorerBreakdown; measure: ExplorerBreakdownMeasure }]
  filter: [intent: BreakdownSelectionIntent]
}>()
const option = computed(() => buildBreakdownChartOption(props.model, false))

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
        <p class="eyebrow">Ranked breakdown</p>
        <h2>{{ model.measureLabel }} by {{ breakdownLabels[model.dimension].toLowerCase() }}</h2>
        <p>Select a bar to add that category to the committed filters.</p>
      </div>
      <div class="breakdown-controls">
        <label>
          <span>Dimension</span>
          <select :value="breakdown" @change="updateBreakdown">
            <option v-for="value in explorerBreakdowns" :key="value" :value="value">
              {{ breakdownLabels[value] }}
            </option>
          </select>
        </label>
        <label>
          <span>Measure</span>
          <select :value="measure" @change="updateMeasure">
            <option v-for="value in explorerBreakdownMeasures" :key="value" :value="value">
              {{ measureLabels[value] }}
            </option>
          </select>
        </label>
      </div>
    </figcaption>
    <AnalyticsChart
      :option="option"
      :empty="!model.rows.length"
      empty-message="No categories match the committed filters."
      label="Ranked categorical breakdown. Exact values follow in the data table."
      interactive
      @select="filterRow"
    />
    <details class="chart-data" open>
      <summary>Breakdown data</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            Ranked breakdown values
          </caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">{{ model.measureLabel }}</th>
              <th scope="col">{{ model.secondaryMeasureLabel }}</th>
              <th scope="col">Filter</th>
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
                      ? `${row.label} already filtered`
                      : `Filter to ${row.label}`
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
