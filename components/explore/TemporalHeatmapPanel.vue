<script setup lang="ts">
import { computed } from 'vue'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildTemporalHeatmapChartOption,
  measureLabels,
  temporalInsightRuleLabel,
  type TemporalHeatmapViewModel
} from '~/features/explorer/presentation'
import { explorerTemporalMeasures, type ExplorerTemporalMeasure } from '~/features/explorer/queryState'

const props = defineProps<{
  model: TemporalHeatmapViewModel
  measure: ExplorerTemporalMeasure
}>()
const emit = defineEmits<{ measure: [measure: ExplorerTemporalMeasure] }>()
const option = computed(() => buildTemporalHeatmapChartOption(props.model, false))
const updateMeasure = (event: Event) =>
  emit('measure', (event.target as HTMLSelectElement).value as ExplorerTemporalMeasure)
</script>

<template>
  <figure class="temporal-panel explorer-visualization">
    <figcaption class="visualization-heading visualization-heading--controls">
      <div>
        <p class="eyebrow">Temporal heatmap</p>
        <h2>Weekday × hour behavior</h2>
        <p id="temporal-semantics">
          Monday-first UTC matrix · each hour is a half-open interval · read-only exploration
        </p>
      </div>
      <div class="temporal-controls">
        <label>
          <span>Measure</span>
          <select :value="measure" aria-describedby="temporal-semantics" @change="updateMeasure">
            <option v-for="value in explorerTemporalMeasures" :key="value" :value="value">
              {{ measureLabels[value] }}
            </option>
          </select>
        </label>
      </div>
    </figcaption>

    <p class="temporal-scale" aria-label="Heatmap scale">
      Continuous intensity scale: <strong>{{ model.scale.minLabel }}</strong> minimum to
      <strong>{{ model.scale.maxLabel }}</strong> maximum. Exact values are available below.
    </p>
    <AnalyticsChart
      :option="option"
      :empty="model.empty"
      :empty-message="`No ${model.measureLabel.toLowerCase()} occurred in this temporal scope.`"
      :label="`${model.measureLabel} by UTC weekday and hour. Exact values follow in the data table.`"
    />

    <section class="temporal-insights" aria-labelledby="temporal-insights-title">
      <div class="temporal-insights__heading">
        <div>
          <p class="eyebrow">Explainable insights</p>
          <h3 id="temporal-insights-title">Patterns supported by this aggregate</h3>
        </div>
        <span>Deterministic rules · {{ temporalInsightRuleLabel }}</span>
      </div>
      <div v-if="model.insights.length" class="temporal-insight-list">
        <article v-for="insight in model.insights" :key="insight.id">
          <h4>{{ insight.title }}</h4>
          <p>{{ insight.detail }}</p>
        </article>
      </div>
      <p v-else class="temporal-insights__empty">
        No temporal statement cleared the documented threshold for this measure and scope.
      </p>
    </section>

    <details class="chart-data temporal-data">
      <summary>View all 168 temporal values</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            Exact values for every Monday-first UTC weekday and hour combination
          </caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Hour interval</th>
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
