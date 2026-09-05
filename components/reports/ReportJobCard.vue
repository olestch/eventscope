<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import type { ReportJob } from '~/domain/reports/models'
import { buildReportScope, reportStatusCopy } from '~/features/reports/presentation'
import type { ReferenceCatalog } from '~/domain/events/models'

const props = defineProps<{ job: ReportJob; catalog: ReferenceCatalog; busy?: boolean }>()
defineEmits<{ retry: [id: string] }>()
const tone = computed(() => {
  if (props.job.status === 'ready') return 'positive'
  if (props.job.status === 'failed') return 'attention'
  return 'neutral'
})
const created = computed(() =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(props.job.createdAt)
  )
)
</script>

<template>
  <article class="report-job-card" :aria-labelledby="`report-job-${job.id}`">
    <div class="report-job-card__header">
      <div>
        <StatusBadge :label="job.status" :tone="tone" />
        <h2 :id="`report-job-${job.id}`">{{ job.request.title }}</h2>
        <p>{{ created }} · {{ buildReportScope(job.request.query, catalog)[0]?.value }}</p>
      </div>
      <span class="report-job-card__format">PDF</span>
    </div>
    <p class="report-job-card__status" :role="job.status === 'failed' ? 'alert' : 'status'">
      {{ reportStatusCopy[job.status] }}
      <span v-if="job.error">{{ job.error.message }}</span>
    </p>
    <div class="report-job-card__actions">
      <a
        v-if="job.status === 'ready' && job.downloadUrl"
        class="button button--primary"
        :href="job.downloadUrl"
        download
        >Download PDF</a
      >
      <button
        v-if="job.status === 'failed' && job.error?.retryable"
        class="button button--secondary"
        type="button"
        :disabled="busy"
        @click="$emit('retry', job.id)"
      >
        Retry
      </button>
      <NuxtLink class="button button--ghost" :to="`/reports/${job.id}`">View job</NuxtLink>
    </div>
  </article>
</template>
