<script setup lang="ts">
defineProps<{
  state: 'loading' | 'empty' | 'error' | 'no-results'
  title: string
  description: string
  headingLevel?: 'h1' | 'h2'
}>()
</script>

<template>
  <section
    class="state-panel"
    :class="`state-panel--${state}`"
    :aria-live="state === 'loading' ? 'polite' : undefined"
  >
    <span class="state-panel__icon" aria-hidden="true">{{
      state === 'loading' ? '◌' : state === 'error' ? '!' : '○'
    }}</span>
    <div>
      <component :is="headingLevel || 'h2'">{{ title }}</component>
      <p>{{ description }}</p>
    </div>
    <slot />
  </section>
</template>
