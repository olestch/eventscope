<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useReports } from '~/composables/useReports'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'

const route = useRoute()
const { t } = useI18n()
const router = useRouter()
const reports = useReports()
const catalog = eventDatasetProvider.getCatalog()
const job = computed(() => reports.jobs.value.find(({ id }) => id === String(route.params.id)))
useHead(() => ({ title: t('head.reportJob') }))

onMounted(() => reports.get(String(route.params.id)))

async function retry(id: string) {
  const retried = await reports.retry(id)
  if (retried) await router.replace(`/reports/${retried.id}`)
}
</script>
<template>
  <div class="page">
    <PageHeader
      :eyebrow="t('reports.job.eyebrow')"
      :title="job?.request.title || t('reports.job.title')"
      :description="t('reports.job.description')"
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/reports">{{
          t('reports.job.back')
        }}</NuxtLink></template
      ></PageHeader
    >
    <ReportJobCard v-if="job" :job="job" :catalog="catalog" :busy="reports.busy.value" @retry="retry" />
    <StatePanel
      v-else-if="reports.error.value"
      state="error"
      :title="t('reports.job.notFound')"
      :description="reports.error.value"
      ><NuxtLink class="button button--primary" to="/reports">{{
        t('reports.job.return')
      }}</NuxtLink></StatePanel
    >
    <StatePanel
      v-else
      state="loading"
      :title="t('reports.job.loading')"
      :description="t('reports.job.loadingDescription')"
    />
  </div>
</template>
