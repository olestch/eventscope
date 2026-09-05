<script setup lang="ts">
import { onMounted } from 'vue'
import ReportJobCard from '~/components/reports/ReportJobCard.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { useReports } from '~/composables/useReports'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'

useHead({ title: 'Reports' })
const reports = useReports()
const catalog = eventDatasetProvider.getCatalog()
onMounted(reports.load)
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="Reports"
      title="Turn a question into a report job."
      description="Configure backend-owned PDF work around the same typed analytics scope used by Explorer. Demo jobs live only in this browser session."
      ><template #actions
        ><NuxtLink class="button button--primary" to="/reports/new"
          >New report <span aria-hidden="true">+</span></NuxtLink
        ></template
      ></PageHeader
    >
    <section class="reports-intro panel" aria-labelledby="create-report-title">
      <div>
        <p class="eyebrow">Create report</p>
        <h2 id="create-report-title">Reuse an Explorer scope</h2>
        <p>
          Start here with the Northstar default, or use Create report in Explorer to carry its current
          campaign, QR, device and date filters.
        </p>
      </div>
      <NuxtLink class="button button--secondary" to="/reports/new">Configure report</NuxtLink>
    </section>
    <section class="report-history" aria-labelledby="report-history-title">
      <header class="report-history__heading">
        <div>
          <p class="eyebrow">This session</p>
          <h2 id="report-history-title">Recent report jobs</h2>
        </div>
        <p>History is intentionally not persisted or synced.</p>
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
        title="No report jobs in this session"
        description="Configure a report to demonstrate the asynchronous gateway workflow."
      />
    </section>
  </div>
</template>
