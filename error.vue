<script setup lang="ts">
import type { NuxtError } from '#app'
import StatePanel from '~/components/ui/StatePanel.vue'

const props = defineProps<{ error: NuxtError }>()
useHead({ title: props.error.statusCode === 404 ? 'Page not found' : 'View unavailable' })

function returnToExplore() {
  clearError({ redirect: '/explore' })
}
</script>

<template>
  <NuxtLayout>
    <div class="page page--centered">
      <StatePanel
        state="error"
        heading-level="h1"
        :title="error.statusCode === 404 ? 'Page not found' : 'Something interrupted the view'"
        description="The requested EventScope view is unavailable. Your demo data has not been changed."
      >
        <button class="button button--primary" type="button" @click="returnToExplore">
          Return to Explore
        </button>
      </StatePanel>
    </div>
  </NuxtLayout>
</template>
