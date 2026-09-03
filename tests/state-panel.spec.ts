import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatePanel from '~/components/ui/StatePanel.vue'

describe('reusable data states', () => {
  it.each(['loading', 'empty', 'error', 'no-results'] as const)('renders the %s state', (state) => {
    const wrapper = mount(StatePanel, {
      props: { state, title: `${state} title`, description: `${state} description` }
    })
    expect(wrapper.classes()).toContain(`state-panel--${state}`)
    expect(wrapper.text()).toContain(`${state} title`)
  })
})
