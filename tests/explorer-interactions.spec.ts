import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BreakdownPanel from '~/components/explore/BreakdownPanel.vue'
import EventTimeline from '~/components/explore/EventTimeline.vue'
import FunnelPanel from '~/components/explore/FunnelPanel.vue'
import type {
  BreakdownViewModel,
  FunnelViewModel,
  TimelineViewModel
} from '~/features/explorer/presentation'

const chartStub = {
  emits: ['select'],
  template: '<button class="chart-intent" type="button" @click="$emit(\'select\', 0)">Chart</button>'
}

describe('Explorer accessible interaction boundaries', () => {
  it('converts chart and table breakdown actions to the same semantic filter intent', async () => {
    const model: BreakdownViewModel = {
      dimension: 'location',
      measure: 'sessions',
      measureLabel: 'Sessions',
      secondaryMeasure: 'conversion_rate',
      secondaryMeasureLabel: 'Conversion rate',
      rows: [
        {
          key: 'loc-harbor',
          label: 'Harbor Hall',
          value: 10,
          formattedValue: '10',
          secondaryValue: 0.2,
          formattedSecondary: '20.0%'
        }
      ]
    }
    const wrapper = mount(BreakdownPanel, {
      props: { model, breakdown: 'location', measure: 'sessions', selectedValues: [] },
      global: { stubs: { AnalyticsChart: chartStub } }
    })
    await wrapper.get('.chart-intent').trigger('click')
    await wrapper.get('.table-action').trigger('click')
    expect(wrapper.emitted('filter')).toEqual([
      [{ dimension: 'location', value: 'loc-harbor' }],
      [{ dimension: 'location', value: 'loc-harbor' }]
    ])
    await wrapper.setProps({ selectedValues: ['loc-harbor'] })
    expect(wrapper.get('.table-action').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.table-action').text()).toContain('already filtered')
  })

  it('converts chart and table timeline actions to the exact bucket intent', async () => {
    const model: TimelineViewModel = {
      bucket: '1d',
      points: [
        {
          label: 'Mar 4, 2026',
          rangeLabel: 'Mar 4, 2026 – Mar 5, 2026 [start, end) UTC',
          range: {
            start: '2026-03-04T00:00:00.000Z',
            end: '2026-03-05T00:00:00.000Z'
          },
          drillable: true,
          events: 10,
          qrScans: 2
        }
      ]
    }
    const wrapper = mount(EventTimeline, {
      props: { model },
      global: { stubs: { AnalyticsChart: chartStub } }
    })
    await wrapper.get('.chart-intent').trigger('click')
    await wrapper.get('.table-action').trigger('click')
    expect(wrapper.emitted('drilldown')).toEqual([[model.points[0]!.range], [model.points[0]!.range]])
  })

  it('renders funnel progression as a visualization and an exact semantic table', () => {
    const model: FunnelViewModel = {
      name: 'Registration journey',
      description: 'Fixture journey',
      empty: false,
      steps: [
        {
          eventType: 'page_view',
          label: 'Page view',
          sessions: 10,
          formattedSessions: '10',
          percentageFromFirst: '100.0%',
          progressionFromPrevious: 'Entrants',
          dropOffFromPrevious: '—',
          width: 100
        }
      ]
    }
    const wrapper = mount(FunnelPanel, { props: { model } })
    expect(wrapper.get('.funnel-steps').text()).toContain('Page view')
    expect(wrapper.get('table').text()).toContain('Sessions')
    expect(wrapper.get('table').text()).toContain('Entrants')
  })
})
