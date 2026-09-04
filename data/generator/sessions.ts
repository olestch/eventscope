import type { Campaign } from '~/domain/campaigns/models'
import type { BrowserName, DeviceType, OperatingSystem, ReferenceCatalog } from '~/domain/events/models'
import type { Asset, Location, QRCodeDefinition } from '~/domain/tracking/models'
import type { RandomStream } from '~/data/generator/prng'
import type { ScenarioDefinition } from '~/data/scenarios/northstarV1'

export interface SessionBlueprint {
  sessionId: string
  visitorId: string
  startedAtMs: number
  campaign: Campaign
  channelId: string
  sourceId: string
  asset: Asset
  qrCode: QRCodeDefinition
  location?: Location
  device: DeviceType
  browser: BrowserName
  operatingSystem: OperatingSystem
  countryCode: string
  region: string
}

export interface SessionStreams {
  traffic: RandomStream
  sessions: RandomStream
  dimensions: RandomStream
}

const campaignWeights: Record<string, number> = {
  'cmp-aurora': 0.11,
  'cmp-waypoint': 0.11,
  'cmp-orbit': 0.12,
  'cmp-northstar': 0.44,
  'cmp-skyline': 0.1,
  'cmp-horizon': 0.12
}

function randomTimestampInRange(start: string, end: string, random: RandomStream): number {
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  return startMs + Math.floor(random.next() * (endMs - startMs))
}

function chooseCampaign(catalog: ReferenceCatalog, random: RandomStream): Campaign {
  return random.weightedPick(catalog.campaigns, (campaign) => campaignWeights[campaign.id] ?? 0.1)
}

function chooseTimestamp(
  campaign: Campaign,
  scenario: ScenarioDefinition,
  random: RandomStream
): number {
  if (
    campaign.id === scenario.launchSpike.campaignId &&
    random.chance(scenario.launchSpike.sessionShare)
  ) {
    return randomTimestampInRange(scenario.launchSpike.start, scenario.launchSpike.end, random)
  }

  let timestamp = randomTimestampInRange(campaign.period.start, campaign.period.end, random)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const day = new Date(timestamp).getUTCDay()
    if (day !== 0 && day !== 6) break
    if (random.chance(scenario.weekendMultiplier)) break
    timestamp = randomTimestampInRange(campaign.period.start, campaign.period.end, random)
  }

  const date = new Date(timestamp)
  const preferredHour = random.chance(0.7)
    ? random.pick(scenario.weekdayPeakHoursUtc)
    : random.integer(7, 22)
  date.setUTCHours(preferredHour, random.integer(0, 60), random.integer(0, 60), 0)
  return Math.min(date.getTime(), Date.parse(campaign.period.end) - 300)
}

function chooseDevice(random: RandomStream): {
  device: DeviceType
  browser: BrowserName
  operatingSystem: OperatingSystem
} {
  const device = random.weightedPick(
    ['mobile', 'desktop', 'tablet'] as const,
    (value) => ({ mobile: 0.54, desktop: 0.38, tablet: 0.08 })[value]
  )
  if (device === 'mobile') {
    const operatingSystem = random.chance(0.52) ? 'iOS' : 'Android'
    return {
      device,
      operatingSystem,
      browser: operatingSystem === 'iOS' && random.chance(0.72) ? 'Safari' : 'Chrome'
    }
  }
  if (device === 'tablet') {
    const operatingSystem = random.chance(0.6) ? 'iOS' : 'Android'
    return { device, operatingSystem, browser: operatingSystem === 'iOS' ? 'Safari' : 'Chrome' }
  }
  const operatingSystem = random.weightedPick(
    ['Windows', 'macOS', 'Linux'] as const,
    (value) => ({ Windows: 0.58, macOS: 0.34, Linux: 0.08 })[value]
  )
  const browser = random.weightedPick(
    ['Chrome', 'Edge', 'Firefox', 'Safari'] as const,
    (value) =>
      ({ Chrome: 0.56, Edge: 0.2, Firefox: 0.13, Safari: operatingSystem === 'macOS' ? 0.11 : 0 })[value]
  )
  return { device, operatingSystem, browser }
}

function selectPlacement(
  campaign: Campaign,
  catalog: ReferenceCatalog,
  scenario: ScenarioDefinition,
  random: RandomStream
) {
  const campaignAssets = catalog.assets.filter(({ campaignId }) => campaignId === campaign.id)
  const channelId = random.weightedPick(
    campaign.channelIds,
    (id) => scenario.channelBehavior[id]?.trafficWeight ?? 0.1
  )
  const channelAssets = campaignAssets.filter((asset) => asset.channelId === channelId)
  const asset =
    campaign.id === 'cmp-northstar' && channelId === 'chn-physical'
      ? random.weightedPick(channelAssets, (candidate) =>
          candidate.locationId === scenario.harborStrength.locationId
            ? scenario.harborStrength.trafficWeight
            : (1 - scenario.harborStrength.trafficWeight) / 2
        )
      : random.pick(channelAssets)
  const qrCode = catalog.qrCodes.find(({ assetId }) => assetId === asset.id)!
  const location = asset.locationId
    ? catalog.locations.find(({ id }) => id === asset.locationId)
    : undefined
  return { channelId, asset, qrCode, location }
}

export function generateSessionBlueprint(
  index: number,
  populationSize: number,
  catalog: ReferenceCatalog,
  scenario: ScenarioDefinition,
  streams: SessionStreams
): SessionBlueprint {
  const campaign = chooseCampaign(catalog, streams.traffic)
  const placement = selectPlacement(campaign, catalog, scenario, streams.traffic)
  const sourceId = placement.asset.sourceId
  const dimensions = chooseDevice(streams.dimensions)
  const country = placement.location
    ? catalog.countries.find(({ code }) => code === placement.location!.countryCode)!
    : streams.dimensions.weightedPick(
        catalog.countries,
        (value) => ({ US: 0.62, CA: 0.14, GB: 0.13, DE: 0.11 })[value.code] ?? 0.1
      )
  const region = placement.location?.region ?? streams.dimensions.pick(country.regions)
  const visitorBucket = streams.sessions.integer(1, Math.max(40, Math.floor(populationSize * 0.72)))

  return {
    sessionId: `ses-${String(index + 1).padStart(6, '0')}`,
    visitorId: `vis-${String(visitorBucket).padStart(6, '0')}`,
    startedAtMs: chooseTimestamp(campaign, scenario, streams.traffic),
    campaign,
    channelId: placement.channelId,
    sourceId,
    asset: placement.asset,
    qrCode: placement.qrCode,
    ...(placement.location ? { location: placement.location } : {}),
    ...dimensions,
    countryCode: country.code,
    region
  }
}

export function generateSessionBlueprints(
  count: number,
  catalog: ReferenceCatalog,
  scenario: ScenarioDefinition,
  streams: SessionStreams
): SessionBlueprint[] {
  return Array.from({ length: count }, (_, index) =>
    generateSessionBlueprint(index, count, catalog, scenario, streams)
  )
}
