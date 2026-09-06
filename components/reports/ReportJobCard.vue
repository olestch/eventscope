<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import type { ReportJob } from '~/domain/reports/models'
import { buildReportScope } from '~/features/reports/presentation'
import type { ReferenceCatalog } from '~/domain/events/models'

const props = defineProps<{ job: ReportJob; catalog: ReferenceCatalog; busy?: boolean }>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
defineEmits<{ retry: [id: string] }>()
const tone = computed(() => {
  if (props.job.status === 'ready') return 'positive'
  if (props.job.status === 'failed') return 'attention'
  return 'neutral'
})
const created = computed(() =>
  new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(props.job.createdAt))
)
</script>

<template>
  <article class="report-job-card" :aria-labelledby="`report-job-${job.id}`">
    <div class="report-job-card__header">
      <div>
        <StatusBadge :label="t(`reports.statusLabel.${job.status}`)" :tone="tone" />
        <h2 :id="`report-job-${job.id}`">{{ job.request.title }}</h2>
        <p>
          {{ created }} ·
          {{ buildReportScope(job.request.query, catalog, presentationLocale, translate)[0]?.value }}
        </p>
      </div>
      <span class="report-job-card__format">PDF</span>
    </div>
    <p class="report-job-card__status" :role="job.status === 'failed' ? 'alert' : 'status'">
      {{ t(`reports.status.${job.status}`) }}
      <span v-if="job.error">{{ t(`reports.errors.${job.error.code}`) }}</span>
    </p>
    <div class="report-job-card__actions">
      <a
        v-if="job.status === 'ready' && job.downloadUrl"
        class="button button--primary"
        :href="job.downloadUrl"
        download
        >{{ t('reports.job.download') }}</a
      >
      <button
        v-if="job.status === 'failed' && job.error?.retryable"
        class="button button--secondary"
        type="button"
        :disabled="busy"
        @click="$emit('retry', job.id)"
      >
        {{ t('reports.job.retry') }}
      </button>
      <NuxtLink class="button button--ghost" :to="`/reports/${job.id}`">{{
        t('reports.job.view')
      }}</NuxtLink>
    </div>
  </article>
</template>
