<script setup lang="ts">
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
</script>

<template>
  <article class="report-structure-preview" aria-labelledby="report-preview-title">
    <p class="eyebrow">Configuration preview</p>
    <h2 id="report-preview-title">{{ title || 'Untitled report' }}</h2>
    <p>This outline describes the requested backend document. It is not a rendered PDF preview.</p>
    <h3>Scope</h3>
    <dl class="report-scope-list">
      <div v-for="item in buildReportScope(query, catalog)" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
    <h3>Sections</h3>
    <ol class="report-outline">
      <li v-for="section in sections" :key="section">{{ reportSectionLabel(section) }}</li>
    </ol>
    <p v-if="!sections.length" class="report-preview-empty">Select at least one section.</p>
  </article>
</template>
