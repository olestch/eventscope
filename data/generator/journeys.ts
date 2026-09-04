import type { EventRecord, EventType } from '~/domain/events/models'
import type { RandomStream } from '~/data/generator/prng'
import type { SessionBlueprint } from '~/data/generator/sessions'
import type { ScenarioDefinition } from '~/data/scenarios/northstarV1'

function conversionProbability(session: SessionBlueprint, scenario: ScenarioDefinition): number {
  let probability = scenario.channelBehavior[session.channelId]?.conversionProbability ?? 0.1
  if (session.location?.id === scenario.harborStrength.locationId) {
    probability *= scenario.harborStrength.conversionMultiplier
  }
  if (
    session.device === scenario.mobileConversionIssue.device &&
    session.browser === scenario.mobileConversionIssue.browser &&
    session.startedAtMs >= Date.parse(scenario.mobileConversionIssue.startsAt)
  ) {
    probability *= scenario.mobileConversionIssue.conversionMultiplier
  }
  return Math.min(probability, 0.82)
}

function journeyTypes(session: SessionBlueprint, random: RandomStream, scenario: ScenarioDefinition) {
  const types: EventType[] = []
  if (session.channelId === 'chn-physical' && random.chance(0.9)) types.push('qr_scan')
  types.push('page_view')
  if (random.chance(0.23)) types.push(random.chance(0.58) ? 'download' : 'share')
  if (random.chance(0.16)) types.push('registration')
  if (session.channelId === 'chn-physical' && random.chance(0.13)) types.push('check_in')
  if (random.chance(conversionProbability(session, scenario))) types.push('conversion')
  return types
}

export function generateEventRecords(
  sessions: SessionBlueprint[],
  targetEventCount: number,
  scenario: ScenarioDefinition,
  random: RandomStream
): EventRecord[] {
  const records: EventRecord[] = []
  for (const session of sessions) {
    appendSessionEventRecords(records, session, targetEventCount, scenario, random)
    if (records.length === targetEventCount) break
  }
  return records
}

export function appendSessionEventRecords(
  records: EventRecord[],
  session: SessionBlueprint,
  targetEventCount: number,
  scenario: ScenarioDefinition,
  random: RandomStream
): void {
  const types = journeyTypes(session, random, scenario)
  for (let step = 0; step < types.length && records.length < targetEventCount; step += 1) {
    const type = types[step]!
    const timestampMs = Math.min(
      session.startedAtMs + step * 45_000 + random.integer(0, 20_000),
      Date.parse(session.campaign.period.end)
    )
    records.push({
      id: `evt-${String(records.length + 1).padStart(7, '0')}`,
      timestamp: new Date(timestampMs).toISOString(),
      type,
      campaignId: session.campaign.id,
      channelId: session.channelId,
      sourceId: session.sourceId,
      assetId: session.asset.id,
      ...(session.location ? { locationId: session.location.id } : {}),
      ...(type === 'qr_scan' ? { qrCodeId: session.qrCode.id } : {}),
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      device: session.device,
      browser: session.browser,
      operatingSystem: session.operatingSystem,
      countryCode: session.countryCode,
      region: session.region
    })
  }
}
