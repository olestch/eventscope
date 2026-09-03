<script setup lang="ts">
import { ref } from 'vue'
import QrPreview from '~/components/qr/QrPreview.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import { getLocation, qrAssets } from '~/data/demo'

useHead({ title: 'QR studio' })
const view = ref<'active' | 'archived'>('active')
</script>

<template>
  <div class="page">
    <PageHeader
      eyebrow="QR studio"
      title="Connect physical touchpoints to event context."
      description="Organize trackable destination concepts for the Northstar Launch story."
      ><template #actions
        ><NuxtLink class="button button--primary" to="/qr/new"
          >New QR asset <span aria-hidden="true">+</span></NuxtLink
        ></template
      ></PageHeader
    >
    <div class="library-toolbar">
      <div class="segmented-control" aria-label="QR library view">
        <button type="button" :aria-pressed="view === 'active'" @click="view = 'active'">
          Active <span>3</span></button
        ><button type="button" :aria-pressed="view === 'archived'" @click="view = 'archived'">
          Archived <span>0</span>
        </button>
      </div>
      <label class="search-field"
        ><span class="sr-only">Search QR assets</span><input type="search" placeholder="Search assets"
      /></label>
    </div>
    <section v-if="view === 'active'" class="asset-grid" aria-label="QR asset library">
      <NuxtLink
        v-for="(asset, index) in qrAssets"
        :key="asset.id"
        class="asset-card"
        :to="`/qr/${asset.id}`"
      >
        <div class="asset-card__preview">
          <QrPreview :accent="['#5eead4', '#ff8066', '#8ca6ff'][index]" />
        </div>
        <div class="asset-card__body">
          <div class="asset-card__status">
            <StatusBadge
              :label="asset.status"
              :tone="asset.status === 'Active' ? 'positive' : 'attention'"
            /><span>Updated {{ asset.updatedAt }}</span>
          </div>
          <h2>{{ asset.name }}</h2>
          <p>{{ getLocation(asset.locationId)?.name }}</p>
          <div class="asset-card__metric">
            <strong>{{ asset.scans.toLocaleString('en-US') }}</strong
            ><span>demo scans</span>
          </div>
        </div>
      </NuxtLink>
    </section>
    <StatePanel
      v-else
      state="no-results"
      title="No archived assets"
      description="Archived Northstar concepts will appear here when lifecycle actions are implemented."
    />
  </div>
</template>
