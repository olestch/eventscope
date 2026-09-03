import { mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import AppNavigation from '~/components/shell/AppNavigation.vue'

afterEach(() => document.body.replaceChildren())

describe('application navigation', () => {
  it('exposes every primary destination', () => {
    const wrapper = mount(AppNavigation, { global: { stubs: { NuxtLink: RouterLinkStub } } })
    const destinations = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))

    expect(destinations).toEqual(expect.arrayContaining(['/explore', '/qr', '/reports', '/methodology']))
  })

  it('moves focus into the mobile menu and returns it on Escape', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mount(AppNavigation, {
      attachTo: host,
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    const trigger = wrapper.get('button[aria-label="Open navigation"]')

    await trigger.trigger('click')
    expect(wrapper.find('#mobile-navigation').exists()).toBe(true)
    expect(document.activeElement?.textContent).toContain('Explore')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('#mobile-navigation').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })
})
