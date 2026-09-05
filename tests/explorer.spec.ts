import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, shallowRef } from 'vue'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import {
  buildActiveFilterChips,
  buildBreakdownViewModel,
  buildTimelineViewModel
} from '~/features/explorer/presentation'
import { createDefaultExplorerState } from '~/features/explorer/queryState'

beforeAll(() => vi.stubGlobal('useHead', vi.fn()))

describe('Explorer product surface', () => {
  it('renders one coherent analytical result through feature components', async () => {
    const dataset = eventDatasetProvider.getDataset('test')
    const engine = createAnalyticsEngine(dataset)
    const state = createDefaultExplorerState(dataset.catalog)
    const baseQuery = {
      range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
      campaignIds: ['cmp-northstar']
    }
    const summary = engine.summary({
      ...baseQuery,
      measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans']
    })
    const timeline = engine.timeSeries({
      ...baseQuery,
      measures: ['events', 'qr_scans'],
      bucket: { kind: 'adaptive', maxPoints: 48 }
    })
    const breakdown = engine.breakdown({
      ...baseQuery,
      measures: ['sessions', 'conversion_rate'],
      breakdown: 'location'
    })
    const resultSet = { version: 1, state, summary, timeline, breakdown }
    const controller = {
      catalog: dataset.catalog,
      analyticsState: reactive({ status: 'ready', metadata: dataset }),
      committed: ref(state),
      draft: ref(state),
      results: shallowRef(resultSet),
      timelineModel: computed(() => buildTimelineViewModel(timeline)),
      breakdownModel: computed(() => buildBreakdownViewModel(breakdown, dataset.catalog, 'sessions')),
      comparisonModel: ref(undefined),
      funnelModel: ref(undefined),
      temporalModel: ref(undefined),
      selectedBreakdownValues: ref([]),
      activeFilterChips: computed(() => buildActiveFilterChips(state, dataset.catalog)),
      activeMetadata: ref({
        ...dataset,
        analyticalStorageBytes: 400,
        generationMs: 1,
        compilationMs: 1
      }),
      dateBounds: { minimum: '2025-07-01', maximum: '2026-06-30' },
      scopeLabel: ref('Northstar Launch'),
      noResults: ref(false),
      pending: ref(false),
      queryError: ref(undefined),
      statusMessage: ref('Query complete'),
      filtersOpen: ref(false),
      updateDraft: vi.fn(),
      applyDraft: vi.fn(),
      reset: vi.fn(),
      removeFilter: vi.fn(),
      selectProfile: vi.fn(),
      selectBreakdown: vi.fn(),
      crossFilterBreakdown: vi.fn(),
      drillIntoTimeline: vi.fn(),
      selectComparison: vi.fn(),
      selectView: vi.fn(),
      selectTemporalMeasure: vi.fn(),
      selectDatePreset: vi.fn(),
      retry: vi.fn(),
      openFilters: vi.fn(),
      closeFilters: vi.fn()
    }
    vi.doMock('~/composables/useExplorerController', () => ({
      useExplorerController: () => controller
    }))

    const { default: ExplorePage } = await import('~/pages/explore.vue')
    const wrapper = mount(ExplorePage, {
      global: {
        stubs: {
          AnalyticsChart: { template: '<div class="chart-stub" />' }
        }
      }
    })

    expect(wrapper.text()).toContain('Follow the signal')
    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('100K default')
    expect(wrapper.text()).toContain('1M showcase')
    expect(wrapper.text()).toContain('Volume across the selected range')
    expect(wrapper.text()).toContain('Sessions by location')
    expect(wrapper.text()).toContain(summary.values.events!.toLocaleString('en-US'))
    expect(wrapper.text()).toContain(`${(summary.values.conversion_rate! * 100).toFixed(1)}%`)
    expect(wrapper.findAll('.chart-stub')).toHaveLength(2)
    expect(wrapper.findAll('table')).toHaveLength(2)
    expect(wrapper.findAll('.explorer-summary article')).toHaveLength(4)
  })
})
