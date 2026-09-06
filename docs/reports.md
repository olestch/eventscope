# Reports workflow

EventScope models Reports as a typed asynchronous job workflow. It deliberately does not render
reports in Vue or generate user-specific PDFs in the browser.

## Contracts

`CreateReportRequest` contains a title, the single supported `pdf` format, selected report sections,
and the same normalized `AnalyticsQuery` used by Explorer. There is no second Reports filter model.
The supported sections are executive summary, timeline, breakdown, funnel, temporal heatmap and QR
performance; each corresponds to an existing analytics concept.

`ReportsGateway` is the UI-facing boundary:

```text
createReport(request) -> ReportJob
getReportStatus(id) -> ReportJob
listReports() -> ReportJob[]
retryReport(id) -> ReportJob
```

Jobs use explicit `queued`, `processing`, `ready` and `failed` states. Status updates are keyed by
job ID, and no percentage is shown because the contract has no real progress measure.

## Demo implementation

```text
Reports UI
-> ReportsGateway
-> DemoReportsGateway
-> session-only deterministic lifecycle
-> one generic static sample PDF
```

The adapter advances one state per status request. UI polling is short, bounded by terminal state
and independently keyed per job. Failure is represented by a controlled, visible demo fixture;
retry creates a new queued attempt and preserves the request. There is no random failure, fake HTTP
call or theatrical network delay.

Recent jobs intentionally live only in memory for the current page session. They are not stored in
QR localStorage, uploaded, synced or presented as cloud history. Reloading a QR-safe Reports URL
restores the report configuration scope, not transient jobs.

The ready job links to `public/demo/eventscope-sample-report.pdf`, a 2.4 KB, one-page generic PDF.
It proves the download contract while clearly stating that it does not contain the user's configured
analytics. No PDF library ships in the application and no runtime document generation occurs.

## Explorer relationship

Explorer's Create report action serializes only normalized analytical scope: profile, UTC dates,
campaigns, channels, locations, devices, Scenario QR IDs and breakdown. Reports parses this through
the existing Explorer query helpers and builds the report's `AnalyticsQuery` through
`buildExplorerQuery`. Hover state, expanded rows, pending results and active workspace view are not
carried.

Changing the title or selected sections does not execute analytics or initialize the 1M Worker. The
preview is a structural outline with human-readable catalog labels, not a second dashboard or a fake
PDF preview.

## Production boundary

The production equivalent remains backend-owned:

```text
Reports UI
-> ReportsGateway
-> HTTP API
-> asynchronous backend job
-> document/chart renderer
-> object storage
-> authenticated signed download URL
```

Backend ownership provides reproducible rendering, brand control, support for heavy chart and
document work, durable long-running jobs, protected storage, authenticated delivery and audit
history. EventScope does not implement that backend, an HTTP adapter, scheduling, email delivery or
client-side PDF generation.
