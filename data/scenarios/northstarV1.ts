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
  campaignBehavior: Record<
    string,
    {
      trafficWeight: number
      conversionMultiplier: number
      channelWeights: Record<string, number>
      deviceWeights: { mobile: number; desktop: number; tablet: number }
    }
  >
  weekendMultiplier: number
  weekdayPeakHoursUtc: number[]
}

export const northstarScenarioV1: ScenarioDefinition = {
  scenarioVersion: 'northstar-behavior-v2',
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
  campaignBehavior: {
    'cmp-aurora': {
      trafficWeight: 0.14,
      conversionMultiplier: 0.92,
      channelWeights: {
        'chn-physical': 0.3,
        'chn-partner': 0.06,
        'chn-social': 0.28,
        'chn-email': 0.1,
        'chn-paid': 0.12,
        'chn-web': 0.14
      },
      deviceWeights: { mobile: 0.66, desktop: 0.25, tablet: 0.09 }
    },
    'cmp-waypoint': {
      trafficWeight: 0.15,
      conversionMultiplier: 1.04,
      channelWeights: {
        'chn-physical': 0.23,
        'chn-partner': 0.08,
        'chn-social': 0.31,
        'chn-email': 0.2,
        'chn-paid': 0.06,
        'chn-web': 0.12
      },
      deviceWeights: { mobile: 0.59, desktop: 0.31, tablet: 0.1 }
    },
    'cmp-orbit': {
      trafficWeight: 0.15,
      conversionMultiplier: 1.28,
      channelWeights: {
        'chn-physical': 0.12,
        'chn-partner': 0.28,
        'chn-social': 0.08,
        'chn-email': 0.17,
        'chn-paid': 0.1,
        'chn-web': 0.25
      },
      deviceWeights: { mobile: 0.39, desktop: 0.52, tablet: 0.09 }
    },
    'cmp-northstar': {
      trafficWeight: 0.28,
      conversionMultiplier: 1,
      channelWeights: {
        'chn-physical': 0.2,
        'chn-partner': 0.05,
        'chn-social': 0.16,
        'chn-email': 0.12,
        'chn-paid': 0.34,
        'chn-web': 0.13
      },
      deviceWeights: { mobile: 0.54, desktop: 0.38, tablet: 0.08 }
    },
    'cmp-skyline': {
      trafficWeight: 0.13,
      conversionMultiplier: 0.78,
      channelWeights: {
        'chn-physical': 0.09,
        'chn-partner': 0.04,
        'chn-social': 0.12,
        'chn-email': 0.1,
        'chn-paid': 0.45,
        'chn-web': 0.2
      },
      deviceWeights: { mobile: 0.32, desktop: 0.6, tablet: 0.08 }
    },
    'cmp-horizon': {
      trafficWeight: 0.15,
      conversionMultiplier: 1.14,
      channelWeights: {
        'chn-physical': 0.08,
        'chn-partner': 0.12,
        'chn-social': 0.09,
        'chn-email': 0.31,
        'chn-paid': 0.08,
        'chn-web': 0.32
      },
      deviceWeights: { mobile: 0.43, desktop: 0.47, tablet: 0.1 }
    }
  },
  weekendMultiplier: 0.58,
  weekdayPeakHoursUtc: [9, 10, 11, 16, 17, 18]
}
