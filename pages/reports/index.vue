<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useReports } from '~/composables/useReports'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'

const { t } = useI18n()
useHead(() => ({ title: t('head.reports') }))
const reports = useReports()
const catalog = eventDatasetProvider.getCatalog()
onMounted(reports.load)
</script>
<template>
  <div class="page">
    <PageHeader
      :eyebrow="t('reports.page.eyebrow')"
      :title="t('reports.page.title')"
      :description="t('reports.page.description')"
      ><template #actions
        ><NuxtLink class="button button--primary" to="/reports/new"
          >{{ t('reports.page.new') }} <span aria-hidden="true">+</span></NuxtLink
        ></template
      ></PageHeader
    >
    <section class="reports-intro panel" aria-labelledby="create-report-title">
      <div>
        <p class="eyebrow">{{ t('reports.page.create') }}</p>
        <h2 id="create-report-title">{{ t('reports.page.reuse') }}</h2>
        <p>{{ t('reports.page.reuseDescription') }}</p>
      </div>
      <NuxtLink class="button button--secondary" to="/reports/new">{{
        t('reports.page.configure')
      }}</NuxtLink>
    </section>
    <section class="report-history" aria-labelledby="report-history-title">
      <header class="report-history__heading">
        <div>
          <p class="eyebrow">{{ t('reports.page.session') }}</p>
          <h2 id="report-history-title">{{ t('reports.page.recent') }}</h2>
        </div>
        <p>{{ t('reports.page.historyNote') }}</p>
      </header>
      <p v-if="reports.error.value" class="form-error" role="alert">{{ reports.error.value }}</p>
      <div v-if="reports.jobs.value.length" class="report-library">
        <ReportJobCard
          v-for="job in reports.jobs.value"
          :key="job.id"
          :job="job"
          :catalog="catalog"
          :busy="reports.busy.value"
          @retry="reports.retry"
        />
      </div>
      <StatePanel
        v-else
        state="empty"
        :title="t('reports.page.empty')"
        :description="t('reports.page.emptyDescription')"
      />
    </section>
  </div>
</template>
