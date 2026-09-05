import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { init, use, type EChartsType } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([
  LineChart,
  BarChart,
  HeatmapChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer
])

export interface AnalyticsChartInstance {
  setOption: EChartsType['setOption']
  resize: EChartsType['resize']
  dispose: EChartsType['dispose']
  on: EChartsType['on']
  off: EChartsType['off']
}

export const initializeAnalyticsChart = (element: HTMLElement): AnalyticsChartInstance => init(element)

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
