<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'
import {
  buildTimelineChartOption,
  formatCount,
  type TimelineViewModel
} from '~/features/explorer/presentation'
import type { TimelinePeriodIntent } from '~/features/explorer/queryState'

const props = defineProps<{ model: TimelineViewModel }>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
const emit = defineEmits<{ drilldown: [intent: TimelinePeriodIntent] }>()
const option = computed(() =>
  buildTimelineChartOption(props.model, false, presentationLocale.value, translate)
)
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
        <p class="eyebrow">{{ t('explorer.timeline.eyebrow') }}</p>
        <h2>{{ t('explorer.timeline.title') }}</h2>
        <p v-if="drillable">
          {{ t('explorer.timeline.drillable', { bucket: model.bucket }) }}
        </p>
        <p v-else>{{ t('explorer.timeline.fixed', { bucket: model.bucket }) }}</p>
      </div>
      <div class="chart-legend" :aria-label="t('explorer.timeline.legend')">
        <span><i class="legend-dot legend-dot--visits" />{{ t('explorer.measures.events') }}</span>
        <span><i class="legend-dot legend-dot--scans" />{{ t('explorer.measures.qr_scans') }}</span>
      </div>
    </figcaption>
    <AnalyticsChart
      :option="option"
      :empty="!model.points.length"
      :empty-message="t('explorer.timeline.empty')"
      :label="t('explorer.timeline.chartLabel')"
      :interactive="drillable"
      @select="selectPoint"
    />
    <details class="chart-data">
      <summary>{{ t('explorer.timeline.viewData') }}</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            {{
              t('explorer.timeline.tableCaption')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('explorer.timeline.bucketRange') }}</th>
              <th scope="col">{{ t('explorer.measures.events') }}</th>
              <th scope="col">{{ t('explorer.measures.qr_scans') }}</th>
              <th scope="col">{{ t('explorer.timeline.explore') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in model.points" :key="point.range.start">
              <th scope="row">{{ point.rangeLabel }}</th>
              <td>{{ formatCount(point.events, presentationLocale) }}</td>
              <td>{{ formatCount(point.qrScans, presentationLocale) }}</td>
              <td>
                <button
                  v-if="point.drillable"
                  class="table-action"
                  type="button"
                  @click="emit('drilldown', { ...point.range })"
                >
                  {{ t('explorer.timeline.explorePeriod') }}
                </button>
                <span v-else class="table-action-note">{{ t('explorer.timeline.subday') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
