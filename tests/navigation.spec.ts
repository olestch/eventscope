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
    const drawer = wrapper.get('#mobile-navigation')
    expect(drawer.attributes()).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
    expect(document.activeElement?.textContent).toContain('Explore')

    const focusable = drawer.findAll('a, button, select')
    const first = focusable[0]!
    const last = focusable.at(-1)!
    await first.element.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(document.activeElement).toBe(last.element)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(first.element)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('#mobile-navigation').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })
})
