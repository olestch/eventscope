<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ExplorerProfile } from '~/features/explorer/queryState'

defineProps<{
  profile: ExplorerProfile
  activeFilterCount: number
  runtimeError: boolean
}>()
const filterTrigger = ref<HTMLButtonElement>()
const { t } = useI18n()
defineExpose({ focusFilterTrigger: () => filterTrigger.value?.focus() })
const emit = defineEmits<{
  profile: [profile: ExplorerProfile]
  openFilters: [inputMethod: 'pointer' | 'keyboard']
  retry: []
}>()
</script>

<template>
  <section class="explorer-toolbar" :aria-label="t('explorer.controls')">
    <div>
      <span class="control-label">{{ t('explorer.dataset') }}</span>
      <div class="profile-switch">
        <button
          v-for="option in [
            { id: 'large', label: t('explorer.standard') },
            { id: 'showcase', label: t('explorer.showcase') }
          ] as const"
          :key="option.id"
          type="button"
          :class="{ 'profile-switch__button--active': profile === option.id }"
          :aria-pressed="profile === option.id"
          @click="emit('profile', option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="explorer-toolbar__actions">
      <button
        ref="filterTrigger"
        class="button button--secondary mobile-filter-trigger"
        type="button"
        @click="emit('openFilters', $event.detail === 0 ? 'keyboard' : 'pointer')"
      >
        {{ t('explorer.filters') }} <span class="filter-count">{{ activeFilterCount }}</span>
      </button>
      <button v-if="runtimeError" class="button button--secondary" type="button" @click="emit('retry')">
        {{ t('explorer.retryAnalytics') }}
      </button>
    </div>
  </section>
</template>
