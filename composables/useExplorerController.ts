import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEventAnalytics } from '~/composables/useEventAnalytics'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import {
  buildActiveFilterChips,
  buildBreakdownViewModel,
  buildComparisonViewModel,
  buildFunnelViewModel,
  buildTemporalHeatmapViewModel,
  buildTimelineViewModel,
  formatCount
} from '~/features/explorer/presentation'
import {
  ExplorerQueryCoordinator,
  StaleExplorerResultError,
  type ExplorerResultSet
} from '~/features/explorer/queryCoordinator'
import {
  addBreakdownFilter,
  applyDatePreset,
  cloneExplorerState,
  createDefaultExplorerState,
  drillIntoTimelinePeriod,
  normalizeExplorerState,
  parseExplorerRoute,
  removeExplorerFilter,
  routeQuerySignature,
  serializeExplorerState,
  utcDatePart,
  type BreakdownSelectionIntent,
  type ExplorerBreakdown,
  type ExplorerBreakdownMeasure,
  type ExplorerComparison,
  type ExplorerDatePreset,
  type ExplorerProfile,
  type ExplorerQueryState,
  type ExplorerRouteQuery,
  type ExplorerTemporalMeasure,
  type ExplorerView,
  type TimelinePeriodIntent
} from '~/features/explorer/queryState'
import { SupersededAnalyticsRequestError } from '~/services/analytics/AnalyticsGateway'

export function useExplorerController() {
  const { locale, t } = useI18n()
  const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
  const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
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
  const filtersOpen = ref(false)
  const coordinator = new ExplorerQueryCoordinator(analytics)
  let routeExecutionToken = 0

  const dateBounds = {
    minimum: utcDatePart(referencePeriod.start),
    maximum: utcDatePart(referencePeriod.end)
  }
  const activeFilterChips = computed(() =>
    buildActiveFilterChips(committed.value, analytics.catalog, translate)
  )
  const activeMetadata = computed(() =>
    analytics.state.metadata?.profile === committed.value.profile ? analytics.state.metadata : undefined
  )
  const timelineModel = computed(() =>
    results.value ? buildTimelineViewModel(results.value.timeline, presentationLocale.value) : undefined
  )
  const breakdownModel = computed(() =>
    results.value
      ? buildBreakdownViewModel(
          results.value.breakdown,
          analytics.catalog,
          results.value.state.breakdownMeasure,
          presentationLocale.value,
          translate
        )
      : undefined
  )
  const comparisonModel = computed(() =>
    results.value?.comparison
      ? buildComparisonViewModel(results.value.comparison, presentationLocale.value, translate)
      : undefined
  )
  const funnelModel = computed(() =>
    results.value?.funnel
      ? buildFunnelViewModel(results.value.funnel, presentationLocale.value, translate)
      : undefined
  )
  const temporalModel = computed(() =>
    results.value?.temporal
      ? buildTemporalHeatmapViewModel(
          results.value.temporal,
          results.value.state.temporalMeasure,
          presentationLocale.value,
          translate
        )
      : undefined
  )
  const selectedBreakdownValues = computed(() => {
    const state = results.value?.state ?? committed.value
    const groups = {
      campaign: state.campaignIds,
      channel: state.channelIds,
      location: state.locationIds,
      qr_code: state.qrCodeIds,
      device: state.devices
    }
    return [...groups[state.breakdown]]
  })
  const noResults = computed(() => results.value?.summary.metadata.matchedEventCount === 0)
  const pending = computed(() => queryPending.value || analytics.state.status === 'generating')
  const statusMessage = computed(() => {
    if (queryPending.value) {
      return results.value ? t('explorer.statusUpdating') : t('explorer.statusFirst')
    }
    if (queryError.value) return t('explorer.statusFailed')
    if (!results.value) return ''
    return t('explorer.statusReady', {
      count: formatCount(results.value.summary.metadata.matchedEventCount, presentationLocale.value)
    })
  })
  const scopeLabel = computed(() => {
    const campaigns = committed.value.campaignIds.map(
      (id) => analytics.catalog.campaigns.find((campaign) => campaign.id === id)?.name ?? id
    )
    if (!campaigns.length) return t('explorer.allCampaigns')
    if (campaigns.length === 1) return campaigns[0]!
    return t('explorer.campaignCount', { count: campaigns.length })
  })
  const qrContextLabel = computed(() => {
    const selected = committed.value.qrCodeIds.map(
      (id) => analytics.catalog.qrCodes.find((qr) => qr.id === id)?.name ?? id
    )
    if (!selected.length) return undefined
    return selected.length === 1
      ? selected[0]
      : t('explorer.scenarioQrCount', { count: selected.length })
  })

  async function executeCommitted(state: ExplorerQueryState, forceInitialization = false) {
    const token = ++routeExecutionToken
    queryPending.value = true
    queryError.value = undefined
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
    } catch (error) {
      if (
        token !== routeExecutionToken ||
        error instanceof SupersededAnalyticsRequestError ||
        error instanceof StaleExplorerResultError
      ) {
        return
      }
      queryError.value = error instanceof Error ? error.message : String(error)
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
    group: keyof Pick<
      ExplorerQueryState,
      'campaignIds' | 'channelIds' | 'locationIds' | 'qrCodeIds' | 'devices'
    >,
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

  function crossFilterBreakdown(intent: BreakdownSelectionIntent) {
    commitState(addBreakdownFilter(committed.value, intent, analytics.catalog, referencePeriod))
  }

  function drillIntoTimeline(intent: TimelinePeriodIntent) {
    commitState(drillIntoTimelinePeriod(committed.value, intent, analytics.catalog, referencePeriod))
  }

  function selectComparison(comparison: ExplorerComparison) {
    commitState({ ...cloneExplorerState(committed.value), comparison })
  }

  function selectView(view: ExplorerView) {
    commitState({ ...cloneExplorerState(committed.value), view })
  }

  function selectTemporalMeasure(temporalMeasure: ExplorerTemporalMeasure) {
    commitState({ ...cloneExplorerState(committed.value), temporalMeasure })
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
    comparisonModel,
    funnelModel,
    temporalModel,
    selectedBreakdownValues,
    activeFilterChips,
    activeMetadata,
    dateBounds,
    scopeLabel,
    qrContextLabel,
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
    crossFilterBreakdown,
    drillIntoTimeline,
    selectComparison,
    selectView,
    selectTemporalMeasure,
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
