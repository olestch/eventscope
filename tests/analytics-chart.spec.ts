import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AnalyticsChart from '~/components/explore/AnalyticsChart.vue'

const runtime = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  initialize: vi.fn(),
  reducedMotion: vi.fn(() => true)
}))

vi.mock('~/services/visualization/echartsRuntime', () => ({
  initializeAnalyticsChart: runtime.initialize,
  prefersReducedMotion: runtime.reducedMotion
}))

let resizeCallback: (() => void) | undefined
let clickCallback: ((event: unknown) => void) | undefined
const disconnect = vi.fn()
class ResizeObserverStub {
  constructor(callback: () => void) {
    resizeCallback = callback
  }
  observe() {}
  disconnect = disconnect
}

describe('Analytics chart lifecycle boundary', () => {
  afterEach(() => vi.clearAllMocks())

  it('initializes, updates, resizes and disposes while respecting reduced motion', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    runtime.initialize.mockReturnValue({
      setOption: runtime.setOption,
      resize: runtime.resize,
      dispose: runtime.dispose,
      on: runtime.on,
      off: runtime.off
    })
    runtime.on.mockImplementation((_event, callback) => {
      clickCallback = callback
    })
    const wrapper = mount(AnalyticsChart, {
      props: {
        option: { animation: true, series: [] },
        empty: false,
        emptyMessage: 'Nothing here',
        label: 'Fixture chart',
        interactive: true
      }
    })
    await flushPromises()
    expect(runtime.initialize).toHaveBeenCalledOnce()
    expect(runtime.setOption).toHaveBeenLastCalledWith(expect.objectContaining({ animation: false }), {
      notMerge: true
    })
    await wrapper.setProps({ option: { animation: true, series: [{ type: 'line', data: [1] }] } })
    expect(runtime.setOption).toHaveBeenCalledTimes(2)
    clickCallback?.({ dataIndex: 3 })
    expect(wrapper.emitted('select')).toEqual([[3]])
    resizeCallback?.()
    expect(runtime.resize).toHaveBeenCalledOnce()
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(runtime.off).toHaveBeenCalledWith('click', expect.any(Function))
    expect(runtime.dispose).toHaveBeenCalledOnce()
  })

  it('exposes an explicit empty state', async () => {
    runtime.initialize.mockReturnValue({
      setOption: runtime.setOption,
      resize: runtime.resize,
      dispose: runtime.dispose,
      on: runtime.on,
      off: runtime.off
    })
    const wrapper = mount(AnalyticsChart, {
      props: {
        option: { series: [] },
        empty: true,
        emptyMessage: 'No chart values',
        label: 'Empty chart'
      }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('No chart values')
    wrapper.unmount()
  })
})
