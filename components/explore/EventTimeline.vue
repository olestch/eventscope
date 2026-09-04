<script setup lang="ts">
import { computed } from 'vue'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildTimelineChartOption,
  formatCount,
  type TimelineViewModel
} from '~/features/explorer/presentation'

const props = defineProps<{ model: TimelineViewModel }>()
const option = computed(() => buildTimelineChartOption(props.model, false))
</script>

<template>
  <figure class="timeline-card explorer-visualization">
    <figcaption class="visualization-heading">
      <div>
        <p class="eyebrow">Event timeline</p>
        <h2>Volume across the selected range</h2>
        <p>{{ model.bucket }} UTC buckets · solid Events · dashed QR scans</p>
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in model.points" :key="point.rangeLabel">
              <th scope="row">{{ point.rangeLabel }}</th>
              <td>{{ formatCount(point.events) }}</td>
              <td>{{ formatCount(point.qrScans) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
