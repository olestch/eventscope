import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import QrEditorShell from '~/components/qr/QrEditorShell.vue'
import { qrDesignConstraints } from '~/domain/qr/constraints'
import type { QrRepository, SavedQrCode } from '~/domain/qr/library'

describe('QR Studio UI', () => {
  it('starts with a valid Northstar preview and enabled exports', () => {
    const wrapper = mount(QrEditorShell)
    expect(wrapper.text()).toContain('Northstar Launch')
    expect(wrapper.text()).toContain('Harbor Hall')
    expect(wrapper.text()).toContain('Good configuration')
    expect(wrapper.get('.qr-canvas img').attributes('src')).toContain('data:image/svg+xml')
    expect(wrapper.findAll('.qr-export-actions button')[1]!.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.qr-save-button').attributes('disabled')).toBeDefined()
  })

  it('keeps the editor usable and disables exports for an invalid destination', async () => {
    const wrapper = mount(QrEditorShell)
    const destination = wrapper.get('input[type="url"]')
    await destination.setValue('http://unsafe.example')
    expect(destination.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('The destination must use HTTPS.')
    expect(wrapper.text()).toContain('Preview paused')
    const exports = wrapper.findAll('.qr-export-actions button').slice(1, 3)
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

  it('derives selectable margin and badge ranges from canonical constraints', () => {
    const wrapper = mount(QrEditorShell)
    const ranges = wrapper.findAll('input[type="range"]')
    expect(ranges[0]!.attributes()).toMatchObject({
      min: String(qrDesignConstraints.margin.min),
      max: String(qrDesignConstraints.margin.max),
      step: String(qrDesignConstraints.margin.step)
    })
    expect(ranges[1]!.attributes()).toMatchObject({
      min: String(qrDesignConstraints.centerMark.size.min),
      max: String(qrDesignConstraints.centerMark.size.max),
      step: String(qrDesignConstraints.centerMark.size.step)
    })
  })

  it('offers accessible built-in and custom mark content controls', async () => {
    const wrapper = mount(QrEditorShell)
    await wrapper.get('input[name="center-mark-content"][value="glyph"]').setValue(true)
    const glyph = wrapper.get('input[aria-describedby*="center-mark-glyph-help"]')
    expect(wrapper.text()).toContain('One visible Unicode character')
    await glyph.setValue('AB')
    expect(glyph.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Use only one visible character')
    await glyph.setValue(' N ')
    expect(glyph.attributes('aria-invalid')).toBe('false')
    expect(wrapper.get('.qr-canvas img').attributes('src')).toContain('data:image/svg+xml')
  })

  it('saves through the repository boundary and clears the dirty state', async () => {
    let created: SavedQrCode | undefined
    const repository: QrRepository = {
      list: async () => [],
      get: async () => null,
      create: async (input) =>
        (created = {
          id: 'saved-1',
          ...input,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      update: async () => {
        throw new Error('unexpected update')
      },
      duplicate: async () => {
        throw new Error('unexpected duplicate')
      },
      delete: async () => undefined
    }
    const wrapper = mount(QrEditorShell, { props: { repository } })
    expect(wrapper.text()).toContain('Unsaved changes')
    await wrapper.get('.qr-save-button').trigger('click')
    await flushPromises()
    expect(created?.name).toBe('Northstar Harbor invitation')
    expect(wrapper.text()).toContain('Saved in this browser')
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: 'saved-1' })
  })
})
