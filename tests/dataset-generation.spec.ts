import { describe, expect, it } from 'vitest'
import { generateDataset } from '~/data/generator/generateDataset'
import { northstarScenarioV1 } from '~/data/scenarios/northstarV1'

const sessionRates = (events: ReturnType<typeof generateDataset>['events']) => {
  const sessions = new Map<string, { converted: boolean }>()
  for (const event of events) {
    const state = sessions.get(event.sessionId) ?? { converted: false }
    state.converted ||= event.type === 'conversion'
    sessions.set(event.sessionId, state)
  }
  return {
    sessions: sessions.size,
    conversions: [...sessions.values()].filter(({ converted }) => converted).length
  }
}

describe('deterministic dataset generation', () => {
  it('repeats the same records and fingerprint for the same inputs', () => {
    const first = generateDataset({ profile: 'test', seed: 'repeatable' })
    const second = generateDataset({ profile: 'test', seed: 'repeatable' })

    expect(second.fingerprint).toBe(first.fingerprint)
    expect(second.events).toEqual(first.events)
  })

  it('changes dataset identity when the seed changes', () => {
    const first = generateDataset({ profile: 'test', seed: 'seed-a' })
    const second = generateDataset({ profile: 'test', seed: 'seed-b' })

    expect(second.fingerprint).not.toBe(first.fingerprint)
    expect(second.id).not.toBe(first.id)
  })

  it('includes scenario version in dataset identity', () => {
    const baseline = generateDataset({ profile: 'test', seed: 'versioned' })
    const scenario = { ...northstarScenarioV1, scenarioVersion: 'northstar-behavior-v1-test' }
    const versioned = generateDataset({ profile: 'test', seed: 'versioned', scenario })

    expect(versioned.events).toEqual(baseline.events)
    expect(versioned.fingerprint).not.toBe(baseline.fingerprint)
  })

  it('produces exact, intentionally bounded profile sizes', () => {
    expect(generateDataset({ profile: 'test' }).eventCount).toBe(320)
    expect(generateDataset({ profile: 'development' }).eventCount).toBe(10_000)
  })
})

describe('Northstar scenario stories', () => {
  const dataset = generateDataset({ profile: 'development' })
  const sessionsBy = (predicate: (event: (typeof dataset.events)[number]) => boolean) =>
    new Set(dataset.events.filter(predicate).map(({ sessionId }) => sessionId)).size
  const rateBy = (predicate: (event: (typeof dataset.events)[number]) => boolean) => {
    const selectedSessions = new Set(dataset.events.filter(predicate).map(({ sessionId }) => sessionId))
    const events = dataset.events.filter(({ sessionId }) => selectedSessions.has(sessionId))
    const rates = sessionRates(events)
    return rates.conversions / rates.sessions
  }

  it('concentrates Northstar traffic around the launch window', () => {
    const northstar = dataset.events.filter(({ campaignId }) => campaignId === 'cmp-northstar')
    const launchSessions = new Set(
      northstar
        .filter(
          ({ timestamp }) =>
            timestamp >= northstarScenarioV1.launchSpike.start &&
            timestamp <= northstarScenarioV1.launchSpike.end
        )
        .map(({ sessionId }) => sessionId)
    ).size
    const totalSessions = new Set(northstar.map(({ sessionId }) => sessionId)).size

    expect(launchSessions / totalSessions).toBeGreaterThan(0.4)
  })

  it('makes Harbor Hall stronger than comparable Northstar locations', () => {
    const northstarAt = (locationId: string) => (event: (typeof dataset.events)[number]) =>
      event.campaignId === 'cmp-northstar' && event.locationId === locationId

    expect(sessionsBy(northstarAt('loc-harbor'))).toBeGreaterThan(sessionsBy(northstarAt('loc-river')))
    expect(rateBy(northstarAt('loc-harbor'))).toBeGreaterThan(rateBy(northstarAt('loc-river')) * 1.2)
  })

  it('weakens mobile Safari conversion after the fixed issue date', () => {
    const segment = (after: boolean) => (event: (typeof dataset.events)[number]) =>
      event.device === 'mobile' &&
      event.browser === 'Safari' &&
      (after
        ? event.timestamp >= northstarScenarioV1.mobileConversionIssue.startsAt
        : event.timestamp < northstarScenarioV1.mobileConversionIssue.startsAt)

    expect(sessionsBy(segment(true))).toBeGreaterThan(100)
    expect(rateBy(segment(true))).toBeLessThan(rateBy(segment(false)) * 0.65)
  })

  it('gives paid media high traffic but poor conversion', () => {
    const paid = (event: (typeof dataset.events)[number]) => event.channelId === 'chn-paid'
    const partner = (event: (typeof dataset.events)[number]) => event.channelId === 'chn-partner'

    expect(sessionsBy(paid)).toBeGreaterThan(sessionsBy(partner) * 2)
    expect(rateBy(paid)).toBeLessThan(rateBy(partner) * 0.4)
  })

  it('gives the low-volume partner channel higher-quality traffic', () => {
    const partner = (event: (typeof dataset.events)[number]) => event.channelId === 'chn-partner'
    const web = (event: (typeof dataset.events)[number]) => event.channelId === 'chn-web'

    expect(sessionsBy(partner)).toBeLessThan(sessionsBy(web))
    expect(rateBy(partner)).toBeGreaterThan(rateBy(web) * 1.5)
  })

  it('concentrates starts into configured UTC peak hours and away from weekends', () => {
    const firstEvents = [...new Map(dataset.events.map((event) => [event.sessionId, event])).values()]
    const peakShare =
      firstEvents.filter((event) =>
        northstarScenarioV1.weekdayPeakHoursUtc.includes(new Date(event.timestamp).getUTCHours())
      ).length / firstEvents.length
    const weekendShare =
      firstEvents.filter((event) => [0, 6].includes(new Date(event.timestamp).getUTCDay())).length /
      firstEvents.length

    expect(peakShare).toBeGreaterThan(0.6)
    expect(weekendShare).toBeLessThan(0.35)
  })
})
