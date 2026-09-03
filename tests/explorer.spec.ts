import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => vi.stubGlobal('useHead', vi.fn()))

describe('Explorer story', () => {
  it('connects campaign context, insight and next workflows', async () => {
    const { default: ExplorePage } = await import('~/pages/explore.vue')
    const wrapper = mount(ExplorePage, { global: { stubs: { NuxtLink: RouterLinkStub } } })

    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Harbor momentum leads the period')
    expect(wrapper.text()).toContain('Open QR studio')
    expect(wrapper.text()).toContain('Start report')
    expect(wrapper.find('svg[role="img"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(true)
  })
})
