<script setup lang="ts">
import type { FunnelViewModel } from '~/features/explorer/presentation'

defineProps<{ model: FunnelViewModel }>()
</script>

<template>
  <section class="funnel-panel explorer-visualization" aria-labelledby="funnel-title">
    <header class="visualization-heading">
      <div>
        <p class="eyebrow">Session funnel</p>
        <h2 id="funnel-title">{{ model.name }}</h2>
        <p>{{ model.description }}</p>
      </div>
      <span class="status-badge">Ordered within each session</span>
    </header>

    <p v-if="model.empty" class="funnel-empty">
      No sessions entered this funnel in the committed analytical scope.
    </p>
    <ol v-else class="funnel-steps" aria-label="Funnel progression visualization">
      <li v-for="(step, index) in model.steps" :key="step.eventType">
        <div class="funnel-step__heading">
          <span>{{ index + 1 }} · {{ step.label }}</span>
          <strong>{{ step.formattedSessions }}</strong>
        </div>
        <div class="funnel-step__track" aria-hidden="true">
          <span :style="{ width: `${step.width}%` }" />
        </div>
        <small>{{ step.progressionFromPrevious }} · {{ step.percentageFromFirst }} of entrants</small>
      </li>
    </ol>

    <div class="table-scroll">
      <table>
        <caption class="sr-only">
          Exact session funnel values
        </caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Sessions</th>
            <th scope="col">From previous</th>
            <th scope="col">Drop-off</th>
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
