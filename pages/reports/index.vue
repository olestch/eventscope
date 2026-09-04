<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
import StatusBadge from '~/components/ui/StatusBadge.vue'
import { reportCatalog as reports } from '~/data/catalog/reportCatalog'
useHead({ title: 'Reports' })
</script>
<template>
  <div class="page">
    <PageHeader
      eyebrow="Reports"
      title="Package decisions, not just dashboards."
      description="Curated narrative structures for the Northstar Launch review cycle."
      ><template #actions
        ><NuxtLink class="button button--primary" to="/reports/new"
          >New report <span aria-hidden="true">+</span></NuxtLink
        ></template
      ></PageHeader
    >
    <section class="report-library" aria-label="Report library">
      <NuxtLink
        v-for="report in reports"
        :key="report.id"
        class="report-card"
        :to="`/reports/${report.id}`"
        ><div class="report-card__index">{{ report.sections.length.toString().padStart(2, '0') }}</div>
        <div>
          <div class="report-card__meta">
            <StatusBadge
              :label="report.status"
              :tone="report.status === 'Ready' ? 'positive' : 'draft'"
            /><span>{{ report.period }}</span>
          </div>
          <h2>{{ report.name }}</h2>
          <p>Owner · {{ report.owner }}</p>
          <div class="report-card__sections">
            <span v-for="section in report.sections" :key="section.id">{{ section.title }}</span>
          </div>
        </div>
        <span class="report-card__arrow" aria-hidden="true">↗</span></NuxtLink
      >
    </section>
  </div>
</template>
