import { describe, expect, it } from 'vitest'
import { referenceCatalog } from '~/data/catalog/referenceCatalog'
import { generateDataset } from '~/data/generator/generateDataset'
import type { AnalyticsQuery } from '~/domain/analytics/contracts'
import { createAnalyticsEngine } from '~/domain/analytics/engine'
import { createRuntimeAnalyticsEngine } from '~/domain/analytics/runtimeEngine'
import { compileAnalyticsStorage } from '~/domain/analytics/storage'
import { scenarioQrAnalyticsLocation } from '~/features/qr/scenario'
import { parseExplorerRoute } from '~/features/explorer/queryState'
import { LocalStorageQrRepository } from '~/services/qr/LocalStorageQrRepository'
import { createAnalyticsFixture, fixtureRange } from '~/tests/analytics-fixture'

const fixture = createAnalyticsFixture()
const reference = createAnalyticsEngine(fixture)
const runtime = createRuntimeAnalyticsEngine(compileAnalyticsStorage(fixture))
const query = (overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery => ({
  range: fixtureRange,
  measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans'],
  ...overrides
})

describe('Scenario QR analytics integration', () => {
  it('keeps stable catalog identities referenced by valid deterministic scan events', () => {
    const dataset = generateDataset({ profile: 'development' })
    const ids = new Set(dataset.catalog.qrCodes.map(({ id }) => id))
    expect(dataset.catalog.qrCodes).toHaveLength(36)
    expect(dataset.catalog.qrCodes.map(({ id }) => id)).toContain('qr-harbor-entry')
    expect(dataset.events.filter(({ type }) => type === 'qr_scan')).not.toHaveLength(0)
    expect(
      dataset.events
        .filter(({ type }) => type === 'qr_scan')
        .every(({ qrCodeId }) => Boolean(qrCodeId && ids.has(qrCodeId)))
    ).toBe(true)
    expect(dataset.fingerprint).toBe('es2-0b946418')
  })

  it.each([
    { qrCodeIds: ['qr-harbor-entry'] },
    { qrCodeIds: ['qr-harbor-entry', 'qr-river-stage'] },
    { qrCodeIds: ['qr-harbor-entry'], campaignIds: ['cmp-northstar'] },
    { qrCodeIds: ['qr-harbor-entry'], devices: ['mobile'] as const },
    { qrCodeIds: ['qr-missing'] }
  ])('matches reference summary for QR filters $qrCodeIds', (filters) => {
    const request = query(filters as Partial<AnalyticsQuery>)
    expect(runtime.summary(request)).toEqual(reference.summary(request))
  })

  it('matches every analytical operation under a QR filter', () => {
    const filtered = query({ qrCodeIds: ['qr-harbor-entry'] })
    expect(runtime.breakdown({ ...filtered, breakdown: 'device' })).toEqual(
      reference.breakdown({ ...filtered, breakdown: 'device' })
    )
    expect(runtime.breakdown({ ...query(), breakdown: 'qr_code' })).toEqual(
      reference.breakdown({ ...query(), breakdown: 'qr_code' })
    )
    expect(runtime.timeSeries({ ...filtered, bucket: { kind: 'fixed', size: '1h' } })).toEqual(
      reference.timeSeries({ ...filtered, bucket: { kind: 'fixed', size: '1h' } })
    )
    expect(runtime.temporalHeatmap(filtered)).toEqual(reference.temporalHeatmap(filtered))
    expect(runtime.funnel(filtered, { steps: ['qr_scan', 'conversion'] })).toEqual(
      reference.funnel(filtered, { steps: ['qr_scan', 'conversion'] })
    )
    const compared = {
      ...filtered,
      comparison: {
        kind: 'custom' as const,
        range: { start: '2026-02-01T00:00:00Z', end: '2026-02-02T00:00:00Z' }
      }
    }
    expect(runtime.compareSummary(compared)).toEqual(reference.compareSummary(compared))
  })

  it('attributes generated funnel steps to sessions after the selected QR scan', () => {
    const dataset = generateDataset({ profile: 'test' })
    const engine = createAnalyticsEngine(dataset)
    const result = engine.funnel(
      {
        range: dataset.referencePeriod,
        measures: ['sessions'],
        qrCodeIds: ['qr-harbor-entry']
      },
      { steps: ['page_view', 'registration', 'conversion'] }
    )
    expect(result.steps[0]!.sessions).toBeGreaterThan(0)
    expect(result.steps[1]!.sessions).toBeGreaterThanOrEqual(result.steps[2]!.sessions)
  })

  it('builds a canonical bookmarkable Explorer location from stable QR identity', () => {
    const qr = referenceCatalog.qrCodes.find(({ id }) => id === 'qr-harbor-entry')!
    const location = scenarioQrAnalyticsLocation(qr, referenceCatalog)
    expect(location).toMatchObject({ path: '/explore', query: { qr: qr.id, campaign: qr.campaignId } })
    expect(
      parseExplorerRoute(location.query, referenceCatalog, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.999Z'
      }).qrCodeIds
    ).toEqual([qr.id])
  })

  it('never writes Scenario QR presentation or analytics navigation to localStorage', async () => {
    let writes = 0
    const repository = new LocalStorageQrRepository({
      storage: {
        getItem: () => null,
        setItem: () => {
          writes += 1
        }
      }
    })
    const qr = referenceCatalog.qrCodes[0]!
    scenarioQrAnalyticsLocation(qr, referenceCatalog)
    expect(await repository.list()).toEqual([])
    expect(writes).toBe(0)
  })
})
