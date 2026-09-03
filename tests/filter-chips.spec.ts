import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FilterChips from '~/components/explore/FilterChips.vue'

describe('Explorer filter chips', () => {
  it('toggles with Enter and communicates pressed state', async () => {
    const wrapper = mount(FilterChips, { props: { filters: ['Northstar Launch'] } })
    const chip = wrapper.get('button')

    expect(chip.attributes('aria-pressed')).toBe('true')
    await chip.trigger('keydown', { key: 'Enter' })
    expect(chip.attributes('aria-pressed')).toBe('false')
    await chip.trigger('keydown', { key: 'Enter' })
    expect(chip.attributes('aria-pressed')).toBe('true')
  })
})
