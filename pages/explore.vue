<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()
useHead(() => ({ title: t('head.explorer') }))
const explorer = useExplorerController()
const filterPanel = ref<InstanceType<typeof ExplorerFilterPanel>>()
const toolbar = ref<InstanceType<typeof ExplorerToolbar>>()

async function openFilters(inputMethod: 'pointer' | 'keyboard') {
  explorer.openFilters()
  if (inputMethod === 'keyboard') {
    await nextTick()
    filterPanel.value?.focusPanel()
  }
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
      :eyebrow="t('explorer.eyebrow')"
      :title="t('explorer.title')"
      :description="t('explorer.description')"
      ><template #actions>
        <NuxtLink
          class="button button--secondary"
          :to="reportLocationForExplorerState(explorer.committed.value)"
          >{{ t('explorer.createReport') }}</NuxtLink
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
      >{{ t('explorer.backQr') }}</NuxtLink
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
            preparing: t('explorer.progress.preparing'),
            generating: t('explorer.progress.generating'),
            optimizing: t('explorer.progress.optimizing')
          }[explorer.analyticsState.progressStage || 'preparing']
        }}.
      </template>
      <template v-else>{{ explorer.statusMessage.value }}</template>
    </p>

    <StatePanel
      v-if="!explorer.results.value && explorer.pending.value"
      state="loading"
      :title="t('explorer.states.preparingTitle')"
      :description="t('explorer.states.preparingDescription')"
    />
    <StatePanel
      v-else-if="!explorer.results.value && explorer.queryError.value"
      state="error"
      :title="t('explorer.states.errorTitle')"
      :description="explorer.queryError.value"
    >
      <button class="button button--primary" type="button" @click="explorer.retry">
        {{ t('explorer.retryAnalytics') }}
      </button>
    </StatePanel>
    <StatePanel
      v-else-if="explorer.noResults.value"
      state="no-results"
      :title="t('explorer.states.noResultsTitle')"
      :description="t('explorer.states.noResultsDescription')"
    >
      <button class="button button--primary" type="button" @click="explorer.reset">
        {{ t('explorer.states.resetFilters') }}
      </button>
    </StatePanel>

    <section
      v-else-if="explorer.results.value && explorer.timelineModel.value && explorer.breakdownModel.value"
      class="explorer-results"
      :class="{ 'explorer-results--pending': explorer.pending.value }"
      :aria-busy="explorer.pending.value"
    >
      <p v-if="explorer.pending.value" class="pending-result-note">
        {{ t('explorer.previousResult') }}
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
            <p class="eyebrow">{{ t('explorer.analyticalWorkspace') }}</p>
            <h2 id="workspace-title">{{ t('explorer.inspectShape') }}</h2>
          </div>
          <div class="workspace-switch" role="group" :aria-label="t('explorer.workspaceView')">
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'breakdown'"
              @click="explorer.selectView('breakdown')"
            >
              {{ t('explorer.breakdown') }}
            </button>
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'funnel'"
              @click="explorer.selectView('funnel')"
            >
              {{ t('explorer.funnel') }}
            </button>
            <button
              type="button"
              :aria-pressed="explorer.committed.value.view === 'temporal'"
              @click="explorer.selectView('temporal')"
            >
              {{ t('explorer.temporal') }}
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
    </section>
  </div>
</template>
