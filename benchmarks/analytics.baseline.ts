import { describe, expect, it } from 'vitest'
import { eventDatasetProvider } from '~/data/provider/eventDatasetProvider'
import { createAnalyticsEngine } from '~/domain/analytics/engine'

describe('local Analytics Core baseline', () => {
  it('records representative 10K scan timings without CI thresholds', () => {
    const dataset = eventDatasetProvider.getDataset('development')
    const engine = createAnalyticsEngine(dataset)
    const query = {
      range: dataset.referencePeriod,
      measures: ['events', 'sessions', 'conversions', 'conversion_rate', 'qr_scans'] as const
    }
    const timings: Record<string, number> = {}
    const time = <T>(name: string, operation: () => T): T => {
      const startedAt = performance.now()
      const result = operation()
      timings[name] = Number((performance.now() - startedAt).toFixed(2))
      return result
    }

    const summary = time('summary', () => engine.summary({ ...query, measures: [...query.measures] }))
    const breakdown = time('breakdown', () =>
      engine.breakdown({ ...query, measures: [...query.measures], breakdown: 'channel' })
    )
    const timeSeries = time('timeSeries', () =>
      engine.timeSeries({
        ...query,
        measures: [...query.measures],
        bucket: { kind: 'adaptive', maxPoints: 48 }
      })
    )
    const funnel = time('funnel', () =>
      engine.funnel(
        { ...query, measures: ['sessions'] },
        { steps: ['page_view', 'registration', 'conversion'] }
      )
    )
    const comparison = time('comparison', () =>
      engine.compareSummary({
        ...query,
        measures: [...query.measures],
        comparison: { kind: 'previous_period' }
      })
    )

    console.info('Local 10K Analytics Core baseline (ms; diagnostic only):', timings)
    expect([summary.kind, breakdown.kind, timeSeries.kind, funnel.kind, comparison.kind]).toEqual([
      'summary',
      'breakdown',
      'time_series',
      'funnel',
      'comparison'
    ])
  })
})
