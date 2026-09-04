<script setup lang="ts">
import type { ReportDefinition } from '~/domain/reports/models'

defineProps<{ report: ReportDefinition }>()
</script>

<template>
  <article class="report-document">
    <header class="report-document__cover">
      <div>
        <p class="eyebrow">EventScope / Field intelligence</p>
        <h2>{{ report.name }}</h2>
        <p>{{ report.period }}</p>
      </div>
      <div class="report-monogram" aria-hidden="true">NS</div>
    </header>
    <section class="report-kpi-row" aria-label="Report highlights">
      <div><span>12,480</span><small>Event visits</small></div>
      <div><span>3,323</span><small>QR scans</small></div>
      <div><span>26.6%</span><small>Scan rate</small></div>
    </section>
    <section v-for="(section, index) in report.sections" :key="section.id" class="report-section">
      <span class="report-section__number">0{{ index + 1 }}</span>
      <div>
        <h3>{{ section.title }}</h3>
        <p>{{ section.summary }}</p>
      </div>
    </section>
    <footer class="report-document__footer">
      <span>Fictional demonstration data</span><span>Prepared by {{ report.owner }}</span>
    </footer>
  </article>
</template>
