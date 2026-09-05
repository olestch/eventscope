import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'

describe('QR Studio UI', () => {
  it('starts with a valid Northstar preview and enabled exports', () => {
    const wrapper = mount(QrEditorShell)
    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Harbor Hall')
    expect(wrapper.text()).toContain('Good configuration')
    expect(wrapper.get('.qr-canvas img').attributes('src')).toContain('data:image/svg+xml')
    expect(wrapper.get('button[type="button"].button--primary').attributes('disabled')).toBeUndefined()
  })

  it('keeps the editor usable and disables exports for an invalid destination', async () => {
    const wrapper = mount(QrEditorShell)
    const destination = wrapper.get('input[type="url"]')
    await destination.setValue('http://unsafe.example')
    expect(destination.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('The destination must use HTTPS.')
    expect(wrapper.text()).toContain('Preview paused')
    const exports = wrapper.findAll('.qr-export-actions button').slice(0, 2)
    expect(exports.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('reacts to pattern, color and gradient controls and resets the design', async () => {
    const wrapper = mount(QrEditorShell)
    const original = wrapper.get('.qr-canvas img').attributes('src')
    await wrapper.get('input[name="module-style"][value="dots"]').setValue(true)
    expect(wrapper.get('.qr-canvas img').attributes('src')).not.toBe(original)
    await wrapper.get('input[aria-label="Background color"]').setValue('#ffffff')
    await wrapper.get('.toggle-row input[type="checkbox"]').setValue(false)
    expect(wrapper.text()).toContain('#ffffff')
    await wrapper.get('.qr-export-actions .button--ghost').trigger('click')
    expect(wrapper.get('input[name="module-style"][value="rounded"]').element).toHaveProperty(
      'checked',
      true
    )
    expect(wrapper.get('.toggle-row input[type="checkbox"]').element).toHaveProperty('checked', true)
  })

  it('updates metadata context from the deterministic catalog', async () => {
    const wrapper = mount(QrEditorShell)
    await wrapper.get('select').setValue('cmp-skyline')
    expect(wrapper.get('.qr-context-list').text()).toContain('Skyline Product Forum')
    expect(wrapper.get('.qr-context-list').text()).toContain('Canvas Rooms')
  })
})
