<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ filters: string[] }>()
const activeFilters = ref([...props.filters])

function toggleFilter(filter: string) {
  activeFilters.value = activeFilters.value.includes(filter)
    ? activeFilters.value.filter((item) => item !== filter)
    : [...activeFilters.value, filter]
}
</script>

<template>
  <div class="filter-bar" aria-label="Active analysis filters">
    <span class="filter-bar__label">View</span>
    <button
      v-for="filter in filters"
      :key="filter"
      class="filter-chip"
      :class="{ 'filter-chip--inactive': !activeFilters.includes(filter) }"
      type="button"
      :aria-pressed="activeFilters.includes(filter)"
      @click="toggleFilter(filter)"
      @keydown.enter.prevent="toggleFilter(filter)"
      @keydown.space.prevent="toggleFilter(filter)"
    >
      <span aria-hidden="true">{{ activeFilters.includes(filter) ? '✓' : '+' }}</span
      >{{ filter }}
    </button>
  </div>
</template>
