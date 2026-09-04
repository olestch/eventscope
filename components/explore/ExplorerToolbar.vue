<script setup lang="ts">
import { ref } from 'vue'
import type { ExplorerProfile } from '~/features/explorer/queryState'

defineProps<{
  profile: ExplorerProfile
  activeFilterCount: number
  runtimeError: boolean
}>()
const filterTrigger = ref<HTMLButtonElement>()
defineExpose({ focusFilterTrigger: () => filterTrigger.value?.focus() })
const emit = defineEmits<{
  profile: [profile: ExplorerProfile]
  openFilters: []
  retry: []
}>()
</script>

<template>
  <section class="explorer-toolbar" aria-label="Explorer controls">
    <div>
      <span class="control-label">Dataset</span>
      <div class="profile-switch">
        <button
          v-for="option in [
            { id: 'large', label: '100K default' },
            { id: 'showcase', label: '1M showcase' }
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
        @click="emit('openFilters')"
      >
        Filters <span class="filter-count">{{ activeFilterCount }}</span>
      </button>
      <button v-if="runtimeError" class="button button--secondary" type="button" @click="emit('retry')">
        Retry analytics
      </button>
    </div>
  </section>
</template>
