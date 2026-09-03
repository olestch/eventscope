<script setup lang="ts">
import ReportPreview from '~/components/reports/ReportPreview.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StatePanel from '~/components/ui/StatePanel.vue'
import { getReport } from '~/data/demo'
const route = useRoute()
const report = getReport(String(route.params.id))
useHead({ title: report?.name || 'Report' })
</script>
<template>
  <div class="page">
    <template v-if="report"
      ><PageHeader
        eyebrow="Reports / Preview"
        :title="report.name"
        description="A structured on-screen preview. Document export is intentionally deferred."
        ><template #actions
          ><NuxtLink class="button button--ghost" to="/reports">Back to reports</NuxtLink
          ><button class="button button--secondary" type="button" disabled>
            Export later
          </button></template
        ></PageHeader
      >
      <div class="preview-workspace"><ReportPreview :report="report" /></div></template
    ><StatePanel
      v-else
      state="error"
      title="Report not found"
      description="This identifier is not part of the fictional Northstar report library."
      ><NuxtLink class="button button--primary" to="/reports">Return to reports</NuxtLink></StatePanel
    >
  </div>
</template>
