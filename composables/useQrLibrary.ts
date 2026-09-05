import { computed, ref } from 'vue'
import type { QrRepository, SavedQrCode } from '~/domain/qr/library'

export type QrLibraryStatus = 'loading' | 'ready' | 'empty' | 'error'

export function useQrLibrary(repository: QrRepository) {
  const items = ref<SavedQrCode[]>([])
  const status = ref<QrLibraryStatus>('loading')
  const errorMessage = ref('')
  const pendingId = ref<string>()

  const hasItems = computed(() => items.value.length > 0)

  const publish = (next: SavedQrCode[]) => {
    items.value = next
    status.value = next.length ? 'ready' : 'empty'
    errorMessage.value = ''
  }

  const load = async () => {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      publish(await repository.list())
    } catch (error) {
      items.value = []
      status.value = 'error'
      errorMessage.value =
        error instanceof Error ? error.message : 'Saved QR codes are unavailable in this browser.'
    }
  }

  const duplicate = async (id: string): Promise<SavedQrCode | undefined> => {
    pendingId.value = id
    errorMessage.value = ''
    try {
      const created = await repository.duplicate(id)
      publish(await repository.list())
      return created
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'The QR could not be duplicated.'
      return undefined
    } finally {
      pendingId.value = undefined
    }
  }

  const remove = async (id: string): Promise<boolean> => {
    pendingId.value = id
    errorMessage.value = ''
    try {
      await repository.delete(id)
      publish(await repository.list())
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'The QR could not be deleted.'
      return false
    } finally {
      pendingId.value = undefined
    }
  }

  return {
    items,
    status,
    errorMessage,
    pendingId,
    hasItems,
    load,
    duplicate,
    remove
  }
}
