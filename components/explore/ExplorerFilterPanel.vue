<script setup lang="ts">
import { ref } from 'vue'
import type { DeviceType, ReferenceCatalog } from '~/domain/events/models'
import {
  cloneExplorerState,
  type ExplorerDatePreset,
  type ExplorerQueryState
} from '~/features/explorer/queryState'

const props = defineProps<{
  draft: ExplorerQueryState
  catalog: ReferenceCatalog
  dateBounds: { minimum: string; maximum: string }
  open: boolean
}>()
const emit = defineEmits<{
  update: [draft: ExplorerQueryState]
  apply: []
  reset: []
  close: []
  preset: [preset: ExplorerDatePreset]
}>()

const firstControl = ref<HTMLInputElement>()
defineExpose({ focusFirst: () => firstControl.value?.focus() })

const updateDate = (key: 'startDate' | 'endDate', event: Event) => {
  emit('update', {
    ...cloneExplorerState(props.draft),
    [key]: (event.target as HTMLInputElement).value
  })
}

const toggle = (group: 'campaignIds' | 'channelIds' | 'locationIds' | 'devices', value: string) => {
  const current = props.draft[group] as string[]
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  emit('update', {
    ...cloneExplorerState(props.draft),
    [group]: next.sort()
  } as ExplorerQueryState)
}

const deviceLabel = (device: DeviceType) => `${device.charAt(0).toUpperCase()}${device.slice(1)}`
</script>

<template>
  <div class="filter-surface" :class="{ 'filter-surface--open': open }">
    <button
      class="filter-surface__scrim"
      type="button"
      aria-label="Close filters"
      @click="emit('close')"
    />
    <aside
      class="filter-panel"
      role="region"
      aria-labelledby="filter-panel-title"
      @keydown.esc.stop="emit('close')"
    >
      <header class="filter-panel__header">
        <div>
          <p class="eyebrow">Draft query</p>
          <h2 id="filter-panel-title">Filters</h2>
        </div>
        <button
          class="filter-panel__close"
          type="button"
          aria-label="Close filters"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="filter-panel__content">
        <fieldset class="date-filter">
          <legend>Date range <small>inclusive, UTC</small></legend>
          <label>
            <span>Start</span>
            <input
              ref="firstControl"
              type="date"
              :value="draft.startDate"
              :min="dateBounds.minimum"
              :max="dateBounds.maximum"
              @input="updateDate('startDate', $event)"
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="date"
              :value="draft.endDate"
              :min="dateBounds.minimum"
              :max="dateBounds.maximum"
              @input="updateDate('endDate', $event)"
            />
          </label>
          <div class="date-presets" aria-label="Date presets">
            <button
              v-for="preset in ['7d', '30d', '90d', 'full'] as const"
              :key="preset"
              type="button"
              @click="emit('preset', preset)"
            >
              {{ preset === 'full' ? 'Full scope' : preset.replace('d', ' days') }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Campaign</legend>
          <label v-for="campaign in catalog.campaigns" :key="campaign.id" class="check-option">
            <input
              type="checkbox"
              :value="campaign.id"
              :checked="draft.campaignIds.includes(campaign.id)"
              @change="toggle('campaignIds', campaign.id)"
            />
            <span>{{ campaign.name }}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Channel</legend>
          <label v-for="channel in catalog.channels" :key="channel.id" class="check-option">
            <input
              type="checkbox"
              :value="channel.id"
              :checked="draft.channelIds.includes(channel.id)"
              @change="toggle('channelIds', channel.id)"
            />
            <span>{{ channel.name }}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Location</legend>
          <label v-for="location in catalog.locations" :key="location.id" class="check-option">
            <input
              type="checkbox"
              :value="location.id"
              :checked="draft.locationIds.includes(location.id)"
              @change="toggle('locationIds', location.id)"
            />
            <span>{{ location.name }}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Device</legend>
          <label v-for="device in catalog.devices" :key="device" class="check-option">
            <input
              type="checkbox"
              :value="device"
              :checked="draft.devices.includes(device)"
              @change="toggle('devices', device)"
            />
            <span>{{ deviceLabel(device) }}</span>
          </label>
        </fieldset>
      </div>

      <footer class="filter-panel__actions">
        <button class="button button--secondary" type="button" @click="emit('reset')">Reset</button>
        <button class="button button--primary" type="button" @click="emit('apply')">
          Apply filters
        </button>
      </footer>
    </aside>
  </div>
</template>
