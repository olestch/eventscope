<script setup lang="ts">
import { ref } from 'vue'
import ExplorerDatePicker from '~/components/explore/ExplorerDatePicker.vue'
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

const panel = ref<HTMLElement>()
defineExpose({ focusPanel: () => panel.value?.focus() })

const updateDate = (key: 'startDate' | 'endDate', value: string) => {
  emit('update', {
    ...cloneExplorerState(props.draft),
    [key]: value
  })
}

const toggle = (
  group: 'campaignIds' | 'channelIds' | 'locationIds' | 'qrCodeIds' | 'devices',
  value: string
) => {
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
      ref="panel"
      class="filter-panel"
      tabindex="-1"
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
          <ExplorerDatePicker
            id="explorer-start-date"
            label="Start"
            :model-value="draft.startDate"
            :minimum="dateBounds.minimum"
            :maximum="dateBounds.maximum"
            @update:model-value="updateDate('startDate', $event)"
          />
          <ExplorerDatePicker
            id="explorer-end-date"
            label="End"
            :model-value="draft.endDate"
            :minimum="dateBounds.minimum"
            :maximum="dateBounds.maximum"
            @update:model-value="updateDate('endDate', $event)"
          />
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

        <fieldset class="qr-filter-options">
          <legend>Scenario QR</legend>
          <label v-for="qr in catalog.qrCodes" :key="qr.id" class="check-option">
            <input
              type="checkbox"
              :value="qr.id"
              :checked="draft.qrCodeIds.includes(qr.id)"
              @change="toggle('qrCodeIds', qr.id)"
            />
            <span>{{ qr.name }}</span>
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
