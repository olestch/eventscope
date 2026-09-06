<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import ReportPreview from '~/components/reports/ReportPreview.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useReports } from '~/composables/useReports'
import { reportSectionOptions } from '~/data/catalog/reportCatalog'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'
import { REPORT_TITLE_MAX_LENGTH, type ReportSection } from '~/domain/reports/models'
import { validateCreateReportRequest } from '~/domain/reports/validation'
import { defaultReportTitle, translateReportIssues } from '~/features/reports/presentation'
import {
  buildReportAnalyticsQuery,
  parseReportRoute,
  serializeReportRouteState
} from '~/features/reports/routeState'
import { routeQuerySignature, serializeExplorerState } from '~/features/explorer/queryState'

const { t } = useI18n()
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
useHead(() => ({ title: t('head.reportNew') }))
const route = useRoute()
const router = useRouter()
const catalog = eventDatasetProvider.getCatalog()
const scopeState = computed(() =>
  parseReportRoute(route.query, catalog, northstarScenarioV1.referencePeriod)
)
const analyticsQuery = computed(() => buildReportAnalyticsQuery(scopeState.value))
const suggestedTitle = computed(() => defaultReportTitle(scopeState.value, catalog))
const title = ref(suggestedTitle.value)
const sections = ref<ReportSection[]>([
  'executive_summary',
  'timeline',
  'breakdown',
  'funnel',
  ...(scopeState.value.qrCodeIds.length ? (['qr_performance'] as ReportSection[]) : [])
])
const reports = useReports()
const formError = ref('')
const currentJobId = ref<string>()
const currentJob = computed(() => reports.jobs.value.find(({ id }) => id === currentJobId.value))
const explorerLocation = computed(() => ({
  path: '/explore',
  query: serializeExplorerState(scopeState.value)
}))

watch(suggestedTitle, (value) => (title.value = value))
watch(
  () => route.query,
  () => {
    const canonical = serializeReportRouteState(scopeState.value)
    if (routeQuerySignature(route.query) !== routeQuerySignature(canonical)) {
      void router.replace({ path: '/reports/new', query: canonical })
    }
  },
  { deep: true, immediate: true }
)

async function submit() {
  const request = {
    title: title.value,
    format: 'pdf' as const,
    query: analyticsQuery.value,
    sections: sections.value
  }
  const issues = validateCreateReportRequest(request)
  if (issues.length) {
    formError.value = translateReportIssues(issues, translate).join(' ')
    return
  }
  formError.value = ''
  const job = await reports.create(request)
  if (job) currentJobId.value = job.id
}
</script>
<template>
  <div class="page">
    <PageHeader
      :eyebrow="t('reports.builder.eyebrow')"
      :title="t('reports.builder.title')"
      :description="t('reports.builder.description')"
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/reports">{{
          t('reports.builder.history')
        }}</NuxtLink></template
      ></PageHeader
    >
    <div class="builder-grid">
      <form class="panel builder-panel" novalidate @submit.prevent="submit">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('reports.builder.setup') }}</p>
            <h2>{{ t('reports.builder.details') }}</h2>
          </div>
          <span class="step-count">01</span>
        </div>
        <label class="field-label"
          >{{ t('reports.builder.titleLabel')
          }}<input
            v-model="title"
            type="text"
            required
            :maxlength="REPORT_TITLE_MAX_LENGTH"
            aria-describedby="report-title-help"
        /></label>
        <small id="report-title-help">{{
          t('reports.builder.max', { count: REPORT_TITLE_MAX_LENGTH })
        }}</small>
        <label class="field-label"
          >{{ t('reports.builder.format')
          }}<select disabled>
            <option>PDF</option>
          </select></label
        >
        <div class="report-scope-summary">
          <strong>{{ t('reports.builder.scopeUrl') }}</strong>
          <span>{{ t('reports.builder.scopeDescription') }}</span>
          <NuxtLink class="text-action" :to="explorerLocation">{{
            t('reports.builder.editScope')
          }}</NuxtLink>
        </div>
        <div class="section-heading section-heading--divider">
          <div>
            <p class="eyebrow">{{ t('reports.builder.structure') }}</p>
            <h2>{{ t('reports.builder.included') }}</h2>
          </div>
          <span class="step-count">02</span>
        </div>
        <fieldset class="section-fieldset">
          <legend class="sr-only">{{ t('reports.builder.includedLegend') }}</legend>
          <div class="section-picker">
            <label v-for="section in reportSectionOptions" :key="section.id">
              <span
                ><strong>{{ t(`reports.sections.${section.id}`) }}</strong
                ><small>{{ t(`reports.sectionSummaries.${section.id}`) }}</small></span
              >
              <input v-model="sections" type="checkbox" :value="section.id" />
            </label>
          </div>
        </fieldset>
        <p v-if="formError || reports.error.value" class="form-error" role="alert">
          {{ formError || reports.error.value }}
        </p>
        <button class="button button--primary button--full" type="submit" :disabled="reports.busy.value">
          {{ reports.busy.value ? t('reports.builder.submitting') : t('reports.builder.generate') }}
        </button>
      </form>
      <aside class="panel builder-summary">
        <ReportPreview :title="title" :query="analyticsQuery" :sections="sections" :catalog="catalog" />
      </aside>
    </div>
    <section v-if="currentJob" class="current-report-job" aria-labelledby="current-job-title">
      <p class="eyebrow">{{ t('reports.builder.latest') }}</p>
      <h2 id="current-job-title">{{ t('reports.builder.status') }}</h2>
      <ReportJobCard :job="currentJob" :catalog="catalog" />
    </section>
  </div>
</template>
