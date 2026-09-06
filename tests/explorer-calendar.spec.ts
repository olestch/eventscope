import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ExplorerDatePicker from '~/components/explore/ExplorerDatePicker.vue'
import { testI18n } from '~/tests/setup'

const mountPicker = (value = '2026-03-04') =>
  mount(ExplorerDatePicker, {
    props: {
      id: 'test-date',
      label: 'Start',
      modelValue: value,
      minimum: '2025-07-01',
      maximum: '2026-06-30'
    },
    attachTo: document.body
  })

describe('Explorer calendar', () => {
  it('replaces the native picker with an English, accessible calendar dialog', async () => {
    const wrapper = mountPicker()
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    await wrapper.get('.date-picker__trigger').trigger('click')
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Start calendar')
    expect(wrapper.text()).toContain('March 2026')
    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(42)
    wrapper.unmount()
  })

  it('localizes calendar labels and date formatting in Russian', async () => {
    await testI18n.global.setLocale('ru')
    try {
      const wrapper = mountPicker()
      await wrapper.get('.date-picker__trigger').trigger('click')
      expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Календарь: Start')
      expect(wrapper.text()).toContain('март 2026')
      expect(wrapper.text()).toContain('Пн')
      wrapper.unmount()
    } finally {
      await testI18n.global.setLocale('en')
    }
  })

  it('keeps adjacent-month days selectable and marks selection and today independently', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.date-picker__trigger').trigger('click')
    const adjacent = wrapper.get('[data-date="2026-02-28"]')
    expect(adjacent.classes()).toContain('is-adjacent')
    await adjacent.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2026-02-28'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('gives today a distinct state without overriding the stronger selected state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'))
    try {
      const wrapper = mountPicker()
      await wrapper.get('.date-picker__trigger').trigger('click')
      expect(wrapper.get('[data-date="2026-03-10"]').classes()).toContain('is-today')
      expect(wrapper.get('[data-date="2026-03-04"]').classes()).toContain('is-selected')
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('supports month and year navigation without a large calendar dependency', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.date-picker__trigger').trigger('click')
    await wrapper.get('.calendar-header button:nth-child(2)').trigger('click')
    expect(wrapper.findAll('[data-month]')).toHaveLength(12)
    await wrapper.get('.calendar-header button:nth-child(2)').trigger('click')
    expect(wrapper.findAll('[data-year]')).toHaveLength(12)
    await wrapper.get('[data-year="2025"]').trigger('click')
    await wrapper.get('[data-month="6"]').trigger('click')
    expect(wrapper.text()).toContain('July 2025')
    wrapper.unmount()
  })

  it('supports arrow movement, Enter selection, Escape and trigger focus restoration', async () => {
    const wrapper = mountPicker()
    const trigger = wrapper.get<HTMLButtonElement>('.date-picker__trigger')
    await trigger.trigger('click')
    const selected = wrapper.get('[data-date="2026-03-04"]')
    expect(document.activeElement).toBe(selected.element)
    await selected.trigger('keydown', { key: 'ArrowRight' })
    const next = wrapper.get('[data-date="2026-03-05"]')
    expect(document.activeElement).toBe(next.element)
    await next.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2026-03-05'])
    expect(document.activeElement).toBe(trigger.element)

    await trigger.trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('handles leap-day and bounded month transitions predictably', async () => {
    const wrapper = mountPicker('2026-02-28')
    await wrapper.setProps({ minimum: '2024-01-01', maximum: '2026-06-30' })
    await wrapper.get('.date-picker__trigger').trigger('click')
    await wrapper.get('[data-date="2026-02-28"]').trigger('keydown', { key: 'PageUp' })
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-01-28')
    await wrapper.get('[data-date="2026-01-28"]').trigger('keydown', { key: 'Escape' })
    wrapper.unmount()

    const leap = mountPicker('2026-03-01')
    await leap.setProps({ minimum: '2024-01-01', maximum: '2026-06-30', modelValue: '2024-02-29' })
    await leap.get('.date-picker__trigger').trigger('click')
    expect(leap.get('[data-date="2024-02-29"]').attributes('aria-selected')).toBe('true')
    leap.unmount()
  })
})
