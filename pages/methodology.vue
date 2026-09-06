<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '~/components/ui/PageHeader.vue'
const { rt, t, tm } = useI18n()
useHead(() => ({ title: t('head.methodology') }))
const principles = computed(() =>
  Array.from({ length: 8 }, (_, index) => {
    const id = index + 1
    return {
      number: String(id).padStart(2, '0'),
      title: t(`methodology.principles.p${id}Title`),
      text: t(`methodology.principles.p${id}Text`)
    }
  })
)
const evidenceItems = computed(() =>
  (tm('methodology.evidenceItems') as Array<Parameters<typeof rt>[0]>).map((message) => rt(message))
)
const productionItems = computed(() =>
  (tm('methodology.productionItems') as Array<Parameters<typeof rt>[0]>).map((message) => rt(message))
)
</script>
<template>
  <div class="page methodology-page">
    <PageHeader
      :eyebrow="t('methodology.eyebrow')"
      :title="t('methodology.title')"
      :description="t('methodology.description')"
    />
    <section class="methodology-hero">
      <p class="methodology-hero__quote">
        {{ t('methodology.quote') }}
      </p>
      <div>
        <span>{{ t('methodology.execution') }}</span
        ><strong>{{ t('methodology.executionValue') }}</strong>
      </div>
    </section>
    <section class="principle-list">
      <article v-for="principle in principles" :key="principle.number">
        <span>{{ principle.number }}</span>
        <div>
          <h2>{{ principle.title }}</h2>
          <p>{{ principle.text }}</p>
        </div>
      </article>
    </section>
    <section class="scope-table panel">
      <div>
        <p class="eyebrow">{{ t('methodology.delivery') }}</p>
        <h2>{{ t('methodology.demonstrates') }}</h2>
      </div>
      <div class="scope-columns">
        <div>
          <h3>{{ t('methodology.evidence') }}</h3>
          <ul>
            <li v-for="item in evidenceItems" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div>
          <h3>{{ t('methodology.production') }}</h3>
          <ul>
            <li v-for="item in productionItems" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
