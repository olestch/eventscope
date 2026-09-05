<script setup lang="ts">
import { nextTick, ref } from 'vue'
import ActiveFilterChips from '~/components/explore/ActiveFilterChips.vue'
import BreakdownPanel from '~/components/explore/BreakdownPanel.vue'
import EventTimeline from '~/components/explore/EventTimeline.vue'
import ExplorerFilterPanel from '~/components/explore/ExplorerFilterPanel.vue'
import ExplorerQueryContext from '~/components/explore/ExplorerQueryContext.vue'
import ExplorerSummary from '~/components/explore/ExplorerSummary.vue'
import ExplorerToolbar from '~/components/explore/ExplorerToolbar.vue'
import FunnelPanel from '~/components/explore/FunnelPanel.vue'
import TemporalHeatmapPanel from '~/components/explore/TemporalHeatmapPanel.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useExplorerController } from '~/composables/useExplorerController'
import { reportLocationForExplorerState } from '~/features/reports/routeState'

useHead({ title: 'Explore' })
const explorer = useExplorerController()
const filterPanel = ref<InstanceType<typeof ExplorerFilterPanel>>()
const toolbar = ref<InstanceType<typeof ExplorerToolbar>>()

async function openFilters() {
  explorer.openFilters()
  await nextTick()
  filterPanel.value?.focusFirst()
}

async function closeFilters() {
  explorer.closeFilters()
  await nextTick()
  toolbar.value?.focusFilterTrigger()
}

async function applyFilters() {
  explorer.applyDraft()
  await closeFilters()
}

async function resetFilters() {
  explorer.reset()
  await closeFilters()
}
</script>

<template>
  <div class="page explorer-page">
    <PageHeader
      eyebrow="Explorer"
      title="Follow the signal. Refine the question."
      description="A route-backed analytical workspace for exploring real event volume, QR engagement and conversion context."
      ><template #actions>
        <NuxtLink
          class="button button--secondary"
          :to="reportLocationForExplorerState(explorer.committed.value)"
          >Create report</NuxtLink
        >
      </template></PageHeader
    >

    <ExplorerToolbar
      ref="toolbar"
      :profile="explorer.committed.value.profile"
      :active-filter-count="explorer.activeFilterChips.value.length"
      :runtime-error="explorer.analyticsState.status === 'error'"
      @profile="explorer.selectProfile"
      @open-filters="openFilters"
      @retry="explorer.retry"
    />

    <ExplorerFilterPanel
      ref="filterPanel"
      :draft="explorer.draft.value"
      :catalog="explorer.catalog"
      :date-bounds="explorer.dateBounds"
      :open="explorer.filtersOpen.value"
      @update="explorer.updateDraft"
      @preset="explorer.selectDatePreset"
      @apply="applyFilters"
      @reset="resetFilters"
      @close="closeFilters"
    />

    <ExplorerQueryContext
      :state="explorer.committed.value"
      :metadata="explorer.activeMetadata.value"
      :scope-label="explorer.scopeLabel.value"
      :qr-context-label="explorer.qrContextLabel.value"
    />
    <NuxtLink
      v-if="explorer.committed.value.qrCodeIds.length"
      class="explorer-qr-back text-action"
      to="/qr"
      >Back to QR Library</NuxtLink
    >
    <ActiveFilterChips
      :chips="explorer.activeFilterChips.value"
      @remove="explorer.removeFilter($event.group, $event.value)"
      @reset="explorer.reset"
    />

    <p
      class="async-status"
      :role="
        explorer.analyticsState.status === 'error' || explorer.queryError.value ? 'alert' : 'status'
      "
      :aria-live="
        explorer.analyticsState.status === 'error' || explorer.queryError.value ? undefined : 'polite'
      "
    >
      <template v-if="explorer.analyticsState.status === 'generating'">
        {{
          {
            preparing: 'Preparing the analytical runtime',
            generating: 'Generating the deterministic dataset',
            optimizing: 'Optimizing analytical storage'
          }[explorer.analyticsState.progressStage || 'preparing']
        }}.
      </template>
      <template v-else>{{ explorer.statusMessage.value }}</template>
    </p>

    <StatePanel
      v-if="!explorer.results.value && explorer.pending.value"
      state="loading"
      title="Preparing the Explorer"
      description="The analytical gateway is preparing a complete summary, timeline and breakdown. Navigation remains responsive."
    />
    <StatePanel
      v-else-if="!explorer.results.value && explorer.queryError.value"
      state="error"
      title="Analytics could not start"
      :description="explorer.queryError.value"
    >
      <button class="button button--primary" type="button" @click="explorer.retry">
        Retry analytics
      </button>
    </StatePanel>
    <StatePanel
      v-else-if="explorer.noResults.value"
      state="no-results"
      title="No events match these filters"
      description="The query completed successfully. Remove an active filter or reset the Explorer to the Northstar default."
    >
      <button class="button button--primary" type="button" @click="explorer.reset">Reset filters</button>
    </StatePanel>

    <main
      v-else-if="explorer.results.value && explorer.timelineModel.value && explorer.breakdownModel.value"
      class="explorer-results"
      :class="{ 'explorer-results--pending': explorer.pending.value }"
      :aria-busy="explorer.pending.value"
    >
      <p v-if="explorer.pending.value" class="pending-result-note">
        Showing the previous complete result while the committed query updates.
      </p>
      <EventTimeline :model="explorer.timelineModel.value" @drilldown="explorer.drillIntoTimeline" />
      <ExplorerSummary
        :result="explorer.results.value.summary"
        :comparison="explorer.comparisonModel.value"
        :comparison-mode="explorer.committed.value.comparison"
        @comparison="explorer.selectComparison"
      />
      <section class="analytical-workspace" aria-labelledby="workspace-title">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">Analytical workspace</p>
            <h2 id="workspace-title">Inspect the shape behind the signal</h2>
          </div>
          <div class="workspace-switch" role="group" aria-label="Analytical workspace view">
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'breakdown'"
              @click="explorer.selectView('breakdown')"
            >
              Breakdown
            </button>
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'funnel'"
              @click="explorer.selectView('funnel')"
            >
              Funnel
            </button>
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'temporal'"
              @click="explorer.selectView('temporal')"
            >
              Temporal
            </button>
          </div>
        </header>
        <BreakdownPanel
          v-if="explorer.results.value.state.view === 'breakdown'"
          :model="explorer.breakdownModel.value"
          :breakdown="explorer.results.value.state.breakdown"
          :measure="explorer.results.value.state.breakdownMeasure"
          :selected-values="explorer.selectedBreakdownValues.value"
          @change="explorer.selectBreakdown"
          @filter="explorer.crossFilterBreakdown"
        />
        <FunnelPanel v-else-if="explorer.funnelModel.value" :model="explorer.funnelModel.value" />
        <TemporalHeatmapPanel
          v-else-if="explorer.temporalModel.value"
          :model="explorer.temporalModel.value"
          :measure="explorer.results.value.state.temporalMeasure"
          @measure="explorer.selectTemporalMeasure"
        />
      </section>
    </main>
  </div>
</template>
