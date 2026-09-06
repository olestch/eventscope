<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import type { ReferenceCatalog } from '~/domain/events/models'
import type { ReportSection } from '~/domain/reports/models'
import { buildReportScope, reportSectionLabel } from '~/features/reports/presentation'

defineProps<{
  title: string
  query: AnalyticsQuery
  sections: ReportSection[]
  catalog: ReferenceCatalog
}>()
const { locale, t } = useI18n()
const presentationLocale = computed(() => (locale.value === 'ru' ? 'ru' : 'en'))
const translate = (key: string, params?: Record<string, unknown>) => t(key, params ?? {})
</script>

<template>
  <article class="report-structure-preview" aria-labelledby="report-preview-title">
    <p class="eyebrow">{{ t('reports.preview.eyebrow') }}</p>
    <h2 id="report-preview-title">{{ title || t('reports.preview.untitled') }}</h2>
    <p>{{ t('reports.preview.description') }}</p>
    <h3>{{ t('reports.preview.scope') }}</h3>
    <dl class="report-scope-list">
      <div
        v-for="item in buildReportScope(query, catalog, presentationLocale, translate)"
        :key="item.label"
      >
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
    <h3>{{ t('reports.preview.sections') }}</h3>
    <ol class="report-outline">
      <li v-for="section in sections" :key="section">{{ reportSectionLabel(section, translate) }}</li>
    </ol>
    <p v-if="!sections.length" class="report-preview-empty">{{ t('reports.preview.select') }}</p>
  </article>
</template>
