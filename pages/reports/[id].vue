<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useReports } from '~/composables/useReports'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'

const route = useRoute()
const router = useRouter()
const reports = useReports()
const catalog = eventDatasetProvider.getCatalog()
const job = computed(() => reports.jobs.value.find(({ id }) => id === String(route.params.id)))
useHead({ title: 'Report job' })

onMounted(() => reports.get(String(route.params.id)))

async function retry(id: string) {
  const retried = await reports.retry(id)
  if (retried) await router.replace(`/reports/${retried.id}`)
}
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="Reports / Job"
      :title="job?.request.title || 'Report job'"
      description="Status is resolved through the same ReportsGateway boundary used by the builder."
      ><template #actions
        ><NuxtLink class="button button--ghost" to="/reports">Back to reports</NuxtLink></template
      ></PageHeader
    >
    <ReportJobCard v-if="job" :job="job" :catalog="catalog" :busy="reports.busy.value" @retry="retry" />
    <StatePanel
      v-else-if="reports.error.value"
      state="error"
      title="Report job not found"
      :description="reports.error.value"
      ><NuxtLink class="button button--primary" to="/reports">Return to reports</NuxtLink></StatePanel
    >
    <StatePanel
      v-else
      state="loading"
      title="Loading report job"
      description="Checking this browser session for the requested report."
    />
  </div>
</template>
