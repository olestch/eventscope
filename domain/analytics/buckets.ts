import { bucketSizes, type BucketRequest, type BucketSize } from '~/domain/analytics/contracts'
import { AnalyticsError } from '~/domain/analytics/errors'
import type { TimeRange } from '~/domain/shared/primitives'

const fixedDurations: Partial<Record<BucketSize, number>> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000
}

export function assertValidRange(range: TimeRange): { startMs: number; endMs: number } {
  const startMs = Date.parse(range.start)
  const endMs = Date.parse(range.end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
    throw new AnalyticsError(
      'invalid_range',
      'Analytics ranges must contain valid UTC dates with start before end.'
    )
  }
  return { startMs, endMs }
}

export function floorBucket(timestampMs: number, size: BucketSize): number {
  const duration = fixedDurations[size]
  if (duration && size !== '1w') return Math.floor(timestampMs / duration) * duration

  const date = new Date(timestampMs)
  if (size === '1w') {
    const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    const daysSinceMonday = (date.getUTCDay() + 6) % 7
    return midnight - daysSinceMonday * 24 * 60 * 60_000
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

export function nextBucket(timestampMs: number, size: BucketSize): number {
  const duration = fixedDurations[size]
  if (duration) return timestampMs + duration
  const date = new Date(timestampMs)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
}

export function bucketCount(range: TimeRange, size: BucketSize): number {
  const { startMs, endMs } = assertValidRange(range)
  let cursor = floorBucket(startMs, size)
  let count = 0
  while (cursor < endMs) {
    count += 1
    cursor = nextBucket(cursor, size)
  }
  return count
}

export function selectAdaptiveBucket(range: TimeRange, maxPoints: number): BucketSize {
  if (!Number.isInteger(maxPoints) || maxPoints < 1) {
    throw new AnalyticsError('invalid_bucket', 'Adaptive bucket maxPoints must be a positive integer.')
  }
  for (const size of bucketSizes) {
    if (bucketCount(range, size) <= maxPoints) return size
  }
  return '1mo'
}

export function resolveBucket(range: TimeRange, request?: BucketRequest): BucketSize {
  assertValidRange(range)
  if (!request) return selectAdaptiveBucket(range, 48)
  if (request.kind === 'adaptive') return selectAdaptiveBucket(range, request.maxPoints)
  if (!bucketSizes.includes(request.size)) {
    throw new AnalyticsError('invalid_bucket', `Unsupported bucket size: ${String(request.size)}`)
  }
  return request.size
}
