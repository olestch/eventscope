<script setup lang="ts">
import { computed } from 'vue'

interface TimelinePoint {
  label: string
  events: number
  qrScans: number
}

const props = defineProps<{ points: TimelinePoint[] }>()
const left = 24
const right = 780
const top = 34
const bottom = 188
const xFor = (index: number) =>
  props.points.length < 2 ? left : left + (index * (right - left)) / (props.points.length - 1)
const maximum = computed(() =>
  Math.max(1, ...props.points.flatMap(({ events, qrScans }) => [events, qrScans]))
)
const yFor = (value: number) => bottom - (value / maximum.value) * (bottom - top)
const pathFor = (field: 'events' | 'qrScans') =>
  props.points
    .map((point, index) => `${index ? 'L' : 'M'} ${xFor(index)} ${yFor(point[field])}`)
    .join(' ')
const eventPath = computed(() => pathFor('events'))
const scanPath = computed(() => pathFor('qrScans'))
const eventPoints = computed(() =>
  props.points.map((point, index) => ({ x: xFor(index), y: yFor(point.events) }))
)
const peakIndex = computed(() =>
  props.points.reduce(
    (best, point, index) => (point.events > (props.points[best]?.events ?? -1) ? index : best),
    0
  )
)
const peakX = computed(() => xFor(peakIndex.value))
const peakLabel = computed(() => props.points[peakIndex.value]?.label ?? '')
const annotationStyle = computed(() => ({ left: `${(peakX.value / 804) * 100}%` }))
</script>

<template>
  <figure class="timeline-card">
    <div class="timeline-card__header">
      <div>
        <p class="eyebrow">Real event timeline</p>
        <h2>Source events and QR scans</h2>
      </div>
      <div class="chart-legend" aria-label="Chart legend">
        <span><i class="legend-dot legend-dot--visits" />Events</span>
        <span><i class="legend-dot legend-dot--scans" />QR scans</span>
      </div>
    </div>
    <div class="timeline-plot">
      <svg viewBox="0 0 804 224" role="img" aria-labelledby="timeline-title timeline-description">
        <title id="timeline-title">Northstar daily event timeline</title>
        <desc id="timeline-description">
          Daily source-event and QR-scan counts calculated from the deterministic development dataset.
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
        <path
          :d="`${eventPath} L ${right} 204 L ${left} 204 Z`"
          fill="url(#visits-fill)"
          aria-hidden="true"
        />
        <path :d="eventPath" class="chart-line chart-line--visits" aria-hidden="true" />
        <path :d="scanPath" class="chart-line chart-line--scans" aria-hidden="true" />
        <line :x1="peakX" y1="32" :x2="peakX" y2="204" class="chart-marker" aria-hidden="true" />
        <g aria-hidden="true">
          <circle
            v-for="point in eventPoints"
            :key="`${point.x}-${point.y}`"
            :cx="point.x"
            :cy="point.y"
            r="4"
            class="chart-point"
          />
        </g>
      </svg>
      <div class="chart-annotation" :style="annotationStyle">
        <strong>{{ peakLabel }}</strong
        ><span>Traffic peak</span>
      </div>
    </div>
    <div class="timeline-labels" aria-hidden="true">
      <span v-for="point in points" :key="point.label">{{ point.label }}</span>
    </div>
    <details class="chart-data">
      <summary>View accessible data table</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            Northstar daily source events and QR scans
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Events</th>
              <th scope="col">QR scans</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in points" :key="point.label">
              <th scope="row">{{ point.label }}</th>
              <td>{{ point.events }}</td>
              <td>{{ point.qrScans }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
