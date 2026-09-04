<script setup lang="ts">
import type { ActiveFilterChip } from '~/features/explorer/presentation'

defineProps<{ chips: ActiveFilterChip[] }>()
const emit = defineEmits<{
  remove: [chip: ActiveFilterChip]
  reset: []
}>()
</script>

<template>
  <div class="active-filter-bar" aria-label="Committed analytical filters">
    <span class="active-filter-bar__label">Active filters</span>
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="active-filter-chip"
      :aria-label="`Remove ${chip.label} filter`"
      @click="emit('remove', chip)"
    >
      {{ chip.label }} <span aria-hidden="true">×</span>
    </button>
    <span v-if="!chips.length" class="active-filter-bar__empty">No dimension filters</span>
    <button type="button" class="text-action" @click="emit('reset')">Reset view</button>
  </div>
</template>
