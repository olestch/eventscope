<script setup lang="ts">
defineProps<{ accent?: string }>()
</script>

<template>
  <div
    class="qr-preview"
    :style="{ '--qr-accent': accent || '#5eead4' }"
    aria-label="QR asset library thumbnail"
  >
    <div class="qr-preview__grid" aria-hidden="true">
      <span
        v-for="cell in 49"
        :key="cell"
        :class="{
          filled: [
            1, 2, 3, 5, 6, 7, 8, 10, 12, 14, 15, 16, 17, 19, 21, 22, 24, 26, 27, 29, 31, 32, 33, 35, 36,
            38, 40, 41, 42, 43, 45, 47, 48, 49
          ].includes(cell)
        }"
      />
    </div>
    <span class="sr-only">Presentation thumbnail. Open the asset to use QR Studio.</span>
  </div>
</template>
