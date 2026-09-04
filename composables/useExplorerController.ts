import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventAnalytics } from '~/composables/useEventAnalytics'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import {
  buildActiveFilterChips,
  buildBreakdownViewModel,
  buildTimelineViewModel,
  formatCount
} from '~/features/explorer/presentation'
import {
  ExplorerQueryCoordinator,
  StaleExplorerResultError,
  type ExplorerResultSet
} from '~/features/explorer/queryCoordinator'
import {
  applyDatePreset,
  cloneExplorerState,
  createDefaultExplorerState,
  normalizeExplorerState,
  parseExplorerRoute,
  removeExplorerFilter,
  routeQuerySignature,
  serializeExplorerState,
  utcDatePart,
  type ExplorerBreakdown,
  type ExplorerBreakdownMeasure,
  type ExplorerDatePreset,
  type ExplorerProfile,
  type ExplorerQueryState,
  type ExplorerRouteQuery
} from '~/features/explorer/queryState'
import { SupersededAnalyticsRequestError } from '~/services/analytics/AnalyticsGateway'

export function useExplorerController() {
  const route = useRoute()
  const router = useRouter()
  const analytics = useEventAnalytics()
  const referencePeriod = northstarScenarioV1.referencePeriod
  const defaultState = createDefaultExplorerState(analytics.catalog)
  const committed = ref<ExplorerQueryState>(defaultState)
  const draft = ref<ExplorerQueryState>(cloneExplorerState(defaultState))
  const results = shallowRef<ExplorerResultSet>()
  const queryPending = ref(false)
  const queryError = ref<string>()
  const statusMessage = ref('')
  const filtersOpen = ref(false)
  const coordinator = new ExplorerQueryCoordinator(analytics)
  let routeExecutionToken = 0

  const dateBounds = {
    minimum: utcDatePart(referencePeriod.start),
    maximum: utcDatePart(referencePeriod.end)
  }
  const activeFilterChips = computed(() => buildActiveFilterChips(committed.value, analytics.catalog))
  const activeMetadata = computed(() =>
    analytics.state.metadata?.profile === committed.value.profile ? analytics.state.metadata : undefined
  )
  const timelineModel = computed(() =>
    results.value ? buildTimelineViewModel(results.value.timeline) : undefined
  )
  const breakdownModel = computed(() =>
    results.value
      ? buildBreakdownViewModel(
          results.value.breakdown,
          analytics.catalog,
          results.value.state.breakdownMeasure
        )
      : undefined
  )
  const noResults = computed(() => results.value?.summary.metadata.matchedEventCount === 0)
  const pending = computed(() => queryPending.value || analytics.state.status === 'generating')
  const scopeLabel = computed(() => {
    const campaigns = committed.value.campaignIds.map(
      (id) => analytics.catalog.campaigns.find((campaign) => campaign.id === id)?.name ?? id
    )
    if (!campaigns.length) return 'All campaigns'
    if (campaigns.length === 1) return campaigns[0]!
    return `${campaigns.length} campaigns`
  })

  async function executeCommitted(state: ExplorerQueryState, forceInitialization = false) {
    const token = ++routeExecutionToken
    queryPending.value = true
    queryError.value = undefined
    statusMessage.value = results.value
      ? 'Updating the committed query; the previous complete result remains visible.'
      : 'Preparing the first analytical result.'
    try {
      if (
        forceInitialization ||
        analytics.state.status !== 'ready' ||
        analytics.state.metadata?.profile !== state.profile
      ) {
        await analytics.initialize(state.profile)
      }
      if (token !== routeExecutionToken) return
      const nextResults = await coordinator.execute(state)
      if (token !== routeExecutionToken) return
      results.value = nextResults
      statusMessage.value = `Query complete · ${formatCount(nextResults.summary.metadata.matchedEventCount)} matching events.`
    } catch (error) {
      if (
        token !== routeExecutionToken ||
        error instanceof SupersededAnalyticsRequestError ||
        error instanceof StaleExplorerResultError
      ) {
        return
      }
      queryError.value = error instanceof Error ? error.message : String(error)
      statusMessage.value = 'The analytical query failed; the committed route state is preserved.'
    } finally {
      if (token === routeExecutionToken) queryPending.value = false
    }
  }

  function syncFromRoute() {
    const parsed = parseExplorerRoute(
      route.query as ExplorerRouteQuery,
      analytics.catalog,
      referencePeriod
    )
    const canonical = serializeExplorerState(parsed)
    if (routeQuerySignature(route.query as ExplorerRouteQuery) !== routeQuerySignature(canonical)) {
      void router.replace({ query: canonical })
      return
    }
    committed.value = parsed
    draft.value = cloneExplorerState(parsed)
    void executeCommitted(parsed)
  }

  watch(() => route.fullPath, syncFromRoute, { immediate: true })

  function commitState(next: ExplorerQueryState) {
    const normalized = normalizeExplorerState(next, analytics.catalog, referencePeriod)
    const query = serializeExplorerState(normalized)
    filtersOpen.value = false
    if (routeQuerySignature(route.query as ExplorerRouteQuery) === routeQuerySignature(query)) {
      draft.value = cloneExplorerState(normalized)
      return
    }
    void router.push({ query })
  }

  function updateDraft(next: ExplorerQueryState) {
    draft.value = cloneExplorerState(next)
  }

  function applyDraft() {
    commitState(draft.value)
  }

  function reset() {
    commitState(defaultState)
  }

  function removeFilter(
    group: keyof Pick<ExplorerQueryState, 'campaignIds' | 'channelIds' | 'locationIds' | 'devices'>,
    value: string
  ) {
    commitState(removeExplorerFilter(committed.value, group, value))
  }

  function selectProfile(profile: ExplorerProfile) {
    commitState({ ...cloneExplorerState(committed.value), profile })
  }

  function selectBreakdown(selection: {
    breakdown: ExplorerBreakdown
    measure: ExplorerBreakdownMeasure
  }) {
    commitState({
      ...cloneExplorerState(committed.value),
      breakdown: selection.breakdown,
      breakdownMeasure: selection.measure
    })
  }

  function selectDatePreset(preset: ExplorerDatePreset) {
    draft.value = applyDatePreset(draft.value, preset, analytics.catalog, referencePeriod)
  }

  function retry() {
    void executeCommitted(committed.value, true)
  }

  onBeforeUnmount(() => {
    routeExecutionToken += 1
    coordinator.invalidate()
  })

  return {
    catalog: analytics.catalog,
    analyticsState: analytics.state,
    committed,
    draft,
    results,
    timelineModel,
    breakdownModel,
    activeFilterChips,
    activeMetadata,
    dateBounds,
    scopeLabel,
    noResults,
    pending,
    queryError,
    statusMessage,
    filtersOpen,
    updateDraft,
    applyDraft,
    reset,
    removeFilter,
    selectProfile,
    selectBreakdown,
    selectDatePreset,
    retry,
    openFilters: () => {
      filtersOpen.value = true
    },
    closeFilters: () => {
      filtersOpen.value = false
    }
  }
}
