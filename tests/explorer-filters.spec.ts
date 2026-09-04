import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ActiveFilterChips from '~/components/explore/ActiveFilterChips.vue'
import ExplorerFilterPanel from '~/components/explore/ExplorerFilterPanel.vue'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { createDefaultExplorerState } from '~/features/explorer/queryState'

describe('Explorer filter controls', () => {
  it('edits one shared draft and emits Apply, Reset and Escape close actions', async () => {
    const draft = createDefaultExplorerState(referenceCatalog)
    const wrapper = mount(ExplorerFilterPanel, {
      props: {
        draft,
        catalog: referenceCatalog,
        dateBounds: { minimum: '2025-07-01', maximum: '2026-06-30' },
        open: true
      }
    })
    const paid = wrapper.get('input[type="checkbox"][value="chn-paid"]')
    await paid.setValue(true)
    expect(wrapper.emitted('update')?.at(-1)?.[0]).toMatchObject({
      campaignIds: ['cmp-northstar'],
      channelIds: ['chn-paid']
    })

    const dateInputs = wrapper.findAll('input[type="date"]')
    await dateInputs[0]!.setValue('2026-03-10')
    expect(wrapper.emitted('update')?.at(-1)?.[0]).toMatchObject({ startDate: '2026-03-10' })
    await wrapper.get('button.button--primary').trigger('click')
    await wrapper.get('button.button--secondary').trigger('click')
    await wrapper.get('aside').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('apply')).toHaveLength(1)
    expect(wrapper.emitted('reset')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('moves focus into the mobile surface through its public focus boundary', () => {
    const wrapper = mount(ExplorerFilterPanel, {
      props: {
        draft: createDefaultExplorerState(referenceCatalog),
        catalog: referenceCatalog,
        dateBounds: { minimum: '2025-07-01', maximum: '2026-06-30' },
        open: true
      },
      attachTo: document.body
    })
    ;(wrapper.vm as unknown as { focusFirst(): void }).focusFirst()
    expect(document.activeElement).toBe(wrapper.get('input[type="date"]').element)
    wrapper.unmount()
  })

  it('removes one committed chip without hiding the Reset action', async () => {
    const wrapper = mount(ActiveFilterChips, {
      props: {
        chips: [
          {
            id: 'campaignIds:cmp-northstar',
            group: 'campaignIds',
            value: 'cmp-northstar',
            label: 'Northstar Launch'
          }
        ]
      }
    })
    await wrapper.get('.active-filter-chip').trigger('click')
    await wrapper.get('.text-action').trigger('click')
    expect(wrapper.emitted('remove')?.[0]?.[0]).toMatchObject({ value: 'cmp-northstar' })
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })
})
