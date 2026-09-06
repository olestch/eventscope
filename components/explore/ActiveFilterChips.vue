<script setup lang="ts">
import type { ActiveFilterChip } from '~/features/explorer/presentation'
import { useI18n } from 'vue-i18n'

defineProps<{ chips: ActiveFilterChip[] }>()
const { t } = useI18n()
const emit = defineEmits<{
  remove: [chip: ActiveFilterChip]
  reset: []
}>()
</script>

<template>
  <div class="active-filter-bar" :aria-label="t('explorer.committedFilters')">
    <span class="active-filter-bar__label">{{ t('explorer.activeFilters') }}</span>
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="active-filter-chip"
      :aria-label="t('explorer.removeFilter', { name: chip.label })"
      @click="emit('remove', chip)"
    >
      {{ chip.label }} <span aria-hidden="true">×</span>
    </button>
    <span v-if="!chips.length" class="active-filter-bar__empty">{{
      t('explorer.noDimensionFilters')
    }}</span>
    <button type="button" class="text-action" @click="emit('reset')">
      {{ t('explorer.resetView') }}
    </button>
  </div>
</template>
