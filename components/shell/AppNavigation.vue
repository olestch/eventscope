<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { navigationItems } from '~/app/navigation'

const isOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const firstMobileLink = ref<HTMLElement | null>(null)

function setFirstMobileLink(element: Element | ComponentPublicInstance | null) {
  if (!element) return
  firstMobileLink.value = ('$el' in element ? element.$el : element) as HTMLElement
}

async function openMenu() {
  isOpen.value = true
  await nextTick()
  firstMobileLink.value?.focus()
}

function closeMenu(returnFocus = true) {
  isOpen.value = false
  if (returnFocus) nextTick(() => menuButton.value?.focus())
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) closeMenu()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header class="mobile-header">
    <NuxtLink class="brand brand--mobile" to="/explore" aria-label="EventScope home">
      <span class="brand__mark" aria-hidden="true">E</span>
      <span>EventScope</span>
    </NuxtLink>
    <button
      ref="menuButton"
      class="icon-button"
      type="button"
      :aria-expanded="isOpen"
      aria-controls="mobile-navigation"
      aria-label="Open navigation"
      @click="openMenu"
    >
      <span aria-hidden="true">☰</span>
    </button>
  </header>

  <aside class="sidebar" aria-label="Primary navigation">
    <NuxtLink class="brand" to="/explore" aria-label="EventScope home">
      <span class="brand__mark" aria-hidden="true">E</span>
      <span>EventScope</span>
    </NuxtLink>
    <nav class="nav-list">
      <NuxtLink v-for="item in navigationItems" :key="item.to" class="nav-link" :to="item.to">
        <span class="nav-link__icon" aria-hidden="true">{{ item.shortLabel }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
    <div class="sidebar__footer">
      <span class="status-dot" aria-hidden="true" />
      Fictional demo workspace
    </div>
  </aside>

  <div v-if="isOpen" class="mobile-overlay" @click.self="closeMenu()">
    <nav id="mobile-navigation" class="mobile-drawer" aria-label="Mobile navigation">
      <div class="mobile-drawer__header">
        <span class="eyebrow">Navigate</span>
        <button class="icon-button" type="button" aria-label="Close navigation" @click="closeMenu()">
          ×
        </button>
      </div>
      <NuxtLink
        v-for="(item, index) in navigationItems"
        :key="item.to"
        :ref="index === 0 ? setFirstMobileLink : undefined"
        class="mobile-nav-link"
        :to="item.to"
        @click="closeMenu(false)"
      >
        <span>{{ item.label }}</span
        ><span aria-hidden="true">↗</span>
      </NuxtLink>
    </nav>
  </div>
</template>
