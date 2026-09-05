<script setup lang="ts">
import { computed } from 'vue'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildTimelineChartOption,
  formatCount,
  type TimelineViewModel
} from '~/features/explorer/presentation'
import type { TimelinePeriodIntent } from '~/features/explorer/queryState'

const props = defineProps<{ model: TimelineViewModel }>()
const emit = defineEmits<{ drilldown: [intent: TimelinePeriodIntent] }>()
const option = computed(() => buildTimelineChartOption(props.model, false))
const drillable = computed(() => props.model.points.some((point) => point.drillable))
const selectPoint = (index: number) => {
  const point = props.model.points[index]
  if (point?.drillable) emit('drilldown', { ...point.range })
}
</script>

<template>
  <figure class="timeline-card explorer-visualization">
    <figcaption class="visualization-heading">
      <div>
        <p class="eyebrow">Event timeline</p>
        <h2>Volume across the selected range</h2>
        <p v-if="drillable">
          {{ model.bucket }} UTC buckets · select a point to explore its complete UTC period
        </p>
        <p v-else>{{ model.bucket }} UTC buckets · use date filters to change sub-day scope</p>
      </div>
      <div class="chart-legend" aria-label="Chart legend">
        <span><i class="legend-dot legend-dot--visits" />Events</span>
        <span><i class="legend-dot legend-dot--scans" />QR scans</span>
      </div>
    </figcaption>
    <AnalyticsChart
      :option="option"
      :empty="!model.points.length"
      empty-message="No timeline buckets are available for this query."
      label="Event and QR scan time series. Exact values follow in the data table."
      :interactive="drillable"
      @select="selectPoint"
    />
    <details class="chart-data">
      <summary>View timeline data</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            Event and QR scan values for every UTC time bucket
          </caption>
          <thead>
            <tr>
              <th scope="col">Bucket range</th>
              <th scope="col">Events</th>
              <th scope="col">QR scans</th>
              <th scope="col">Explore</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in model.points" :key="point.range.start">
              <th scope="row">{{ point.rangeLabel }}</th>
              <td>{{ formatCount(point.events) }}</td>
              <td>{{ formatCount(point.qrScans) }}</td>
              <td>
                <button
                  v-if="point.drillable"
                  class="table-action"
                  type="button"
                  @click="emit('drilldown', { ...point.range })"
                >
                  Explore this period
                </button>
                <span v-else class="table-action-note">Use date filters for sub-day periods</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
