<script setup lang="ts">
import type { FunnelViewModel } from '~/features/explorer/presentation'
import { useI18n } from 'vue-i18n'

defineProps<{ model: FunnelViewModel }>()
const { t } = useI18n()
</script>

<template>
  <section class="funnel-panel explorer-visualization" aria-labelledby="funnel-title">
    <header class="visualization-heading">
      <div>
        <p class="eyebrow">{{ t('explorer.funnelPanel.eyebrow') }}</p>
        <h2 id="funnel-title">{{ model.name }}</h2>
        <p>{{ model.description }}</p>
      </div>
      <span class="status-badge">{{ t('explorer.funnelPanel.ordered') }}</span>
    </header>

    <p v-if="model.empty" class="funnel-empty">
      {{ t('explorer.funnelPanel.empty') }}
    </p>
    <ol v-else class="funnel-steps" :aria-label="t('explorer.funnelPanel.visualization')">
      <li v-for="(step, index) in model.steps" :key="step.eventType">
        <div class="funnel-step__heading">
          <span>{{ index + 1 }} · {{ step.label }}</span>
          <strong>{{ step.formattedSessions }}</strong>
        </div>
        <div class="funnel-step__track" aria-hidden="true">
          <span :style="{ width: `${step.width}%` }" />
        </div>
        <small
          >{{ step.progressionFromPrevious }} · {{ step.percentageFromFirst }}
          {{ t('explorer.funnelPanel.ofEntrants') }}</small
        >
      </li>
    </ol>

    <div class="table-scroll">
      <table>
        <caption class="sr-only">
          {{
            t('explorer.funnelPanel.caption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('explorer.funnelPanel.step') }}</th>
            <th scope="col">{{ t('explorer.measures.sessions') }}</th>
            <th scope="col">{{ t('explorer.funnelPanel.fromPrevious') }}</th>
            <th scope="col">{{ t('explorer.funnelPanel.dropOff') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="step in model.steps" :key="step.eventType">
            <th scope="row">{{ step.label }}</th>
            <td>{{ step.formattedSessions }}</td>
            <td>{{ step.progressionFromPrevious }}</td>
            <td>{{ step.dropOffFromPrevious }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
