<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '~/components/shell/LocaleSwitcher.vue'
import { navigationItems } from '~/app/navigation'

const { t } = useI18n()
const isOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const firstMobileLink = ref<HTMLElement | null>(null)
const mobileDrawer = ref<HTMLElement | null>(null)

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
  if (event.key !== 'Tab' || !isOpen.value || !mobileDrawer.value) return

  const focusable = Array.from(
    mobileDrawer.value.querySelectorAll<HTMLElement>('a, button:not([disabled]), select:not([disabled])')
  )
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header class="mobile-header">
    <NuxtLink class="brand brand--mobile" to="/explore" :aria-label="t('navigation.home')">
      <span class="brand__mark" aria-hidden="true">E</span>
      <span>EventScope</span>
    </NuxtLink>
    <button
      ref="menuButton"
      class="icon-button"
      type="button"
      :aria-expanded="isOpen"
      aria-controls="mobile-navigation"
      :aria-label="t('navigation.open')"
      @click="openMenu"
    >
      <span aria-hidden="true">☰</span>
    </button>
  </header>

  <aside class="sidebar" :aria-label="t('navigation.primary')">
    <NuxtLink class="brand" to="/explore" :aria-label="t('navigation.home')">
      <span class="brand__mark" aria-hidden="true">E</span>
      <span>EventScope</span>
    </NuxtLink>
    <nav class="nav-list">
      <NuxtLink v-for="item in navigationItems" :key="item.to" class="nav-link" :to="item.to">
        <span class="nav-link__icon" aria-hidden="true">{{ item.shortLabel }}</span>
        <span>{{ t(`navigation.${item.labelKey}`) }}</span>
      </NuxtLink>
    </nav>
    <div class="sidebar__footer">
      <LocaleSwitcher />
      <span class="status-dot" aria-hidden="true" />
      {{ t('navigation.workspace') }}
    </div>
  </aside>

  <div v-if="isOpen" class="mobile-overlay" @click.self="closeMenu()">
    <nav
      id="mobile-navigation"
      ref="mobileDrawer"
      class="mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
    >
      <div class="mobile-drawer__header">
        <span id="mobile-navigation-title" class="eyebrow">{{ t('navigation.navigate') }}</span>
        <LocaleSwitcher />
        <button
          class="icon-button"
          type="button"
          :aria-label="t('navigation.close')"
          @click="closeMenu()"
        >
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
        <span>{{ t(`navigation.${item.labelKey}`) }}</span
        ><span aria-hidden="true">↗</span>
      </NuxtLink>
    </nav>
  </div>
</template>
