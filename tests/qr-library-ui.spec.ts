import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import QrLibraryView from '~/components/qr/QrLibraryView.vue'
import { draftToSavedQrInput, type QrRepository, type SavedQrCode } from '~/domain/qr/library'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createDefaultQrStudioDraft } from '~/features/qr/studio'

const base: SavedQrCode = {
  id: 'saved-1',
  ...draftToSavedQrInput(createDefaultQrStudioDraft(eventDatasetProvider.getCatalog())),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z'
}

function memoryRepository(initial: SavedQrCode[] = []): QrRepository {
  const items = [...initial]
  return {
    list: async () => [...items],
    get: async (id) => items.find((item) => item.id === id) ?? null,
    create: async (input) => ({
      id: 'created',
      ...input,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt
    }),
    update: async (id, input) => ({
      id,
      ...input,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt
    }),
    duplicate: async (id) => {
      const source = items.find((item) => item.id === id)!
      const copy = { ...source, id: `${id}-copy`, name: `${source.name} copy` }
      items.unshift(copy)
      return copy
    },
    delete: async (id) => {
      items.splice(
        items.findIndex((item) => item.id === id),
        1
      )
    }
  }
}

const mountLibrary = (repository: QrRepository) =>
  mount(QrLibraryView, { props: { repository }, global: { stubs: { NuxtLink: RouterLinkStub } } })

describe('QR Library UI', () => {
  it('offers a truthful empty state and creation path', async () => {
    const wrapper = mountLibrary(memoryRepository())
    await flushPromises()
    expect(wrapper.text()).toContain('No saved QR codes yet')
    expect(wrapper.text()).toContain('Saved only in this browser')
    expect(wrapper.text()).toContain('Scenario QR')
    expect(wrapper.text()).toContain('Analytics available')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/qr/new')
  })

  it('renders canonical previews and accessible item actions', async () => {
    const wrapper = mountLibrary(memoryRepository([base]))
    await flushPromises()
    expect(wrapper.get('.qr-preview img').attributes('src')).toContain('data:image/svg+xml')
    expect(wrapper.text()).toContain(base.name)
    expect(wrapper.text()).toContain(base.destination)
    expect(wrapper.text()).toContain('No analytics yet')
    expect(wrapper.get('[aria-label^="Actions for"]').text()).toContain('Export SVG')
  })

  it('keeps Scenario QR read-only and links its stable identity to Explorer', async () => {
    const wrapper = mountLibrary(memoryRepository())
    await flushPromises()
    const scenario = wrapper.get('[aria-label="Scenario QR codes"]')
    expect(scenario.text()).toContain('View analytics')
    expect(scenario.text()).not.toContain('Delete')
    expect(scenario.text()).not.toContain('Duplicate')
    const link = scenario.getComponent(RouterLinkStub)
    expect(link.props('to')).toMatchObject({
      path: '/explore',
      query: { qr: expect.stringMatching(/^qr-/) }
    })
  })

  it('duplicates and manages confirmation focus before deletion', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mount(QrLibraryView, {
      attachTo: host,
      props: { repository: memoryRepository([base]) },
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    await flushPromises()
    await wrapper.get('button:nth-of-type(1)').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain(`${base.name} copy`)
    const deleteButtons = wrapper.findAll('button').filter((button) => button.text() === 'Delete')
    await deleteButtons[0]!.trigger('click')
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(dialog.attributes()).toMatchObject({ 'aria-modal': 'true' })
    expect(dialog.text()).toContain('Confirm delete')
    expect(document.activeElement?.textContent).toContain('Cancel')
    await wrapper.get('[role="alertdialog"] .button--ghost').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(document.activeElement?.textContent).toContain('Delete')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete')!
      .trigger('click')
    await wrapper.get('[role="alertdialog"] .button--danger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain(`${base.name} copy`)
    expect(document.activeElement?.textContent).toBe('Saved QR')
    wrapper.unmount()
    host.remove()
  })

  it('closes delete confirmation with Escape and restores its trigger', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mount(QrLibraryView, {
      attachTo: host,
      props: { repository: memoryRepository([base]) },
      global: { stubs: { NuxtLink: RouterLinkStub } }
    })
    await flushPromises()
    const trigger = wrapper.findAll('button').find((button) => button.text() === 'Delete')!
    await trigger.trigger('click')
    await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
    host.remove()
  })

  it('renders repository failures as actionable errors', async () => {
    const repository = memoryRepository()
    repository.list = async () => {
      throw new Error('Storage denied')
    }
    const wrapper = mountLibrary(repository)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Storage denied')
    expect(wrapper.text()).toContain('Try again')
  })
})
