export interface ScenarioDefinition {
  scenarioVersion: string
  defaultSeed: string
  referencePeriod: { start: string; end: string }
  launchSpike: { campaignId: string; start: string; end: string; sessionShare: number }
  harborStrength: { locationId: string; trafficWeight: number; conversionMultiplier: number }
  mobileConversionIssue: {
    device: 'mobile'
    browser: 'Safari'
    startsAt: string
    conversionMultiplier: number
  }
  channelBehavior: Record<string, { trafficWeight: number; conversionProbability: number }>
  weekendMultiplier: number
  weekdayPeakHoursUtc: number[]
}

export const northstarScenarioV1: ScenarioDefinition = {
  scenarioVersion: 'northstar-behavior-v1',
  defaultSeed: 'eventscope-reference-2026',
  referencePeriod: {
    start: '2025-07-01T00:00:00.000Z',
    end: '2026-06-30T23:59:59.000Z'
  },
  launchSpike: {
    campaignId: 'cmp-northstar',
    start: '2026-03-13T08:00:00.000Z',
    end: '2026-03-15T22:00:00.000Z',
    sessionShare: 0.46
  },
  harborStrength: {
    locationId: 'loc-harbor',
    trafficWeight: 0.55,
    conversionMultiplier: 1.8
  },
  mobileConversionIssue: {
    device: 'mobile',
    browser: 'Safari',
    startsAt: '2026-03-10T00:00:00.000Z',
    conversionMultiplier: 0.28
  },
  channelBehavior: {
    'chn-physical': { trafficWeight: 0.2, conversionProbability: 0.16 },
    'chn-partner': { trafficWeight: 0.07, conversionProbability: 0.32 },
    'chn-social': { trafficWeight: 0.16, conversionProbability: 0.08 },
    'chn-email': { trafficWeight: 0.12, conversionProbability: 0.2 },
    'chn-paid': { trafficWeight: 0.31, conversionProbability: 0.035 },
    'chn-web': { trafficWeight: 0.14, conversionProbability: 0.12 }
  },
  weekendMultiplier: 0.58,
  weekdayPeakHoursUtc: [9, 10, 11, 16, 17, 18]
}
