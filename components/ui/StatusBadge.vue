<script setup lang="ts">
withDefaults(defineProps<{ label: string; tone?: 'positive' | 'attention' | 'neutral' | 'draft' }>(), {
  tone: 'neutral'
})
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">{{ label }}</span>
</template>
