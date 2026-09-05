import {
  breakdownDimensions,
  bucketSizes,
  measures,
  type AnalyticsQuery
} from '~/domain/analytics/contracts'
import { normalizeAnalyticsQuery } from '~/domain/analytics/normalizeQuery'
import { eventTypes } from '~/domain/events/models'
import {
  REPORT_TITLE_MAX_LENGTH,
  reportFormats,
  reportSections,
  type CreateReportRequest
} from '~/domain/reports/models'

export class ReportRequestValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join(' '))
    this.name = 'ReportRequestValidationError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const valuesWithin = (value: unknown, allowed: readonly string[]) =>
  value === undefined || (validStringArray(value) && value.every((item) => allowed.includes(item)))

function validateAnalyticsQuery(value: unknown): value is AnalyticsQuery {
  if (!isRecord(value) || !isRecord(value.range) || !validStringArray(value.measures)) return false
  const { start, end } = value.range
  if (
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(start) >= Date.parse(end) ||
    !value.measures.length ||
    !value.measures.every((measure) => measures.includes(measure as (typeof measures)[number]))
  ) {
    return false
  }
  const stringFilters = [
    'campaignIds',
    'channelIds',
    'sourceIds',
    'locationIds',
    'assetIds',
    'qrCodeIds',
    'countryCodes',
    'regions'
  ]
  if (!stringFilters.every((key) => value[key] === undefined || validStringArray(value[key]))) {
    return false
  }
  if (
    !valuesWithin(value.eventTypes, eventTypes) ||
    !valuesWithin(value.devices, ['mobile', 'desktop', 'tablet']) ||
    !valuesWithin(value.browsers, ['Chrome', 'Safari', 'Firefox', 'Edge']) ||
    !valuesWithin(value.operatingSystems, ['iOS', 'Android', 'Windows', 'macOS', 'Linux']) ||
    (value.breakdown !== undefined &&
      (typeof value.breakdown !== 'string' || !breakdownDimensions.includes(value.breakdown as never)))
  ) {
    return false
  }
  if (value.bucket !== undefined) {
    if (!isRecord(value.bucket) || !['fixed', 'adaptive'].includes(String(value.bucket.kind))) {
      return false
    }
    if (
      (value.bucket.kind === 'fixed' && !bucketSizes.includes(value.bucket.size as never)) ||
      (value.bucket.kind === 'adaptive' &&
        (typeof value.bucket.maxPoints !== 'number' || value.bucket.maxPoints <= 0))
    ) {
      return false
    }
  }
  if (value.comparison !== undefined) {
    if (
      !isRecord(value.comparison) ||
      !['previous_period', 'custom'].includes(String(value.comparison.kind))
    ) {
      return false
    }
    if (value.comparison.kind === 'custom') {
      const range = value.comparison.range
      if (
        !isRecord(range) ||
        typeof range.start !== 'string' ||
        typeof range.end !== 'string' ||
        !Number.isFinite(Date.parse(range.start)) ||
        !Number.isFinite(Date.parse(range.end)) ||
        Date.parse(range.start) >= Date.parse(range.end)
      ) {
        return false
      }
    }
  }
  return true
}

export function validateCreateReportRequest(value: unknown): string[] {
  if (!isRecord(value)) return ['Report request must be an object.']
  const issues: string[] = []
  if (typeof value.title !== 'string' || !value.title.trim()) {
    issues.push('Report title is required.')
  } else if (value.title.trim().length > REPORT_TITLE_MAX_LENGTH) {
    issues.push(`Report title must be ${REPORT_TITLE_MAX_LENGTH} characters or fewer.`)
  }
  if (!reportFormats.includes(value.format as (typeof reportFormats)[number])) {
    issues.push('Only PDF reports are supported.')
  }
  if (!Array.isArray(value.sections) || !value.sections.length) {
    issues.push('Select at least one report section.')
  } else if (
    !value.sections.every((section) =>
      reportSections.includes(section as (typeof reportSections)[number])
    )
  ) {
    issues.push('The report contains an unsupported section.')
  }
  if (!validateAnalyticsQuery(value.query)) issues.push('The analytics scope is invalid.')
  return issues
}

export function normalizeCreateReportRequest(value: unknown): CreateReportRequest {
  const issues = validateCreateReportRequest(value)
  if (issues.length) throw new ReportRequestValidationError(issues)
  const request = value as CreateReportRequest
  return {
    title: request.title.trim(),
    format: 'pdf',
    query: normalizeAnalyticsQuery(request.query),
    sections: [...new Set(request.sections)]
  }
}
