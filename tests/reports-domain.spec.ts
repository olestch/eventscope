import { describe, expect, it } from 'vitest'
import type { CreateReportRequest } from '~/domain/reports/models'
import {
  normalizeCreateReportRequest,
  ReportRequestValidationError,
  validateCreateReportRequest
} from '~/domain/reports/validation'

const validRequest = (): CreateReportRequest => ({
  title: ' Northstar performance report ',
  format: 'pdf',
  query: {
    range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
    campaignIds: ['cmp-northstar'],
    measures: ['sessions', 'conversions']
  },
  sections: ['executive_summary', 'timeline', 'timeline']
})

describe('report request validation', () => {
  it('normalizes a valid request without changing its analytics meaning', () => {
    expect(normalizeCreateReportRequest(validRequest())).toEqual({
      title: 'Northstar performance report',
      format: 'pdf',
      query: {
        range: { start: '2026-03-04T00:00:00.000Z', end: '2026-03-19T00:00:00.000Z' },
        campaignIds: ['cmp-northstar'],
        measures: ['conversions', 'sessions']
      },
      sections: ['executive_summary', 'timeline']
    })
  })

  it.each([
    [{ ...validRequest(), title: ' ' }, 'Report title is required.'],
    [{ ...validRequest(), title: 'x'.repeat(101) }, '100 characters or fewer'],
    [{ ...validRequest(), sections: [] }, 'Select at least one'],
    [{ ...validRequest(), format: 'pptx' }, 'Only PDF'],
    [
      {
        ...validRequest(),
        query: {
          ...validRequest().query,
          range: { start: 'not-a-date', end: '2026-03-19T00:00:00.000Z' }
        }
      },
      'analytics scope is invalid'
    ],
    [{ ...validRequest(), sections: ['made_up'] }, 'unsupported section']
  ])('rejects malformed report input %#', (request, message) => {
    expect(validateCreateReportRequest(request)).toEqual(
      expect.arrayContaining([expect.stringContaining(message)])
    )
    expect(() => normalizeCreateReportRequest(request)).toThrow(ReportRequestValidationError)
  })
})
