<script setup lang="ts">
import type { TimelinePoint } from '~/types/demo'

defineProps<{ points: TimelinePoint[] }>()

const visitPath = 'M 24 154 L 132 126 L 240 140 L 348 86 L 456 105 L 564 51 L 672 76 L 780 34'
const scanPath = 'M 24 188 L 132 176 L 240 181 L 348 148 L 456 158 L 564 119 L 672 135 L 780 108'
</script>

<template>
  <figure class="timeline-card">
    <div class="timeline-card__header">
      <div>
        <p class="eyebrow">Signal timeline</p>
        <h2>Visits and QR engagement</h2>
      </div>
      <div class="chart-legend" aria-label="Chart legend">
        <span><i class="legend-dot legend-dot--visits" />Visits index</span>
        <span><i class="legend-dot legend-dot--scans" />Scan index</span>
      </div>
    </div>
    <div class="timeline-plot">
      <svg viewBox="0 0 804 224" role="img" aria-labelledby="timeline-title timeline-description">
        <title id="timeline-title">Northstar launch timeline</title>
        <desc id="timeline-description">
          Visits and scans generally rise across eight dates, with the largest lift on 14 March.
        </desc>
        <defs>
          <linearGradient id="visits-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#5eead4" stop-opacity=".28" />
            <stop offset="1" stop-color="#5eead4" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="chart-grid" aria-hidden="true">
          <line v-for="y in [44, 84, 124, 164, 204]" :key="y" x1="24" :y1="y" x2="780" :y2="y" />
        </g>
        <path :d="`${visitPath} L 780 204 L 24 204 Z`" fill="url(#visits-fill)" aria-hidden="true" />
        <path :d="visitPath" class="chart-line chart-line--visits" aria-hidden="true" />
        <path :d="scanPath" class="chart-line chart-line--scans" aria-hidden="true" />
        <line x1="564" y1="32" x2="564" y2="204" class="chart-marker" aria-hidden="true" />
        <g aria-hidden="true">
          <circle
            v-for="point in [
              [24, 154],
              [132, 126],
              [240, 140],
              [348, 86],
              [456, 105],
              [564, 51],
              [672, 76],
              [780, 34]
            ]"
            :key="point.join('-')"
            :cx="point[0]"
            :cy="point[1]"
            r="4"
            class="chart-point"
          />
        </g>
      </svg>
      <div class="chart-annotation"><strong>14 Mar</strong><span>Keynote lift</span></div>
    </div>
    <div class="timeline-labels" aria-hidden="true">
      <span v-for="point in points" :key="point.label">{{ point.label }}</span>
    </div>
    <details class="chart-data">
      <summary>View accessible data table</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            Northstar launch indexed visits and scans
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Visits</th>
              <th scope="col">Scans</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in points" :key="point.label">
              <th scope="row">{{ point.label }}</th>
              <td>{{ point.visits }}</td>
              <td>{{ point.scans }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
