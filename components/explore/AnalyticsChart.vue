<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AnalyticsChartInstance } from '~/services/visualization/echartsRuntime'

const props = defineProps<{
  option: EChartsCoreOption
  empty: boolean
  emptyMessage: string
  label: string
  interactive?: boolean
}>()
const emit = defineEmits<{ select: [dataIndex: number] }>()

const host = ref<HTMLElement>()
let chart: AnalyticsChartInstance | undefined
let observer: ResizeObserver | undefined
let disposed = false
let reducedMotion = false
const renderedOption = () => ({
  ...props.option,
  animation: !reducedMotion && props.option.animation !== false
})

const update = () => chart?.setOption(renderedOption(), { notMerge: true })
const handleChartClick = (event: unknown) => {
  if (!props.interactive || typeof event !== 'object' || event === null) return
  const dataIndex = (event as { dataIndex?: unknown }).dataIndex
  if (typeof dataIndex === 'number' && Number.isInteger(dataIndex)) emit('select', dataIndex)
}

onMounted(async () => {
  if (!host.value) return
  const { initializeAnalyticsChart, prefersReducedMotion } =
    await import('~/services/visualization/echartsRuntime')
  if (disposed || !host.value) return
  reducedMotion = prefersReducedMotion()
  chart = initializeAnalyticsChart(host.value)
  chart.on('click', handleChartClick)
  update()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(host.value)
  }
})

watch(() => props.option, update)

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  chart?.off('click', handleChartClick)
  chart?.dispose()
})
</script>

<template>
  <div
    class="analytics-chart"
    :class="{ 'analytics-chart--empty': empty, 'analytics-chart--interactive': interactive }"
  >
    <div ref="host" class="analytics-chart__canvas" :aria-label="label" aria-hidden="true" />
    <p v-if="empty" class="analytics-chart__empty">{{ emptyMessage }}</p>
  </div>
</template>
